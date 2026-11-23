import { wordLetters } from './dailyWord';

export function quizSealed(status?: string) {
  return status === 'finished';
}

export function wordSealed(status?: string) {
  return status === 'won' || status === 'lost';
}

export function applyQuizAnswer(
  prev: { status?: string; step?: number; score?: number; startedAt?: number } | null,
  input: { step: number; correct: boolean; now: number; total: number },
) {
  const step = Number(prev?.step) || 0;
  const score = Number(prev?.score) || 0;
  const startedAt = Number(prev?.startedAt) || input.now;
  if (prev && quizSealed(prev.status)) {
    return { applied: false, status: 'finished' as const, step, score, startedAt };
  }
  if (prev && input.step !== step) {
    return { applied: false, status: 'playing' as const, step, score, startedAt };
  }
  const nextStep = step + 1;
  const done = nextStep >= input.total;
  return {
    applied: true,
    status: done ? 'finished' as const : 'playing' as const,
    step: nextStep,
    score: score + (input.correct ? 1 : 0),
    startedAt,
    durationMs: done ? Math.max(0, input.now - startedAt) : undefined,
  };
}

export function applyWordGuess(word: string, guesses: string[], guess: string) {
  const same = (value: string) => wordLetters(value) === wordLetters(word);
  const solved = guesses.some(same);
  if (solved || guesses.length >= 6) {
    return {
      applied: false,
      guesses,
      status: solved ? 'won' as const : 'lost' as const,
    };
  }
  if ([...wordLetters(guess)].length !== 5) {
    return { applied: false, guesses, status: 'playing' as const };
  }
  const next = [...guesses, guess];
  const nowSolved = next.some(same);
  return {
    applied: true,
    guesses: next,
    status: nowSolved ? 'won' as const : next.length >= 6 ? 'lost' as const : 'playing' as const,
  };
}
