import { Firestore, collection, doc, getDocs, increment, updateDoc } from 'firebase/firestore';
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
  }).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    ymd: `${bag.year}-${bag.month}-${bag.day}`,
    weekday: bag.weekday || '',
  };
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

export async function loadCaseSubmissions(db: Firestore) {
  const snap = await getDocs(collection(db, 'case_study_submissions'));
  return snap.docs
    .map((row) => ({ id: row.id, ...row.data() }))
    .sort((a, b) => submissionMs(b) - submissionMs(a));
}
