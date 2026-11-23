import { ADMIN_PHONE } from './authIdentity';
import type { GamePlay, GameStatus } from './gameActivity';

export const QUIZ_MAX = 4;
export const MIN_FINISHED_DAYS = 3;
export const MIN_ACCURACY = 0.5;

export type RadarAxisId = 'play' | 'correct' | 'solves' | 'speed' | 'accuracy' | 'both';

export const RADAR_AXES: { id: RadarAxisId; label: string; hint: string }[] = [
  { id: 'play', label: 'المشاركة', hint: 'الجلسات المكتملة مقارنة بأكثر شخص في الفترة' },
  { id: 'correct', label: 'الإجابات', hint: 'مجموع إجابات دقيقة الإسعاف الصحيحة مقارنة بالأعلى' },
  { id: 'solves', label: 'الحلول', hint: 'مرات الوصول للكلمة + مرات الإسعاف الكامل ٤/٤ مقارنة بالأعلى' },
  { id: 'speed', label: 'السرعة', hint: 'متوسط زمن الفوز بالكلمة وإكمال الإسعاف. الأسرع يأخذ الأعلى' },
  { id: 'accuracy', label: 'الدقة', hint: 'متوسط نسبة صح الإسعاف ونسبة الوصول للكلمة. رقم مطلق مو مقارنة' },
  { id: 'both', label: 'اللعبتين', hint: 'الأيام اللي لعب فيها اللعبتين معًا مقارنة بالأعلى' },
];

export const MERIT_WEIGHTS: Record<RadarAxisId, number> = {
  play: 20,
  correct: 25,
  solves: 20,
  speed: 15,
  accuracy: 10,
  both: 10,
};

export type DayMark = {
  day: string;
  word?: GamePlay;
  quiz?: GamePlay;
};

export type RankPlace = { place: number; of: number };

export type PlayerRadar = {
  phone: string;
  name: string;
  staff: boolean;
  wordWins: number;
  wordLosses: number;
  wordOpen: number;
  wordFinished: number;
  wordWinAttempts: number;
  quizFinished: number;
  quizCorrect: number;
  quizPossible: number;
  quizPerfect: number;
  finishedDays: number;
  startedDays: number;
  bothDays: number;
  playCount: number;
  solves: number;
  accuracy: number | null;
  avgSpeedMs: number | null;
  bestSpeedMs: number | null;
  speedSamples: number;
  bestWordMs: number | null;
  avgWordMs: number | null;
  bestQuizMs: number | null;
  avgQuizMs: number | null;
  streak: number;
  absentDays: number;
  axes: Record<RadarAxisId, number | null>;
  merit: number;
  flags: string[];
  qualifies: boolean;
  holdReasons: string[];
  days: DayMark[];
  ranks: Record<'play' | 'correct' | 'solves' | 'speed' | 'merit', RankPlace | null>;
};

export type RaceRow = { player: PlayerRadar; place: number; value: number };

export type GamesRadarReport = {
  from: string;
  to: string;
  clubDays: string[];
  players: PlayerRadar[];
  cohort: PlayerRadar[];
  passed: PlayerRadar[];
  held: PlayerRadar[];
  summary: {
    people: number;
    students: number;
    wordPlays: number;
    quizPlays: number;
    clubDayCount: number;
    bothPeople: number;
    wordOnly: number;
    quizOnly: number;
    totalCorrect: number;
    totalWins: number;
    totalPerfect: number;
  };
  races: {
    play: RaceRow[];
    correct: RaceRow[];
    solves: RaceRow[];
    speed: RaceRow[];
  };
  median: Record<RadarAxisId, number>;
};

const STATUS_RANK: Record<GameStatus, number> = { won: 3, lost: 2, finished: 2, playing: 1 };

function canon(value: string) {
  let core = String(value || '').replace(/\D/g, '');
  if (core.startsWith('966')) core = core.slice(3);
  if (core.startsWith('0')) core = core.slice(1);
  return core ? `0${core}` : '';
}

const STAFF_PHONE = canon(ADMIN_PHONE);

function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function mean(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function timed(ms?: number) {
  return typeof ms === 'number' && ms > 0 ? ms : null;
}

function better(current: GamePlay | undefined, next: GamePlay, game: 'word' | 'quiz') {
  if (!current) return next;
  const statusGap = (STATUS_RANK[next.status] || 0) - (STATUS_RANK[current.status] || 0);
  if (statusGap) return statusGap > 0 ? next : current;
  if (game === 'quiz' && next.score !== current.score) return next.score > current.score ? next : current;
  if (game === 'word' && next.status === 'won' && current.status === 'won' && next.attempts !== current.attempts) {
    return next.attempts < current.attempts ? next : current;
  }
  const nextTime = timed(next.durationMs) ?? Number.MAX_SAFE_INTEGER;
  const currentTime = timed(current.durationMs) ?? Number.MAX_SAFE_INTEGER;
  if (nextTime !== currentTime) return nextTime < currentTime ? next : current;
  return (next.updatedAt || 0) >= (current.updatedAt || 0) ? next : current;
}

function relative(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.round((100 * value) / max);
}

function speedScore(ms: number | null, fastest: number | null, slowest: number | null) {
  if (ms == null || fastest == null || slowest == null) return null;
  if (slowest === fastest) return 100;
  return Math.round((100 * (slowest - ms)) / (slowest - fastest));
}

function places(players: PlayerRadar[], read: (player: PlayerRadar) => number | null, lower = false): RaceRow[] {
  const rows = players
    .map((player) => ({ player, value: read(player) }))
    .filter((row): row is { player: PlayerRadar; value: number } => row.value != null)
    .sort((a, b) => {
      if (a.value !== b.value) return lower ? a.value - b.value : b.value - a.value;
      return a.player.name.localeCompare(b.player.name, 'ar');
    });
  let place = 0;
  let last: number | null = null;
  return rows.map((row, index) => {
    if (last == null || row.value !== last) place = index + 1;
    last = row.value;
    return { player: row.player, place, value: row.value };
  });
}

function rankMap(race: RaceRow[]) {
  const map = new Map<string, RankPlace>();
  race.forEach((row) => map.set(row.player.phone, { place: row.place, of: race.length }));
  return map;
}

function emptyAxes(): Record<RadarAxisId, number | null> {
  return { play: 0, correct: 0, solves: 0, speed: null, accuracy: null, both: 0 };
}

export function buildGamesRadar(plays: GamePlay[], from = '', to = ''): GamesRadarReport {
  const usable = plays.filter((row) => {
    if (row.game !== 'word' && row.game !== 'quiz') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(row.day || ''))) return false;
    if (from && row.day < from) return false;
    if (to && row.day > to) return false;
    return Boolean(canon(row.phone));
  });

  const byPhone = new Map<string, { name: string; nameAt: number; days: Map<string, DayMark> }>();
  usable.forEach((row) => {
    const phone = canon(row.phone);
    let bucket = byPhone.get(phone);
    if (!bucket) {
      bucket = { name: '', nameAt: 0, days: new Map() };
      byPhone.set(phone, bucket);
    }
    const name = String(row.name || '').trim();
    if (name && name !== phone && (row.updatedAt || 0) >= bucket.nameAt) {
      bucket.name = name;
      bucket.nameAt = row.updatedAt || 0;
    }
    const mark = bucket.days.get(row.day) || { day: row.day };
    if (row.game === 'word') mark.word = better(mark.word, row, 'word');
    else mark.quiz = better(mark.quiz, row, 'quiz');
    bucket.days.set(row.day, mark);
  });

  const clubDays = [...new Set(usable.map((row) => row.day))].sort();
  const draft: PlayerRadar[] = [...byPhone.entries()].map(([phone, bucket]) => {
    const days = [...bucket.days.values()].sort((a, b) => a.day.localeCompare(b.day));
    const words = days.map((day) => day.word).filter((row): row is GamePlay => Boolean(row));
    const quizzes = days.map((day) => day.quiz).filter((row): row is GamePlay => Boolean(row));
    const wordWins = words.filter((row) => row.status === 'won');
    const wordLosses = words.filter((row) => row.status === 'lost');
    const wordOpen = words.filter((row) => row.status === 'playing');
    const quizDone = quizzes.filter((row) => row.status === 'finished');
    const wordTimes = wordWins.map((row) => timed(row.durationMs)).filter((ms): ms is number => ms != null);
    const quizTimes = quizDone.map((row) => timed(row.durationMs)).filter((ms): ms is number => ms != null);
    const speedPool = [...wordTimes, ...quizTimes];
    const finishedDayList = days
      .filter((day) => day.word?.status === 'won' || day.word?.status === 'lost' || day.quiz?.status === 'finished')
      .map((day) => day.day);
    const bothDayList = days
      .filter((day) => (day.word?.status === 'won' || day.word?.status === 'lost') && day.quiz?.status === 'finished')
      .map((day) => day.day);
    const quizCorrect = quizDone.reduce((sum, row) => sum + (Number(row.score) || 0), 0);
    const quizRates = quizDone.length ? [quizCorrect / (quizDone.length * QUIZ_MAX)] : [];
    const wordRate = wordWins.length + wordLosses.length ? [wordWins.length / (wordWins.length + wordLosses.length)] : [];
    const accuracy = mean([...quizRates, ...wordRate]);
    const finishedSet = new Set(finishedDayList);

    return {
      phone,
      name: bucket.name || 'بدون اسم',
      staff: phone === STAFF_PHONE,
      wordWins: wordWins.length,
      wordLosses: wordLosses.length,
      wordOpen: wordOpen.length,
      wordFinished: wordWins.length + wordLosses.length,
      wordWinAttempts: wordWins.reduce((sum, row) => sum + (Number(row.attempts) || 0), 0),
      quizFinished: quizDone.length,
      quizCorrect,
      quizPossible: quizDone.length * QUIZ_MAX,
      quizPerfect: quizDone.filter((row) => (Number(row.score) || 0) >= QUIZ_MAX).length,
      finishedDays: finishedSet.size,
      startedDays: days.length,
      bothDays: bothDayList.length,
      playCount: wordWins.length + wordLosses.length + quizDone.length,
      solves: wordWins.length + quizDone.filter((row) => (Number(row.score) || 0) >= QUIZ_MAX).length,
      accuracy,
      avgSpeedMs: mean(speedPool),
      bestSpeedMs: speedPool.length ? Math.min(...speedPool) : null,
      speedSamples: speedPool.length,
      bestWordMs: wordTimes.length ? Math.min(...wordTimes) : null,
      avgWordMs: mean(wordTimes),
      bestQuizMs: quizTimes.length ? Math.min(...quizTimes) : null,
      avgQuizMs: mean(quizTimes),
      streak: streakOf(finishedDayList),
      absentDays: clubDays.filter((day) => !finishedSet.has(day)).length,
      axes: emptyAxes(),
      merit: 0,
      flags: [],
      qualifies: false,
      holdReasons: [],
      days,
      ranks: { play: null, correct: null, solves: null, speed: null, merit: null },
    };
  });

  const cohort = draft.some((player) => !player.staff) ? draft.filter((player) => !player.staff) : draft;
  const maxPlay = Math.max(0, ...cohort.map((player) => player.playCount));
  const maxCorrect = Math.max(0, ...cohort.map((player) => player.quizCorrect));
  const maxSolves = Math.max(0, ...cohort.map((player) => player.solves));
  const maxBoth = Math.max(0, ...cohort.map((player) => player.bothDays));
  const speeds = cohort.map((player) => player.avgSpeedMs).filter((ms): ms is number => ms != null);
  const fastest = speeds.length ? Math.min(...speeds) : null;
  const slowest = speeds.length ? Math.max(...speeds) : null;

  draft.forEach((player) => {
    const axes: Record<RadarAxisId, number | null> = {
      play: relative(player.playCount, maxPlay),
      correct: relative(player.quizCorrect, maxCorrect),
      solves: relative(player.solves, maxSolves),
      speed: speedScore(player.avgSpeedMs, fastest, slowest),
      accuracy: player.accuracy == null ? null : Math.round(player.accuracy * 100),
      both: relative(player.bothDays, maxBoth),
    };
    player.axes = axes;
    const weighted = RADAR_AXES.filter((axis) => axes[axis.id] != null);
    const weight = weighted.reduce((sum, axis) => sum + MERIT_WEIGHTS[axis.id], 0);
    player.merit = weight
      ? Math.round(weighted.reduce((sum, axis) => sum + (axes[axis.id] || 0) * MERIT_WEIGHTS[axis.id], 0) / weight)
      : 0;
    player.holdReasons = holdReasons(player);
    player.qualifies = player.holdReasons.length === 0;
    player.flags = flagsOf(player);
  });

  const playRace = places(cohort, (player) => player.playCount);
  const correctRace = places(cohort, (player) => player.quizCorrect);
  const solvesRace = places(cohort, (player) => player.solves);
  const speedRace = places(cohort, (player) => player.avgSpeedMs, true);
  const meritRace = places(cohort, (player) => player.merit);
  const playRanks = rankMap(playRace);
  const correctRanks = rankMap(correctRace);
  const solvesRanks = rankMap(solvesRace);
  const speedRanks = rankMap(speedRace);
  const meritRanks = rankMap(meritRace);
  draft.forEach((player) => {
    player.ranks = {
      play: playRanks.get(player.phone) || null,
      correct: correctRanks.get(player.phone) || null,
      solves: solvesRanks.get(player.phone) || null,
      speed: speedRanks.get(player.phone) || null,
      merit: meritRanks.get(player.phone) || null,
    };
  });

  const players = [...draft].sort(sortPlayers);
  const students = players.filter((player) => !player.staff);
  const medianSource = cohort.length ? cohort : players;
  const daysInRange = usable.map((row) => row.day);
  return {
    from: from || (daysInRange.length ? [...daysInRange].sort()[0] : ''),
    to: to || (daysInRange.length ? [...daysInRange].sort().at(-1) || '' : ''),
    clubDays,
    players,
    cohort,
    passed: students.filter((player) => player.qualifies).sort(sortPlayers),
    held: players.filter((player) => !player.qualifies).sort(sortPlayers),
    summary: {
      people: players.length,
      students: students.length,
      wordPlays: players.reduce((sum, player) => sum + player.wordFinished + player.wordOpen, 0),
      quizPlays: players.reduce((sum, player) => sum + player.quizFinished, 0),
      clubDayCount: clubDays.length,
      bothPeople: students.filter((player) => player.wordFinished > 0 && player.quizFinished > 0).length,
      wordOnly: students.filter((player) => player.wordFinished > 0 && player.quizFinished === 0).length,
      quizOnly: students.filter((player) => player.quizFinished > 0 && player.wordFinished === 0).length,
      totalCorrect: players.reduce((sum, player) => sum + player.quizCorrect, 0),
      totalWins: players.reduce((sum, player) => sum + player.wordWins, 0),
      totalPerfect: players.reduce((sum, player) => sum + player.quizPerfect, 0),
    },
    races: { play: playRace, correct: correctRace, solves: solvesRace, speed: speedRace },
    median: {
      play: median(medianSource.map((player) => player.axes.play || 0)),
      correct: median(medianSource.map((player) => player.axes.correct || 0)),
      solves: median(medianSource.map((player) => player.axes.solves || 0)),
      speed: median(medianSource.map((player) => player.axes.speed).filter((n): n is number => n != null)),
      accuracy: median(medianSource.map((player) => player.axes.accuracy).filter((n): n is number => n != null)),
      both: median(medianSource.map((player) => player.axes.both || 0)),
    },
  };
}

function sortPlayers(a: PlayerRadar, b: PlayerRadar) {
  if (a.staff !== b.staff) return a.staff ? 1 : -1;
  return b.merit - a.merit || b.playCount - a.playCount || a.name.localeCompare(b.name, 'ar');
}

function holdReasons(player: PlayerRadar) {
  const reasons: string[] = [];
  if (player.staff) reasons.push('حساب الإدارة خارج التكريم');
  if (player.finishedDays < MIN_FINISHED_DAYS) reasons.push(`أيامه المكتملة ${player.finishedDays} من ${MIN_FINISHED_DAYS}`);
  if (player.wordFinished < 1 || player.quizFinished < 1) reasons.push('ما غطى اللعبتين');
  if (player.accuracy != null && player.accuracy < MIN_ACCURACY) reasons.push(`دقته ${Math.round(player.accuracy * 100)}٪ وأقل من ٥٠٪`);
  return reasons;
}

function flagsOf(player: PlayerRadar) {
  const notes: string[] = [];
  if (player.wordOpen > 0) notes.push(`${player.wordOpen} يوم بدأ الكلمة وما أكمّلها`);
  if (player.speedSamples === 1) notes.push('السرعة من نتيجة واحدة');
  if (player.speedSamples === 0 && player.playCount > 0) notes.push('ما فيه زمن مسجّل');
  if (player.streak >= 3) notes.push(`حضر ${player.streak} أيام متتالية`);
  if (player.finishedDays > 0 && player.absentDays > player.finishedDays) notes.push(`غاب ${player.absentDays} يوم من أيام اللعب`);
  if (player.quizFinished >= 2 && player.quizPerfect === player.quizFinished) notes.push('إسعافه كامل في كل أيامه');
  if (player.wordFinished >= 2 && player.wordWins === player.wordFinished) notes.push('وصل للكلمة في كل يوم خلّصه');
  if (player.wordWins >= 2) {
    const avg = player.wordWinAttempts / player.wordWins;
    if (avg <= 3) notes.push(`متوسط وصوله ${avg.toFixed(1)} محاولة`);
    else if (avg >= 5) notes.push(`يوصل للكلمة متأخر، متوسط ${avg.toFixed(1)} محاولة`);
  }
  if (player.quizFinished >= 2 && player.quizPossible > 0 && player.quizCorrect / player.quizPossible < 0.5) {
    notes.push('أكثر من نصف إجابات الإسعاف خطأ');
  }
  return notes;
}

function streakOf(days: string[]) {
  const unique = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev = '';
  unique.forEach((day) => {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  });
  return best;
}

function median(nums: number[]) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
