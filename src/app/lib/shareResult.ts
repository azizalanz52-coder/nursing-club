import { formatPlayTime } from './gameActivity';

const FALLBACK_ORIGIN = 'https://nursing-club.vercel.app';

function link(path: string) {
  const origin = typeof window === 'undefined' ? FALLBACK_ORIGIN : window.location.origin;
  return `${origin}${path}`;
}

function who(name: string) {
  const clean = name.trim();
  return clean || 'لاعب';
}

function during(ms?: number) {
  if (!ms || ms < 0) return '';
  return ` خلال ${formatPlayTime(ms)}`;
}

export function quizShareText(name: string, score: number, durationMs?: number) {
  return [
    'دقيقة إسعاف — نادي التمريض',
    `${who(name)}: ${score} من 4${during(durationMs)}`,
    link('/games/quiz'),
  ].join('\n');
}

export function wordShareText(name: string, won: boolean, attempts: number, durationMs?: number) {
  const line = won
    ? `${who(name)}: وصل للكلمة من المحاولة ${attempts}${during(durationMs)}`
    : `${who(name)}: انتهت المحاولات الست`;
  return ['تحدي الكلمة — نادي التمريض', line, link('/games/word')].join('\n');
}

export function caseShareText(name: string, score: number, max: number, durationMs?: number) {
  return [
    'دراسة الحالة — نادي التمريض',
    `${who(name)}: ${score} من ${max}${during(durationMs)}`,
    link('/case-study'),
  ].join('\n');
}

export async function shareResultText(text: string) {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text });
      return 'shared' as const;
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return 'cancelled' as const;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied' as const;
  } catch {
    return 'failed' as const;
  }
}
