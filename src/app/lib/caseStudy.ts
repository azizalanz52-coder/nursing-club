import { Firestore, collection, doc, getDoc, getDocs, increment, limit, query, runTransaction, updateDoc, where } from 'firebase/firestore';
import { ADMIN_PHONE } from './authIdentity';
import { canonicalPhone } from './certificatesLookup';

export type ScoreAdjustment = {
  delta: number;
  byPhone: string;
  byName: string;
  at: number;
};

export function riyadhParts(ms = Date.now()) {
  const bag: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    ymd: `${bag.year}-${bag.month}-${bag.day}`,
    weekday: bag.weekday || '',
    hour: Number(bag.hour || 0),
    minute: Number(bag.minute || 0),
    second: Number(bag.second || 0),
  };
}

export const CASE_STUDY_SOLVE_MS = 90 * 1000;
/** مهلة قصيرة بعد 0:00 للضغط على إرسال ما تم اختياره — بعدها يُقفل اليوم */
export const CASE_STUDY_SUBMIT_GRACE_MS = 2 * 60 * 1000;
/** أقل وقت معقول لاحتساب «الأسرع حلاً» — يمنع إرسال فوري/ثغرة التايمر */
export const CASE_STUDY_MIN_RACE_SOLVE_MS = 3000;
export const CASE_STUDY_ATTEMPTS_COL = 'case_study_attempts';
export const CASE_STUDY_SUBMISSIONS_COL = 'case_study_submissions';

export function caseSolveTimerKey(ymd = riyadhParts().ymd) {
  return `nurs_case_solve_v4_${ymd}`;
}

export function caseSolveAttemptId(phone: string, ymd = riyadhParts().ymd) {
  const key = canonicalPhone(phone) || String(phone || '').trim();
  return `${key}_${ymd}`;
}

export function isCaseStudyStaffPhone(phone?: string | null) {
  return canonicalPhone(phone || '') === canonicalPhone(ADMIN_PHONE);
}

/** تعديلات إدارية على وقت الحل (مللي ثانية) — تُطبَّق على السجل وسباق الأسرع */
const SOLVE_MS_ADMIN_FIX: Record<string, number> = {
  // طارق خالد — 4 نوفمبر: أُلغي وقت 1ms، النقاط تبقى، والوقت يُحتسب 10 ثوانٍ
  '8Id8RfKkYXiXsT3dUSu9': 10_000,
};

export function solveDurationMs(sub: Record<string, any> | null | undefined) {
  const fixed = sub?.id ? SOLVE_MS_ADMIN_FIX[String(sub.id)] : undefined;
  const used = typeof fixed === 'number' ? fixed : Number(sub?.solveMs);
  if (!Number.isFinite(used) || used <= 0) return null;
  return Math.min(CASE_STUDY_SOLVE_MS, Math.max(1, Math.round(used)));
}

/** وقت الحل المعتمد لسباق الأسرع — يستبعد الأوقات المستحيلة وطاقم الموقع */
export function solveDurationMsForRace(sub: Record<string, any> | null | undefined) {
  if (isCaseStudyStaffPhone(personPhone(sub))) return null;
  const used = solveDurationMs(sub);
  if (used == null || used < CASE_STUDY_MIN_RACE_SOLVE_MS) return null;
  return used;
}

export type CaseSolveAttempt = {
  id: string;
  phone: string;
  day: string;
  startedAt: number;
  submittedAt?: number | null;
  submissionId?: string | null;
  score?: number | null;
};

export type CaseStudySubmitPayload = {
  studentName: string;
  phone: string;
  score: number;
  solveScore: number;
  solveMs: number;
  total: number;
  bonusQuestionId: number | null;
  bonusAmount: number;
  persistenceBonus: number;
  persistenceWeek: string | null;
  answers: Record<number, number>;
};

function readAttemptData(id: string, phone: string, day: string, data: Record<string, any> | undefined): CaseSolveAttempt {
  const startedAt = Number(data?.startedAt);
  const submittedAt = Number(data?.submittedAt);
  return {
    id,
    phone,
    day,
    startedAt: Number.isFinite(startedAt) && startedAt > 1_000_000_000_000 ? startedAt : 0,
    submittedAt: Number.isFinite(submittedAt) && submittedAt > 1_000_000_000_000 ? submittedAt : null,
    submissionId: data?.submissionId ? String(data.submissionId) : null,
    score: typeof data?.score === 'number' ? data.score : null,
  };
}

export async function readCaseSolveAttempt(db: Firestore, phone: string, now = Date.now()): Promise<CaseSolveAttempt | null> {
  const key = canonicalPhone(phone) || String(phone || '').trim();
  if (!key) return null;
  const day = riyadhParts(now).ymd;
  const id = caseSolveAttemptId(key, day);
  const snap = await getDoc(doc(db, CASE_STUDY_ATTEMPTS_COL, id));
  if (!snap.exists()) return null;
  return readAttemptData(id, key, day, snap.data() as Record<string, any>);
}

function isQuotaError(err: unknown) {
  const code = String((err as { code?: string })?.code || '');
  const message = String((err as { message?: string })?.message || '');
  return code.includes('resource-exhausted') || /quota|resource.?exhausted/i.test(message);
}

export async function ensureCaseSolveAttempt(db: Firestore, phone: string, now = Date.now()): Promise<CaseSolveAttempt> {
  const key = canonicalPhone(phone) || String(phone || '').trim();
  if (!key) throw new Error('رقم الجوال مطلوب لبدء وقت الحل.');
  const day = riyadhParts(now).ymd;
  const id = caseSolveAttemptId(key, day);
  const ref = doc(db, CASE_STUDY_ATTEMPTS_COL, id);

  // قراءة أولاً لتفادي كتابة بلا حاجة (مهم عند امتلاء حصة Firebase)
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return readAttemptData(id, key, day, existing.data() as Record<string, any>);
  }

  try {
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) {
        return readAttemptData(id, key, day, snap.data() as Record<string, any>);
      }
      tx.set(ref, {
        phone: key,
        day,
        startedAt: now,
        createdAt: new Date(now).toISOString(),
        submittedAt: null,
        submissionId: null,
      });
      return { id, phone: key, day, startedAt: now, submittedAt: null, submissionId: null, score: null };
    });
  } catch (err) {
    const again = await getDoc(ref).catch(() => null);
    if (again?.exists()) {
      return readAttemptData(id, key, day, again.data() as Record<string, any>);
    }
    if (isQuotaError(err)) {
      throw new Error('السيرفر ممتلئ مؤقتاً (حصة Firebase). حاول بعد دقيقة أو حدّث الصفحة.');
    }
    throw err;
  }
}

export function caseAttemptDeadline(startedAt: number) {
  return startedAt + CASE_STUDY_SOLVE_MS;
}

export function caseAttemptSubmitDeadline(startedAt: number) {
  return startedAt + CASE_STUDY_SOLVE_MS + CASE_STUDY_SUBMIT_GRACE_MS;
}

export function isCaseAttemptExpired(startedAt: number, now = Date.now()) {
  return Number.isFinite(startedAt) && startedAt > 0 && now >= caseAttemptDeadline(startedAt);
}

/** تسجيل حل اليوم مرة واحدة فقط، مربوط بمحاولة الوقت على السيرفر */
export async function submitCaseStudyLocked(
  db: Firestore,
  payload: CaseStudySubmitPayload,
  now = Date.now()
) {
  const key = canonicalPhone(payload.phone) || String(payload.phone || '').trim();
  if (!key) throw new Error('رقم الجوال مطلوب.');
  const day = riyadhParts(now).ymd;
  const attemptId = caseSolveAttemptId(key, day);
  const attemptRef = doc(db, CASE_STUDY_ATTEMPTS_COL, attemptId);
  const submissionRef = doc(db, CASE_STUDY_SUBMISSIONS_COL, attemptId);

  const result = await runTransaction(db, async (tx) => {
    const attemptSnap = await tx.get(attemptRef);
    const submissionSnap = await tx.get(submissionRef);
    if (!attemptSnap.exists()) {
      throw new Error('ابدأ وقت الحل من جهاز واحد أولاً، ثم أرسل الإجابة.');
    }
    const attempt = readAttemptData(attemptId, key, day, attemptSnap.data() as Record<string, any>);
    if (submissionSnap.exists()) {
      const prev = submissionSnap.data() as Record<string, any>;
      if (!attempt.submittedAt) {
        tx.update(attemptRef, {
          submittedAt: submissionMs(prev) || now,
          submissionId: attemptId,
          score: Number(prev.score) || 0,
          sealedAt: now,
        });
      }
      return {
        already: true as const,
        submissionId: attemptId,
        score: Number(prev.score) || 0,
        startedAt: attempt.startedAt,
      };
    }
    if (attempt.submittedAt) {
      return { already: true as const, submissionId: attempt.submissionId, score: attempt.score, startedAt: attempt.startedAt };
    }
    if (!attempt.startedAt) {
      throw new Error('وقت الحل غير صالح. حدّث الصفحة.');
    }
    if (now > caseAttemptSubmitDeadline(attempt.startedAt)) {
      throw new Error('انتهت مهلة تسجيل حل اليوم على كل الأجهزة.');
    }

    const solveMs = Math.min(
      CASE_STUDY_SOLVE_MS,
      Math.max(1, Math.round(payload.solveMs || (now - attempt.startedAt)))
    );
    const when = new Date(now);
    const row = {
      studentName: String(payload.studentName || '').trim() || 'مشارك',
      phone: key,
      score: Number(payload.score) || 0,
      solveScore: Number(payload.solveScore) || 0,
      solveMs,
      total: Number(payload.total) || 3,
      bonusQuestionId: payload.bonusQuestionId,
      bonusAmount: Number(payload.bonusAmount) || 0,
      persistenceBonus: Number(payload.persistenceBonus) || 0,
      persistenceWeek: payload.persistenceWeek,
      answers: payload.answers || {},
      timestamp: now,
      createdAt: when.toISOString(),
      dateStr: when.toLocaleDateString('ar-EG', { timeZone: 'Asia/Riyadh' }),
      timeStr: when.toLocaleTimeString('ar-EG', { timeZone: 'Asia/Riyadh' }),
      attemptId,
      day,
    };

    tx.set(submissionRef, row);
    tx.update(attemptRef, {
      submittedAt: now,
      submissionId: attemptId,
      score: row.score,
      sealedAt: now,
    });

    return { already: false as const, submissionId: attemptId, score: row.score, startedAt: attempt.startedAt, row };
  });

  return result;
}

/** إذا انتهى الوقت ولم يُسجَّل حل — يُقفل اليوم بصفر على كل الأجهزة */
export async function sealExpiredCaseAttempt(
  db: Firestore,
  phone: string,
  studentName = '',
  now = Date.now()
) {
  const key = canonicalPhone(phone) || String(phone || '').trim();
  if (!key) throw new Error('رقم الجوال مطلوب.');
  const day = riyadhParts(now).ymd;
  const attemptId = caseSolveAttemptId(key, day);
  const attemptRef = doc(db, CASE_STUDY_ATTEMPTS_COL, attemptId);
  const submissionRef = doc(db, CASE_STUDY_SUBMISSIONS_COL, attemptId);

  return runTransaction(db, async (tx) => {
    const attemptSnap = await tx.get(attemptRef);
    const submissionSnap = await tx.get(submissionRef);
    if (!attemptSnap.exists()) {
      return { sealed: false as const, already: false as const, score: null as number | null, submissionId: null as string | null };
    }
    const attempt = readAttemptData(attemptId, key, day, attemptSnap.data() as Record<string, any>);
    if (submissionSnap.exists()) {
      const prev = submissionSnap.data() as Record<string, any>;
      if (!attempt.submittedAt) {
        tx.update(attemptRef, {
          submittedAt: submissionMs(prev) || now,
          submissionId: attemptId,
          score: Number(prev.score) || 0,
          sealedAt: now,
        });
      }
      return {
        sealed: true as const,
        already: true as const,
        score: Number(prev.score) || 0,
        submissionId: attemptId,
      };
    }
    if (attempt.submittedAt) {
      return {
        sealed: true as const,
        already: true as const,
        score: attempt.score ?? 0,
        submissionId: attempt.submissionId,
      };
    }
    if (!isCaseAttemptExpired(attempt.startedAt, now)) {
      return { sealed: false as const, already: false as const, score: null, submissionId: null };
    }

    const when = new Date(now);
    const row = {
      studentName: String(studentName || '').trim() || 'مشارك',
      phone: key,
      score: 0,
      solveScore: 0,
      solveMs: CASE_STUDY_SOLVE_MS,
      total: 3,
      bonusQuestionId: null,
      bonusAmount: 0,
      persistenceBonus: 0,
      persistenceWeek: null,
      answers: {},
      timestamp: now,
      createdAt: when.toISOString(),
      dateStr: when.toLocaleDateString('ar-EG', { timeZone: 'Asia/Riyadh' }),
      timeStr: when.toLocaleTimeString('ar-EG', { timeZone: 'Asia/Riyadh' }),
      attemptId,
      day,
      sealedExpired: true,
    };

    tx.set(submissionRef, row);
    tx.update(attemptRef, {
      submittedAt: now,
      submissionId: attemptId,
      score: 0,
      sealedAt: now,
      sealedExpired: true,
    });

    return {
      sealed: true as const,
      already: false as const,
      score: 0,
      submissionId: attemptId,
    };
  });
}

export function formatSolveClock(leftMs: number) {
  const left = Math.max(0, leftMs);
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatRiyadhCountdown(ms = Date.now()) {
  const part = riyadhParts(ms);
  const elapsed = part.hour * 3600000 + part.minute * 60000 + part.second * 1000;
  const left = Math.max(0, 24 * 3600000 - elapsed);
  const hours = Math.floor(left / 3600000);
  const mins = Math.floor((left % 3600000) / 60000);
  return `${hours} ساعة و ${mins} دقيقة`;
}

export function addDaysYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function weekStartSunday(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() - dt.getUTCDay());
  return dt.toISOString().slice(0, 10);
}

export function isRiyadhThursday(ms = Date.now()) {
  return riyadhParts(ms).weekday === 'Thu';
}

export function submissionMs(sub: Record<string, any> | null | undefined) {
  const timestamp = Number(sub?.timestamp);
  if (Number.isFinite(timestamp) && timestamp > 1_000_000_000_000) return timestamp;
  const created = sub?.createdAt || sub?.submittedAt;
  if (typeof created === 'number' && created > 1_000_000_000_000) return created;
  const parsed = Date.parse(String(created || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function submissionDayKey(sub: Record<string, any> | null | undefined) {
  const ms = submissionMs(sub);
  return ms ? riyadhParts(ms).ymd : '';
}

export function formatCaseDate(sub: Record<string, any> | null | undefined) {
  const ms = submissionMs(sub);
  if (!ms) return 'تاريخ غير مسجّل';
  return new Date(ms).toLocaleString('ar-EG', {
    timeZone: 'Asia/Riyadh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDayLabel(ymd: string) {
  if (!ymd) return '';
  return new Date(`${ymd}T12:00:00+03:00`).toLocaleDateString('ar-EG', {
    timeZone: 'Asia/Riyadh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function personPhone(sub: Record<string, any> | null | undefined) {
  return canonicalPhone(String(sub?.phone || sub?.phoneNumber || ''));
}

export function adjustmentsOf(sub: Record<string, any> | null | undefined): ScoreAdjustment[] {
  return Array.isArray(sub?.scoreAdjustments) ? sub.scoreAdjustments : [];
}

export function adjustmentSum(sub: Record<string, any> | null | undefined) {
  return adjustmentsOf(sub).reduce((sum, item) => sum + Number(item.delta || 0), 0);
}

export type ScoreBreakdown = {
  solve: number;
  surprise: number;
  persistence: number;
  adminLogged: number;
  unverified: number;
  total: number;
};

export function scoreBreakdown(sub: Record<string, any> | null | undefined): ScoreBreakdown {
  const total = Number(sub?.score || 0);
  const surprise = Number(sub?.bonusAmount || 0);
  const persistence = Number(sub?.persistenceBonus || 0);
  const adminLogged = adjustmentSum(sub);
  const cap = Number(sub?.total || 3) + surprise;
  if (typeof sub?.solveScore === 'number') {
    const solve = Number(sub.solveScore);
    return {
      solve,
      surprise,
      persistence,
      adminLogged,
      unverified: Math.max(0, total - solve - persistence - adminLogged),
      total,
    };
  }
  const estimatedSolve = Math.min(Math.max(0, total - adminLogged - persistence), cap);
  return {
    solve: estimatedSolve,
    surprise,
    persistence,
    adminLogged,
    unverified: Math.max(0, total - estimatedSolve - persistence - adminLogged),
    total,
  };
}

export function uniqueDaysThisWeek(submissions: Array<Record<string, any>>, phone: string, todayYmd: string) {
  const start = weekStartSunday(todayYmd);
  const key = canonicalPhone(phone);
  const days = new Set<string>();
  if (!key) return days;
  for (const sub of submissions) {
    if (personPhone(sub) !== key) continue;
    const day = submissionDayKey(sub);
    if (day && day >= start && day <= todayYmd) days.add(day);
  }
  return days;
}

export function hasPersistenceThisWeek(submissions: Array<Record<string, any>>, phone: string, weekKey: string) {
  const key = canonicalPhone(phone);
  return submissions.some((sub) => {
    if (personPhone(sub) !== key) return false;
    if (String(sub.persistenceWeek || '') === weekKey) return true;
    return Number(sub.persistenceBonus || 0) > 0 && submissionDayKey(sub) >= weekKey;
  });
}

export function persistenceForSubmit(
  submissions: Array<Record<string, any>>,
  phone: string,
  now = Date.now()
) {
  if (!isRiyadhThursday(now)) return { amount: 0, weekKey: '' };
  const today = riyadhParts(now).ymd;
  const weekKey = weekStartSunday(today);
  if (hasPersistenceThisWeek(submissions, phone, weekKey)) return { amount: 0, weekKey };
  const days = uniqueDaysThisWeek(
    [...submissions, { phone, timestamp: now }],
    phone,
    today
  );
  return { amount: days.size >= 5 ? 2 : 0, weekKey };
}

export async function grantThursdayPersistence(db: Firestore, submissions: Array<Record<string, any>>) {
  const today = riyadhParts();
  if (today.weekday !== 'Thu') {
    throw new Error('بونص شكر الاستمرارية يُصرف يوم الخميس.');
  }
  const weekKey = weekStartSunday(today.ymd);
  const byPhone = new Map<string, Array<Record<string, any>>>();
  for (const sub of submissions) {
    const phone = personPhone(sub);
    if (!phone) continue;
    const day = submissionDayKey(sub);
    if (!day || day < weekKey || day > today.ymd) continue;
    const list = byPhone.get(phone) || [];
    list.push(sub);
    byPhone.set(phone, list);
  }

  let granted = 0;
  for (const [phone, rows] of byPhone) {
    if (hasPersistenceThisWeek(submissions, phone, weekKey)) continue;
    const days = new Set(rows.map((row) => submissionDayKey(row)).filter(Boolean));
    if (days.size < 5) continue;
    const target = rows.find((row) => submissionDayKey(row) === today.ymd);
    if (!target?.id) continue;
    await updateDoc(doc(db, 'case_study_submissions', target.id), {
      score: increment(2),
      persistenceBonus: 2,
      persistenceWeek: weekKey,
    });
    granted += 1;
  }
  return granted;
}

type SubmissionsCache = { at: number; rows: Array<Record<string, any>> };
let submissionsCache: SubmissionsCache | null = null;
const SUBMISSIONS_CACHE_MS = 3 * 60 * 1000;

export function invalidateCaseSubmissionsCache() {
  submissionsCache = null;
}

export async function loadCaseSubmissions(db: Firestore, options?: { force?: boolean }) {
  if (!options?.force && submissionsCache && Date.now() - submissionsCache.at < SUBMISSIONS_CACHE_MS) {
    return submissionsCache.rows;
  }
  const snap = await getDocs(collection(db, CASE_STUDY_SUBMISSIONS_COL));
  const rows = snap.docs
    .map((row) => ({ id: row.id, ...row.data() } as Record<string, any>))
    .sort((a, b) => submissionMs(b) - submissionMs(a));
  submissionsCache = { at: Date.now(), rows };
  return rows;
}

/** قراءة تسليم اليوم بجوال واحد — قراءة واحدة بدل مسح كل السجل */
export async function loadTodayCaseSubmission(db: Firestore, phone: string, now = Date.now()) {
  const key = canonicalPhone(phone) || String(phone || '').trim();
  if (!key) return null;
  const day = riyadhParts(now).ymd;
  const id = caseSolveAttemptId(key, day);
  const direct = await getDoc(doc(db, CASE_STUDY_SUBMISSIONS_COL, id));
  if (direct.exists()) return { id: direct.id, ...direct.data() } as Record<string, any>;

  try {
    const snap = await getDocs(
      query(collection(db, CASE_STUDY_SUBMISSIONS_COL), where('phone', '==', key), limit(12))
    );
    const rows = snap.docs
      .map((row) => ({ id: row.id, ...row.data() } as Record<string, any>))
      .filter((row) => submissionDayKey(row) === day)
      .sort((a, b) => submissionMs(b) - submissionMs(a));
    return rows[0] || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function loadCaseSubmissionsForPhone(db: Firestore, phone: string, max = 40) {
  const key = canonicalPhone(phone) || String(phone || '').trim();
  if (!key) return [] as Array<Record<string, any>>;
  try {
    const snap = await getDocs(
      query(collection(db, CASE_STUDY_SUBMISSIONS_COL), where('phone', '==', key), limit(max))
    );
    return snap.docs
      .map((row) => ({ id: row.id, ...row.data() } as Record<string, any>))
      .sort((a, b) => submissionMs(b) - submissionMs(a));
  } catch (err) {
    console.error(err);
    return [] as Array<Record<string, any>>;
  }
}

export type CaseLeaderboardRow = {
  phone: string;
  studentName: string;
  totalScore: number;
  latestTs: number;
};

export const CASE_STUDY_DISTINGUISHED_COUNT = 5;

export function aggregateCaseLeaderboard(submissions: Array<Record<string, any>>): CaseLeaderboardRow[] {
  const byKey: Record<string, CaseLeaderboardRow> = {};

  for (const data of submissions) {
    const rawPhone = String(data.phone || data.phoneNumber || '').trim();
    const phone = canonicalPhone(rawPhone);
    const studentName = String(data.studentName || 'مشارك').trim() || 'مشارك';
    const key = phone || `name:${studentName}`;
    const latestTs = submissionMs(data);
    if (!byKey[key]) {
      byKey[key] = { phone, studentName, totalScore: 0, latestTs: 0 };
    }
    byKey[key].totalScore += Number(data.score) || 0;
    if (latestTs >= byKey[key].latestTs) {
      byKey[key].latestTs = latestTs;
      byKey[key].studentName = studentName;
      if (phone) byKey[key].phone = phone;
    }
  }

  return Object.values(byKey).sort((a, b) => (
    b.totalScore - a.totalScore
    || a.latestTs - b.latestTs
    || a.studentName.localeCompare(b.studentName, 'ar')
  ));
}

export function topCaseStudyPhones(
  submissions: Array<Record<string, any>>,
  count = CASE_STUDY_DISTINGUISHED_COUNT
) {
  return aggregateCaseLeaderboard(submissions)
    .filter((row) => row.phone)
    .slice(0, count)
    .map((row) => row.phone);
}
