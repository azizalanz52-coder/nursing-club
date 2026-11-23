import { collection, deleteDoc, doc, getDoc, getDocs, query, runTransaction, where, type DocumentReference } from 'firebase/firestore';
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

export const GAME_ROUND_MS = 3 * 60 * 1000;

export function formatPlayTime(ms?: number) {
  if (!ms || ms < 0) return '—';
  const sec = Math.max(1, Math.round(ms / 1000));
  if (sec < 60) return `${sec} ث`;
  const minutes = Math.floor(sec / 60);
  return `${minutes} د ${sec % 60} ث`;
}

export function roundClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function roundLeft(startedAt?: number, now = Date.now()) {
  if (!startedAt) return GAME_ROUND_MS;
  return Math.max(0, GAME_ROUND_MS - (now - startedAt));
}

export function rankPlays(rows: GamePlay[], game: GameId) {
  const byPhone = new Map<string, GamePlay>();
  for (const row of rows) {
    if (row.game !== game) continue;
    const key = canonicalPhone(row.phone) || row.id;
    const prev = byPhone.get(key);
    if (!prev || (row.updatedAt || 0) >= (prev.updatedAt || 0)) byPhone.set(key, row);
  }
  const time = (row: GamePlay) => (row.durationMs && row.durationMs > 0 ? row.durationMs : Number.MAX_SAFE_INTEGER);
  const group = (row: GamePlay) => {
    if (game === 'word') {
      if (row.status === 'won') return 0;
      if (row.status === 'lost') return 1;
      return 2;
    }
    return row.status === 'finished' ? 0 : 1;
  };
  return [...byPhone.values()].sort((a, b) => {
    const order = group(a) - group(b);
    if (order) return order;
    if (game === 'quiz' && a.status === 'finished') return b.score - a.score || time(a) - time(b);
    if (game === 'word' && a.status === 'won') return a.attempts - b.attempts || time(a) - time(b);
    return time(a) - time(b);
  });
}

async function signedInUser() {
  if (auth.currentUser) return auth.currentUser;
  await auth.authStateReady().catch(() => undefined);
  return auth.currentUser;
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

function cappedDuration(startedAt: number, now = Date.now()) {
  return Math.min(GAME_ROUND_MS, Math.max(0, now - startedAt));
}

export async function recordGamePlay(input: Omit<GamePlay, 'id' | 'updatedAt' | 'day'> & { day?: string }) {
  const user = await signedInUser();
  if (!user) return false;
  const day = input.day || riyadhDateKey();
  const ref = await playRef(input.game, input.phone, day);
  let saved = false;
  await runTransaction(db, async (tx) => {
    const prev = await tx.get(ref);
    if (prev.exists()) {
      saved = true;
      return;
    }
    tx.set(ref, {
      game: input.game,
      phone: input.phone,
      name: input.name || input.phone,
      day,
      status: input.status,
      attempts: input.attempts,
      score: input.score,
      durationMs: input.durationMs ? Math.min(GAME_ROUND_MS, input.durationMs) : null,
      updatedAt: Date.now(),
    });
    saved = true;
  });
  return saved;
}

export async function beginRound(game: GameId, phone: string, name: string): Promise<AttemptGate<GamePlay>> {
  const user = await signedInUser();
  if (!user) return { ok: false };
  const day = riyadhDateKey();
  const now = Date.now();
  if (game === 'word') {
    const assignSnap = await getDoc(doc(db, 'word_assignments', `${phone}_${day}`));
    const activitySnap = await getDoc(doc(db, 'game_activity', `word_${phone}_${day}`));
    const sealed = activitySnap.exists() && wordSealed((activitySnap.data() as GamePlay).status);
    if (!sealed && !(typeof assignSnap.data()?.word === 'string' && assignSnap.data()?.word)) {
      await assignPersonalWord(phone);
    }
  }
  const ref = await playRef(game, phone, day);
  const assignRef = doc(db, 'word_assignments', `${phone}_${day}`);
  let saved: GamePlay | null = null;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const assign = game === 'word' ? await tx.get(assignRef) : null;
    const prev = snap.exists() ? snap.data() as GamePlay : null;
    const sealed = game === 'word' ? wordSealed(prev?.status) : prev?.status === 'finished';
    if (prev && sealed) {
      saved = playFrom(ref, prev as unknown as Record<string, unknown>);
      return;
    }
    const startedAt = Number(prev?.startedAt) || now;
    const row = {
      game,
      phone,
      name: name || prev?.name || phone,
      day,
      status: 'playing' as const,
      attempts: prev?.attempts || 0,
      score: prev?.score || 0,
      step: prev?.step || 0,
      startedAt,
      durationMs: null,
      updatedAt: now,
    };
    tx.set(ref, row, { merge: true });
    if (assign && !Number(assign.data()?.startedAt)) tx.set(assignRef, { phone, day, startedAt }, { merge: true });
    saved = { id: ref.id, ...row, durationMs: undefined };
  });
  return saved ? { ok: true, play: saved } : { ok: false };
}

export async function sealRound(game: GameId, phone: string, name: string): Promise<AttemptGate<GamePlay>> {
  const user = await signedInUser();
  if (!user) return { ok: false };
  const day = riyadhDateKey();
  const ref = await playRef(game, phone, day);
  const assignRef = doc(db, 'word_assignments', `${phone}_${day}`);
  const now = Date.now();
  let saved: GamePlay | null = null;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists() ? snap.data() as GamePlay : null;
    const sealed = game === 'word' ? wordSealed(prev?.status) : prev?.status === 'finished';
    if (prev && sealed) {
      saved = playFrom(ref, prev as unknown as Record<string, unknown>);
      return;
    }
    let attempts = prev?.attempts || 0;
    if (game === 'word') {
      const assign = await tx.get(assignRef);
      const guesses = Array.isArray(assign.data()?.guesses) ? assign.data()?.guesses as unknown[] : [];
      attempts = guesses.length || attempts;
    }
    const row = {
      game,
      phone,
      name: name || prev?.name || phone,
      day,
      status: (game === 'word' ? 'lost' : 'finished') as GameStatus,
      attempts,
      score: prev?.score || 0,
      step: prev?.step || 0,
      startedAt: Number(prev?.startedAt) || now - GAME_ROUND_MS,
      durationMs: GAME_ROUND_MS,
      updatedAt: now,
    };
    tx.set(ref, row, { merge: true });
    saved = { id: ref.id, ...row };
  });
  return saved ? { ok: true, play: saved } : { ok: false };
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
    const now = Date.now();
    const startedAt = Number(prev?.startedAt) || now;
    if (now - startedAt > GAME_ROUND_MS + 2000) {
      const row = {
        game: 'quiz' as const,
        phone: input.phone,
        name: input.name || input.phone,
        day,
        status: 'finished' as const,
        attempts: input.total,
        score: Number(prev?.score) || 0,
        step: Number(prev?.step) || 0,
        startedAt,
        durationMs: GAME_ROUND_MS,
        updatedAt: now,
      };
      tx.set(ref, row, { merge: true });
      saved = { id: ref.id, ...row, applied: false };
      return;
    }
    const next = applyQuizAnswer(prev, { step: input.step, correct: input.correct, now, total: input.total });
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
      durationMs: next.durationMs == null ? prev?.durationMs ?? null : Math.min(GAME_ROUND_MS, next.durationMs),
      updatedAt: now,
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
    const startedAt = Number(assignSnap.data()?.startedAt) || Number(prev?.startedAt) || Date.now();
    const elapsed = Date.now() - startedAt;
    if (elapsed > GAME_ROUND_MS + 2000) {
      tx.set(activityRef, {
        game: 'word',
        phone,
        name: name || phone,
        day,
        status: 'lost',
        attempts: stored.length,
        score: 0,
        durationMs: GAME_ROUND_MS,
        startedAt,
        updatedAt: Date.now(),
      }, { merge: true });
      saved = { word, guesses: stored, status: 'lost', durationMs: GAME_ROUND_MS, applied: false };
      return;
    }
    const durationMs = next.status === 'playing' ? undefined : cappedDuration(startedAt);
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
