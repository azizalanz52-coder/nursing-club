const FALLBACK_ORIGIN = 'https://nursing-club.vercel.app';

function link(path: string) {
  const origin = typeof window === 'undefined' ? FALLBACK_ORIGIN : window.location.origin;
  return `${origin}${path}`;
}

function shareClock(ms?: number) {
  const sec = !ms || ms < 0 ? 0 : Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(sec / 60);
  const seconds = String(sec % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function quizShareText(score: number, durationMs?: number) {
  const mark = score >= 4 ? '✅' : '❌';
  return [
    '🚑 دقيقة إسعاف',
    '',
    `${mark} النتيجة: ${score}/4`,
    `⏱️ الوقت: ${shareClock(durationMs)}`,
    '',
    '👇 جربها',
    link('/games/quiz'),
  ].join('\n');
}

export function wordShareText(won: boolean, attempts: number, durationMs?: number) {
  return [
    '🎮 خمن كلمة اليوم',
    '',
    `${won ? '✅' : '❌'} النتيجة: ${attempts}/6`,
    `⏱️ الوقت: ${shareClock(durationMs)}`,
    '',
    '👇 جربها بدون ما نحرق الكلمة',
    link('/games/word'),
  ].join('\n');
}

export function caseShareText(score: number, max: number, durationMs?: number) {
  const mark = max > 0 && score >= max ? '✅' : '❌';
  return [
    '🩺 دراسة الحالة',
    '',
    `${mark} النتيجة: ${score}/${max}`,
    `⏱️ الوقت: ${shareClock(durationMs)}`,
    '',
    '👇 جربها',
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
