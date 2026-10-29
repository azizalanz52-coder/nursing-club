import {
  addDaysYmd,
  adjustmentSum,
  personPhone,
  riyadhParts,
  submissionDayKey,
  submissionMs,
  weekStartSunday,
  type CaseLeaderboardRow,
} from './caseStudy';

/** الفترة التجريبية: الأربعاء 28 أكتوبر 2026 الساعة 11:59 مساءً حتى السبت 31 أكتوبر الساعة 11:59 مساءً. */
export const WEEKLY_COMPETITION_START_MS = Date.parse('2026-10-28T23:59:00+03:00');
export const WEEKLY_TITLES_START = '2026-10-29';
export const WEEKLY_DAY_CAP = 3;
export const WEEKLY_SPECIAL_CERT_TITLES = 3;
export const WEEKLY_COMPETITION_START_LABEL = 'الأربعاء 28 أكتوبر الساعة 11:59 مساءً بتوقيت الرياض';

export const WEEKLY_COPY = {
  noticeIntro: 'بدأت الفترة التجريبية لمتصدر الأسبوع. هذه آلية العمل:',
  noticePoints: [
    'لوحة الصدارة فيها خياران: الصدارة العامة، ومتصدر الأسبوع.',
    'الفترة التجريبية من يوم الأربعاء 28 أكتوبر الساعة 11:59 مساءً إلى يوم السبت 31 أكتوبر الساعة 11:59 مساءً بتوقيت الرياض.',
    'تُحتسب في متصدر الأسبوع الإجابات الصحيحة فقط. البونص المفاجئ وبونص الاستمرارية يُضافان للصدارة العامة ولا يدخلان سباق الأسبوع.',
    'بعد الفترة التجريبية، كل يوم أحد تبدأ نقاط الأسبوع من الصفر، وتُقفل الصدارة يوم السبت الساعة 11:59 مساءً.',
    'تظهر بجانب الاسم شارات: متصدر الأسبوع، متصدر الأسبوع الماضي، أطول سلسلة، وأسبوع كامل عند حل الحالات الثلاث كل يوم.',
    'عند تساوي النقاط يتقدم من كان الأسرع في أكبر عدد من أيام الأسبوع، ثم من حقق 3 من 3 في أيام أكثر. وإذا بقي التساوي يتشاركان الصدارة.',
    'الشهادة الخاصة لمن يحقق ثلاث صدارات أسبوعية خلال الفصل، وليست بالضرورة في أسابيع متتالية.',
  ],
  boardLive: 'نقاط الأسبوع من الإجابات الصحيحة فقط، والبونص يُضاف للصدارة العامة.',
  boardBefore: 'تبدأ الفترة التجريبية يوم الأربعاء الساعة 11:59 مساءً.',
  emptyBefore: 'لم تبدأ الفترة التجريبية بعد.',
  emptyLive: 'لا توجد مشاركات في هذه الفترة بعد.',
  lockNote: 'تُقفل الفترة التجريبية يوم السبت الساعة 11:59 مساءً بتوقيت الرياض.',
};

export function isWeeklyCompetitionLive(now = Date.now()) {
  return now >= WEEKLY_COMPETITION_START_MS;
}

export function weeklyCountFrom(weekStart: string) {
  return weekStart > WEEKLY_TITLES_START ? weekStart : WEEKLY_TITLES_START;
}

export type WeeklyBoardRow = {
  key: string;
  phone: string;
  studentName: string;
  weekPoints: number;
  cleanScore: number;
  perfectDays: number;
  fastestDays: number;
  titles: number;
  streak: number;
  rank: number;
  isWeeklyLeader: boolean;
  perfectWeek: boolean;
  lastWeekChampion: boolean;
  longestStreak: boolean;
  specialCert: boolean;
  tieNote: string;
};

export type OverallBoardRow = CaseLeaderboardRow & {
  titles: number;
  lastWeekChampion: boolean;
  specialCert: boolean;
  longestStreak: boolean;
  streak: number;
};

export function weekEndSaturday(weekStart: string) {
  return addDaysYmd(weekStart, 6);
}

export function weekLockMs(weekStart: string) {
  return Date.parse(`${weekEndSaturday(weekStart)}T23:59:00+03:00`);
}

export function isWeekLocked(weekStart: string, now = Date.now()) {
  return now >= weekLockMs(weekStart);
}

export function currentWeekStart(now = Date.now()) {
  return weekStartSunday(riyadhParts(now).ymd);
}

export function formatWeekRangeLabel(weekStart: string) {
  const start = weeklyCountFrom(weekStart);
  const end = weekEndSaturday(weekStart);
  const fmt = (ymd: string) =>
    new Date(`${ymd}T12:00:00+03:00`).toLocaleDateString('ar-EG', {
      timeZone: 'Asia/Riyadh',
      day: 'numeric',
      month: 'long',
    });
  return `${fmt(start)} — ${fmt(end)}`;
}

function eachYmd(start: string, end: string) {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDaysYmd(cursor, 1);
  }
  return days;
}

function personKey(sub: Record<string, any>) {
  const phone = personPhone(sub);
  const name = String(sub.studentName || 'مشارك').trim() || 'مشارك';
  return phone || `name:${name}`;
}

function correctAnswersOf(sub: Record<string, any>) {
  const surprise = Number(sub.bonusAmount || 0);
  const persistence = Number(sub.persistenceBonus || 0);
  const admin = adjustmentSum(sub);
  const totalScore = Number(sub.score || 0);
  const stripped = typeof sub.solveScore === 'number'
    ? Number(sub.solveScore) - surprise
    : totalScore - surprise - persistence - admin;
  return Math.min(WEEKLY_DAY_CAP, Math.max(0, Math.round(stripped)));
}

function isPerfectDay(rows: Array<Record<string, any>>) {
  return rows.some((sub) => correctAnswersOf(sub) >= WEEKLY_DAY_CAP);
}

function consecutiveStreak(days: string[], today: string) {
  const set = new Set(days);
  if (!set.size) return 0;
  let cursor = set.has(today) ? today : [...set].sort().at(-1) || today;
  let count = 0;
  while (set.has(cursor)) {
    count += 1;
    cursor = addDaysYmd(cursor, -1);
  }
  return count;
}

function inWeek(sub: Record<string, any>, weekStart: string) {
  const day = submissionDayKey(sub);
  const start = weeklyCountFrom(weekStart);
  const end = weekEndSaturday(weekStart);
  const ms = submissionMs(sub);
  if (!day || day < start || day > end) return false;
  return ms >= WEEKLY_COMPETITION_START_MS && ms < weekLockMs(weekStart);
}

function lockedWeekStarts(now = Date.now()) {
  const starts: string[] = [];
  const current = currentWeekStart(now);
  let week = weekStartSunday(WEEKLY_TITLES_START);
  while (week <= current) {
    if (isWeekLocked(week, now) && weekEndSaturday(week) >= WEEKLY_TITLES_START) starts.push(week);
    week = addDaysYmd(week, 7);
    if (week > current) break;
  }
  return starts;
}

function compareWeekly(
  a: Pick<WeeklyBoardRow, 'weekPoints' | 'fastestDays' | 'perfectDays' | 'cleanScore'>,
  b: Pick<WeeklyBoardRow, 'weekPoints' | 'fastestDays' | 'perfectDays' | 'cleanScore'>
) {
  return (
    b.weekPoints - a.weekPoints
    || b.fastestDays - a.fastestDays
    || b.perfectDays - a.perfectDays
    || b.cleanScore - a.cleanScore
  );
}

function tiedWeekly(
  a: Pick<WeeklyBoardRow, 'weekPoints' | 'fastestDays' | 'perfectDays' | 'cleanScore'>,
  b: Pick<WeeklyBoardRow, 'weekPoints' | 'fastestDays' | 'perfectDays' | 'cleanScore'>
) {
  return compareWeekly(a, b) === 0;
}

function fastestDaysByKey(subs: Array<Record<string, any>>, weekStart: string) {
  const byDay = new Map<string, Map<string, number>>();
  for (const sub of subs) {
    if (!inWeek(sub, weekStart)) continue;
    const day = submissionDayKey(sub);
    const key = personKey(sub);
    const ms = submissionMs(sub);
    if (!day || !key || !ms) continue;
    const people = byDay.get(day) || new Map<string, number>();
    const prev = people.get(key);
    if (prev === undefined || ms < prev) people.set(key, ms);
    byDay.set(day, people);
  }

  const wins = new Map<string, number>();
  for (const people of byDay.values()) {
    let best = Infinity;
    for (const ms of people.values()) best = Math.min(best, ms);
    for (const [key, ms] of people) {
      if (ms === best) wins.set(key, (wins.get(key) || 0) + 1);
    }
  }
  return wins;
}

function weekStats(subs: Array<Record<string, any>>, weekStart: string, now = Date.now()) {
  const today = riyadhParts(now).ymd;
  const countStart = weeklyCountFrom(weekStart);
  const weekEnd = weekEndSaturday(weekStart);
  const elapsedEnd = today < weekEnd ? today : weekEnd;
  const elapsedDays = eachYmd(countStart, elapsedEnd);
  const weekDays = eachYmd(countStart, weekEnd);
  const fastest = fastestDaysByKey(subs, weekStart);
  const byKey = new Map<string, {
    phone: string;
    studentName: string;
    latestTs: number;
    weekPoints: number;
    cleanScore: number;
    days: Map<string, Array<Record<string, any>>>;
  }>();

  const countable = new Set(elapsedDays);

  for (const sub of subs) {
    if (!inWeek(sub, weekStart)) continue;
    const key = personKey(sub);
    const phone = personPhone(sub);
    const name = String(sub.studentName || 'مشارك').trim() || 'مشارك';
    const day = submissionDayKey(sub);
    const ms = submissionMs(sub);
    if (!key || !day || !countable.has(day)) continue;
    const row = byKey.get(key) || {
      phone,
      studentName: name,
      latestTs: 0,
      weekPoints: 0,
      cleanScore: 0,
      days: new Map(),
    };
    if (ms >= row.latestTs) {
      row.latestTs = ms;
      row.studentName = name;
      if (phone) row.phone = phone;
    }
    const list = row.days.get(day) || [];
    list.push(sub);
    row.days.set(day, list);
    byKey.set(key, row);
  }

  const rows: Array<Omit<WeeklyBoardRow, 'rank' | 'isWeeklyLeader' | 'lastWeekChampion' | 'longestStreak' | 'titles' | 'specialCert' | 'tieNote' | 'streak' | 'perfectWeek'> & {
    perfectWeek: boolean;
    perfectDays: number;
    fastestDays: number;
  }> = [];

  for (const [key, row] of byKey) {
    let weekPoints = 0;
    for (const day of elapsedDays) {
      const dayRows = row.days.get(day) || [];
      if (!dayRows.length) continue;
      const dayScore = Math.max(0, ...dayRows.map((item) => correctAnswersOf(item)));
      weekPoints += Math.min(WEEKLY_DAY_CAP, dayScore);
    }
    weekPoints = Math.min(WEEKLY_DAY_CAP * elapsedDays.length, weekPoints);
    const perfectDays = elapsedDays.filter((day) => isPerfectDay(row.days.get(day) || [])).length;
    rows.push({
      key,
      phone: row.phone,
      studentName: row.studentName,
      weekPoints,
      cleanScore: weekPoints,
      perfectDays,
      fastestDays: fastest.get(key) || 0,
      perfectWeek: weekDays.length > 0 && elapsedDays.length === weekDays.length && perfectDays === weekDays.length,
    });
  }

  rows.sort((a, b) => compareWeekly(a, b) || a.studentName.localeCompare(b.studentName, 'ar'));
  return rows;
}

function championsOfWeek(subs: Array<Record<string, any>>, weekStart: string, now = Date.now()) {
  const rows = weekStats(subs, weekStart, now);
  if (!rows.length) return [] as string[];
  const first = rows[0];
  return rows.filter((row) => tiedWeekly(row, first)).map((row) => row.key);
}

function titleCounts(subs: Array<Record<string, any>>, now = Date.now()) {
  const counts = new Map<string, number>();
  for (const week of lockedWeekStarts(now)) {
    for (const key of championsOfWeek(subs, week, now)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

function daysByPerson(subs: Array<Record<string, any>>) {
  const map = new Map<string, string[]>();
  for (const sub of subs) {
    const key = personKey(sub);
    const day = submissionDayKey(sub);
    if (!key || !day) continue;
    const list = map.get(key) || [];
    if (!list.includes(day)) list.push(day);
    map.set(key, list);
  }
  return map;
}

export function aggregateWeeklyBoard(
  submissions: Array<Record<string, any>>,
  now = Date.now()
): { weekStart: string; weekLabel: string; locked: boolean; live: boolean; rows: WeeklyBoardRow[] } {
  const weekStart = currentWeekStart(now);
  const today = riyadhParts(now).ymd;
  if (!isWeeklyCompetitionLive(now)) {
    return {
      weekStart,
      weekLabel: formatWeekRangeLabel(weekStart),
      locked: false,
      live: false,
      rows: [],
    };
  }
  const titles = titleCounts(submissions, now);
  const lastWeekStart = addDaysYmd(weekStart, -7);
  const lastWeekKeys = weekEndSaturday(lastWeekStart) >= WEEKLY_TITLES_START && isWeekLocked(lastWeekStart, now)
    ? new Set(championsOfWeek(submissions, lastWeekStart, now))
    : new Set<string>();
  const dayMap = daysByPerson(submissions);
  const raw = weekStats(submissions, weekStart, now);

  const withStreak = raw.map((row) => ({
    ...row,
    streak: consecutiveStreak(dayMap.get(row.key) || [], today),
    titles: titles.get(row.key) || 0,
    lastWeekChampion: lastWeekKeys.has(row.key),
    specialCert: (titles.get(row.key) || 0) >= WEEKLY_SPECIAL_CERT_TITLES,
  }));

  const longest = Math.max(0, ...withStreak.map((row) => row.streak));
  const ranked: WeeklyBoardRow[] = [];
  for (let i = 0; i < withStreak.length; i += 1) {
    const row = withStreak[i];
    const sameAsPrev = i > 0 && tiedWeekly(row, withStreak[i - 1]);
    const rank = sameAsPrev ? ranked[i - 1].rank : i + 1;
    const prev = withStreak[i - 1];
    const next = withStreak[i + 1];
    const tiedNeighbors = [prev, next].filter((other) => other && other.weekPoints === row.weekPoints);
    let tieNote = '';
    if (tiedNeighbors.length) {
      if (tiedNeighbors.some((other) => other.fastestDays !== row.fastestDays)) {
        tieNote = `تعادل ${row.weekPoints} نقطة · الأسرع في ${row.fastestDays} ${row.fastestDays === 1 ? 'يوم' : 'أيام'}`;
      } else if (tiedNeighbors.some((other) => other.perfectDays !== row.perfectDays)) {
        tieNote = `تعادل ${row.weekPoints} نقطة · ${row.perfectDays} أيام 3/3`;
      } else {
        tieNote = `تعادل ${row.weekPoints} نقطة`;
      }
    }
    ranked.push({
      ...row,
      rank,
      isWeeklyLeader: rank === 1,
      longestStreak: longest > 0 && row.streak === longest,
      tieNote,
    });
  }

  return {
    weekStart,
    weekLabel: formatWeekRangeLabel(weekStart),
    locked: isWeekLocked(weekStart, now),
    live: true,
    rows: ranked,
  };
}

export function decorateOverallBoard(
  overall: CaseLeaderboardRow[],
  submissions: Array<Record<string, any>>,
  now = Date.now()
): OverallBoardRow[] {
  const titles = titleCounts(submissions, now);
  const lastWeekStart = addDaysYmd(currentWeekStart(now), -7);
  const lastWeekKeys = weekEndSaturday(lastWeekStart) >= WEEKLY_TITLES_START && isWeekLocked(lastWeekStart, now)
    ? new Set(championsOfWeek(submissions, lastWeekStart, now))
    : new Set<string>();
  const today = riyadhParts(now).ymd;
  const dayMap = daysByPerson(submissions);
  const streaks = overall.map((row) => {
    const key = row.phone || `name:${row.studentName}`;
    return consecutiveStreak(dayMap.get(key) || [], today);
  });
  const longest = Math.max(0, ...streaks);

  return overall.map((row, idx) => {
    const key = row.phone || `name:${row.studentName}`;
    const count = titles.get(key) || 0;
    const streak = streaks[idx] || 0;
    return {
      ...row,
      titles: count,
      lastWeekChampion: lastWeekKeys.has(key),
      specialCert: count >= WEEKLY_SPECIAL_CERT_TITLES,
      streak,
      longestStreak: longest > 0 && streak === longest,
    };
  });
}
