import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, setDoc, where, type DocumentReference } from 'firebase/firestore';
import { auth, db } from './firebase';
import { canonicalPhone } from './certificatesLookup';
import { riyadhDateKey } from './dailyWord';
import { assignPersonalWord } from './personalWord';
import { applyQuizAnswer, applyWordGuess, wordSealed } from './gameAttempt';

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
  step?: number;
  startedAt?: number;
  updatedAt: number;
};

export type AttemptGate<T> = { ok: false } | { ok: true; play: T };

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
      .filter((row) => row.status === 'won' || row.status === 'lost')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'won' ? -1 : 1;
        return a.attempts - b.attempts || time(a) - time(b);
      });
  }
  return list
    .filter((row) => row.status === 'finished')
    .sort((a, b) => b.score - a.score || time(a) - time(b));
}

function signedInUser() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<typeof auth.currentUser>((resolve) => {
    const stop = onAuthStateChanged(auth, (user) => {
      stop();
      resolve(user);
    });
  });
}

async function playRef(game: GameId, phone: string, day: string) {
  const canonicalId = `${game}_${phone}_${day}`;
  const direct = doc(db, 'game_activity', canonicalId);
  const directSnap = await getDoc(direct);
  if (directSnap.exists()) return direct;
  const snap = await getDocs(query(collection(db, 'game_activity'), where('day', '==', day)));
  const found = snap.docs.find((item) => item.data().game === game && canonicalPhone(String(item.data().phone || '')) === phone);
  return found ? found.ref : direct;
}

function playFrom(ref: DocumentReference, data: Record<string, unknown> | undefined): GamePlay | null {
  if (!data) return null;
  return { id: ref.id, ...data } as GamePlay;
}

export async function recordGamePlay(input: Omit<GamePlay, 'id' | 'updatedAt' | 'day'> & { day?: string }) {
  const user = await signedInUser();
  if (!user) return;
  const day = input.day || riyadhDateKey();
  const ref = await playRef(input.game, input.phone, day);
  await runTransaction(db, async (tx) => {
    const prev = await tx.get(ref);
    if (prev.exists()) return;
    tx.set(ref, {
      game: input.game,
      phone: input.phone,
      name: input.name || input.phone,
      day,
      status: input.status,
      attempts: input.attempts,
      score: input.score,
      durationMs: input.durationMs || null,
      updatedAt: Date.now(),
    });
  });
}

export async function loadMyPlay(game: GameId, phone: string): Promise<AttemptGate<GamePlay | null>> {
  const user = await signedInUser();
  if (!user) return { ok: false };
  const day = riyadhDateKey();
  const ref = await playRef(game, phone, day);
  const snap = await getDoc(ref);
  return { ok: true, play: snap.exists() ? playFrom(ref, snap.data()) : null };
}

export async function answerQuiz(input: { phone: string; name: string; step: number; correct: boolean; total: number }): Promise<AttemptGate<GamePlay & { applied: boolean }>> {
  const user = await signedInUser();
  if (!user) return { ok: false };
  const day = riyadhDateKey();
  const ref = await playRef('quiz', input.phone, day);
  let saved: (GamePlay & { applied: boolean }) | null = null;
  await runTransaction(db, async (tx) => {
    const prevSnap = await tx.get(ref);
    const prev = prevSnap.exists() ? prevSnap.data() as GamePlay : null;
    const next = applyQuizAnswer(prev, { step: input.step, correct: input.correct, now: Date.now(), total: input.total });
    if (!next.applied && prev) {
      const current = playFrom(ref, prev as unknown as Record<string, unknown>);
      if (current) saved = { ...current, applied: false };
      return;
    }
    const row = {
      game: 'quiz' as const,
      phone: input.phone,
      name: input.name || input.phone,
      day,
      status: next.status,
      attempts: input.total,
      score: next.score,
      step: next.step,
      startedAt: next.startedAt,
      durationMs: next.durationMs ?? prev?.durationMs ?? null,
      updatedAt: Date.now(),
    };
    tx.set(ref, row, { merge: true });
    saved = { id: ref.id, ...row, durationMs: row.durationMs || undefined, applied: true };
  });
  return saved ? { ok: true, play: saved } : { ok: false };
}

export type WordAttempt = {
  word: string;
  guesses: string[];
  status: GamePlay['status'] | null;
  durationMs?: number;
  attempts?: number;
  updatedAt?: number;
};

export async function loadWordAttempt(phone: string): Promise<AttemptGate<WordAttempt>> {
  const user = await signedInUser();
  if (!user) return { ok: false };
  const day = riyadhDateKey();
  const assignSnap = await getDoc(doc(db, 'word_assignments', `${phone}_${day}`));
  const guesses = Array.isArray(assignSnap.data()?.guesses)
    ? (assignSnap.data()?.guesses as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, 6)
    : [];
  const ref = await playRef('word', phone, day);
  const activity = await getDoc(ref);
  const row = activity.exists() ? activity.data() as GamePlay : null;
  let word = typeof assignSnap.data()?.word === 'string' ? assignSnap.data()?.word as string : '';
  if (!word && !wordSealed(row?.status)) word = await assignPersonalWord(phone);
  return {
    ok: true,
    play: { word, guesses, status: row?.status || null, durationMs: row?.durationMs, attempts: row?.attempts, updatedAt: row?.updatedAt },
  };
}

export async function commitWordGuess(phone: string, name: string, guess: string): Promise<AttemptGate<WordAttempt & { applied: boolean }>> {
  const user = await signedInUser();
  if (!user) return { ok: false };
  const day = riyadhDateKey();
  const word = await assignPersonalWord(phone);
  const assignRef = doc(db, 'word_assignments', `${phone}_${day}`);
  const activityRef = await playRef('word', phone, day);
  let saved: (WordAttempt & { applied: boolean }) | null = null;
  await runTransaction(db, async (tx) => {
    const assignSnap = await tx.get(assignRef);
    const activitySnap = await tx.get(activityRef);
    const stored = Array.isArray(assignSnap.data()?.guesses)
      ? (assignSnap.data()?.guesses as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, 6)
      : [];
    const prev = activitySnap.exists() ? activitySnap.data() as GamePlay : null;
    if (prev && wordSealed(prev.status)) {
      saved = { word, guesses: stored.length ? stored : [], status: prev.status, durationMs: prev.durationMs, applied: false };
      return;
    }
    const next = applyWordGuess(word, stored, guess);
    if (!next.applied) {
      saved = { word, guesses: stored, status: next.status, durationMs: prev?.durationMs, applied: false };
      return;
    }
    const startedAt = Number(assignSnap.data()?.startedAt) || Date.now();
    const durationMs = next.status === 'playing' ? undefined : Math.max(0, Date.now() - startedAt);
    tx.set(assignRef, { phone, day, word, guesses: next.guesses, startedAt }, { merge: true });
    tx.set(activityRef, {
      game: 'word',
      phone,
      name: name || phone,
      day,
      status: next.status,
      attempts: next.guesses.length,
      score: next.status === 'won' ? 1 : 0,
      durationMs: durationMs ?? null,
      updatedAt: Date.now(),
    }, { merge: true });
    saved = { word, guesses: next.guesses, status: next.status, durationMs, applied: true };
  });
  return saved ? { ok: true, play: saved } : { ok: false };
}

export async function deleteGamePlay(id: string) {
  await deleteDoc(doc(db, 'game_activity', id));
}

export async function loadGamePlays(day: string) {
  const snap = await getDocs(query(collection(db, 'game_activity'), where('day', '==', day)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as GamePlay);
}

export async function loadAllGamePlays() {
  const snap = await getDocs(collection(db, 'game_activity'));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }) as GamePlay);
}
