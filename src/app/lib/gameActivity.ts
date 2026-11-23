import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { riyadhDateKey } from './dailyWord';

export type GameId = 'word' | 'quiz';
export type GameStatus = 'playing' | 'won' | 'lost' | 'finished';

export type GamePlay = {
  id: string;
  game: GameId;
  phone: string;
  name: string;
  day: string;
  status: GameStatus;
  attempts: number;
  score: number;
  durationMs?: number;
  updatedAt: number;
};

export function formatPlayTime(ms?: number) {
  if (!ms || ms < 0) return '—';
  const sec = Math.max(1, Math.round(ms / 1000));
  if (sec < 60) return `${sec} ث`;
  const minutes = Math.floor(sec / 60);
  return `${minutes} د ${sec % 60} ث`;
}

export function rankPlays(rows: GamePlay[], game: GameId) {
  const list = rows.filter((row) => row.game === game);
  const time = (row: GamePlay) => row.durationMs || Number.MAX_SAFE_INTEGER;
  if (game === 'word') {
    return list
      .filter((row) => row.status === 'won')
      .sort((a, b) => a.attempts - b.attempts || time(a) - time(b));
  }
  return list
    .filter((row) => row.status === 'finished')
    .sort((a, b) => b.score - a.score || time(a) - time(b));
}

export async function recordGamePlay(input: Omit<GamePlay, 'id' | 'updatedAt' | 'day'> & { day?: string }) {
  const day = input.day || riyadhDateKey();
  const id = `${input.game}_${input.phone}_${day}`;
  const ref = doc(db, 'game_activity', id);
  const prevSnap = await getDoc(ref);
  const prev = prevSnap.exists() ? (prevSnap.data() as GamePlay) : null;
  if (prev?.status === 'won' && input.status !== 'won') return;
  if (prev?.status === 'finished' && input.game === 'quiz') {
    const betterScore = input.score > prev.score;
    const fasterTie = input.score === prev.score && (input.durationMs || Number.MAX_SAFE_INTEGER) < (prev.durationMs || Number.MAX_SAFE_INTEGER);
    if (!betterScore && !fasterTie) return;
  }
  await setDoc(ref, {
    game: input.game,
    phone: input.phone,
    name: input.name || input.phone,
    day,
    status: input.status,
    attempts: input.attempts,
    score: input.score,
    durationMs: input.durationMs || null,
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function loadGamePlays(day: string) {
  const snap = await getDocs(query(collection(db, 'game_activity'), where('day', '==', day)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as GamePlay);
}
