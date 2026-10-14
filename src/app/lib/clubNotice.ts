export type ClubNoticeKind = 'success' | 'error' | 'info' | 'confirm';

export type ClubNoticeRequest = {
  message: string;
  kind: ClubNoticeKind;
  title?: string;
};

type NoticeHandler = (req: ClubNoticeRequest) => Promise<boolean>;

let handler: NoticeHandler | null = null;

export function bindClubNoticeHandler(next: NoticeHandler | null) {
  handler = next;
}

export function inferNoticeKind(message: string): ClubNoticeKind {
  const text = String(message || '');
  if (/تعذر|خطأ|فشل|مرفوضة|غير صحيحة|غير موجود/.test(text)) return 'error';
  if (/تم |بنجاح|نجاح|مرحبا/.test(text)) return 'success';
  return 'info';
}

function stripDecor(text: string) {
  return String(text || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}✨]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pickActionTitle(text: string, failed: boolean) {
  const prefix = failed ? 'تعذر' : 'تم';
  if (/رفع/.test(text)) return `${prefix} الرفع`;
  if (/حذف/.test(text)) return `${prefix} الحذف`;
  if (/حفظ|تحديث/.test(text)) return `${prefix} الحفظ`;
  if (/إرسال|ارسال/.test(text)) return `${prefix} الإرسال`;
  if (/نشر/.test(text)) return `${prefix} النشر`;
  if (/قبول/.test(text)) return `${prefix} القبول`;
  if (/أرشف/.test(text)) return `${prefix} الأرشفة`;
  if (/دخول/.test(text)) return failed ? 'تعذر الدخول' : 'تم الدخول';
  return failed ? 'تعذر' : 'تم';
}

export function compactNotice(message: string, kind: ClubNoticeKind, customTitle?: string) {
  const text = stripDecor(message);

  if (kind === 'success') {
    const welcome = text.match(/يا\s+([^!]+)/);
    if (/مرحبا|أهلا/.test(text) && welcome?.[1]) {
      return { title: customTitle || `أهلاً ${welcome[1].trim()}`, detail: '' };
    }
    return { title: customTitle || pickActionTitle(text, false), detail: '' };
  }

  if (kind === 'error') {
    return { title: customTitle || pickActionTitle(text, true), detail: '' };
  }

  if (kind === 'confirm') {
    const detail = text
      .replace(/^هل أنت متأكد من\s*/u, '')
      .replace(/^هل أنت متأكد\s*/u, '')
      .replace(/نهائياً\s*/g, '')
      .replace(/\s*من حساب المستفيد ومن سجل النادي\s*/g, ' ')
      .replace(/\s*هذا التقرير منفصل عن ملفات الوورد والإكسل\.?/g, '')
      .trim()
      .replace(/[؟?]*$/, '؟');
    return { title: customTitle || 'تأكيد', detail };
  }

  const detail = (customTitle ? text : text.split(/[.!]/)[0] || text).slice(0, 42);
  return { title: customTitle || 'تنبيه', detail };
}

export function clubNotice(message: string, kind?: ClubNoticeKind, title?: string): Promise<boolean> {
  const req: ClubNoticeRequest = {
    message: String(message || ''),
    kind: kind || inferNoticeKind(String(message || '')),
    title,
  };
  if (handler) return handler(req);
  return Promise.resolve(true);
}

export function clubConfirm(message: string, title = 'تأكيد الإجراء'): Promise<boolean> {
  return clubNotice(message, 'confirm', title);
}
