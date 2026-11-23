const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

export const DAILY_WORDS = [
  'إسعاف', 'ضمادة', 'عيادة', 'صيدلة', 'حرارة', 'إغماء', 'تضميد', 'وقاية', 'مناعة', 'شريان',
  'غثيان', 'إسهال', 'كمامة', 'تطعيم', 'فيروس', 'إنعاش', 'طوارئ', 'نظافة', 'عناية', 'ممرضة',
  'جراحة', 'تخدير', 'عملية', 'مثانة', 'صفائح', 'كريات', 'طفيلي', 'سرطان', 'تشخيص', 'صيدلي',
  'طبيبة', 'مريضة', 'إمساك', 'مرارة', 'خياطة', 'جبيرة', 'سماعة', 'ميزان', 'محرار', 'تحليل',
  'تصوير', 'منظار', 'قسطرة', 'فصيلة', 'سيولة', 'وراثة', 'جينات', 'ولادة', 'رضاعة', 'تسنين',
  'ألياف', 'أملاح', 'معادن', 'تغذية', 'سعرات', 'ترطيب', 'إجهاد', 'نفسية', 'سباحة', 'أمعاء',
  'قولون', 'زائدة', 'درقية', 'غضروف', 'حنجرة', 'أسنان', 'تنفسي', 'وريدي', 'موضعي', 'تأهيل',
  'تعافي', 'نقاهة', 'طبيعي', 'تدليك', 'لاصقة', 'تأثير', 'جانبي', 'علامة', 'تعقيم', 'هرمون',
] as const;

export type LetterMark = 'correct' | 'present' | 'absent';

export function riyadhDayIndex(now = Date.now()) {
  return Math.floor((now + RIYADH_OFFSET_MS) / 86_400_000);
}

export function riyadhDateKey(now = Date.now()) {
  const local = new Date(now + RIYADH_OFFSET_MS);
  const month = String(local.getUTCMonth() + 1).padStart(2, '0');
  const day = String(local.getUTCDate()).padStart(2, '0');
  return `${local.getUTCFullYear()}-${month}-${day}`;
}

export function msUntilNextWord(now = Date.now()) {
  const local = now + RIYADH_OFFSET_MS;
  const next = (Math.floor(local / 86_400_000) + 1) * 86_400_000;
  return next - local;
}

export function wordLetters(word: string) {
  return word
    .normalize('NFC')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي');
}

export function todayWord(now = Date.now()) {
  return DAILY_WORDS[riyadhDayIndex(now) % DAILY_WORDS.length];
}

export function scoreGuess(guess: string, answer: string): LetterMark[] {
  const g = [...wordLetters(guess)];
  const a = [...wordLetters(answer)];
  const marks: LetterMark[] = Array(g.length).fill('absent');
  const leftover = new Map<string, number>();
  g.forEach((letter, index) => {
    if (letter === a[index]) marks[index] = 'correct';
    else leftover.set(a[index], (leftover.get(a[index]) || 0) + 1);
  });
  g.forEach((letter, index) => {
    if (marks[index] === 'correct') return;
    const count = leftover.get(letter) || 0;
    if (count > 0) {
      marks[index] = 'present';
      leftover.set(letter, count - 1);
    }
  });
  return marks;
}
