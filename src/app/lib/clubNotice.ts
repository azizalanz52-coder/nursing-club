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

export function humanizeNotice(message: string) {
  const text = String(message || '');
  if (/longer than|1048487|exceeds the maximum/i.test(text) || (/fileUrl|property/i.test(text) && /longer/i.test(text))) {
    return 'ملف الشهادة كبير على الحفظ. صغّر الصورة ثم أعد المحاولة.';
  }
  if (/insufficient permissions|permission-denied|permission_denied/i.test(text)) {
    return 'تعذر حفظ الشهادة. سجّل الدخول مرة أخرى ثم أعد الرفع.';
  }
  return text;
}

export function inferNoticeKind(message: string): ClubNoticeKind {
  const text = humanizeNotice(message);
  if (/تعذر|خطأ|فشل|مرفوضة|غير صحيحة|كبير على الحفظ|صلاحية/.test(text)) return 'error';
  if (/لا يوجد|مكرر|مسبقا/.test(text)) return 'info';
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
  const text = stripDecor(humanizeNotice(message));

  if (kind === 'success') {
    const welcome = text.match(/يا\s+([^!]+)/);
    if (/مرحبا|أهلا/.test(text) && welcome?.[1]) {
      return { title: customTitle || `أهلاً ${welcome[1].trim()}`, detail: '' };
    }
    return { title: customTitle || pickActionTitle(text, false), detail: '' };
  }

  if (kind === 'error') {
    if (customTitle) return { title: customTitle, detail: /[\u0600-\u06FF]/.test(text) ? text.slice(0, 52) : '' };
    if (/[\u0600-\u06FF]/.test(text)) {
      return { title: (text.split(/[.!؟]/)[0] || text).slice(0, 52), detail: '' };
    }
    return { title: pickActionTitle(text, true), detail: '' };
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

  const short = (text.split(/[.!]/)[0] || text).slice(0, 48);
  if (customTitle && customTitle !== short) return { title: customTitle, detail: short };
  return { title: customTitle || short || 'تنبيه', detail: '' };
}

export function clubNotice(message: string, kind?: ClubNoticeKind, title?: string): Promise<boolean> {
  const text = humanizeNotice(String(message || ''));
  const req: ClubNoticeRequest = {
    message: text,
    kind: kind || inferNoticeKind(text),
    title,
  };
  if (handler) return handler(req);
  return Promise.resolve(true);
}

export function clubConfirm(message: string, title = 'تأكيد الإجراء'): Promise<boolean> {
  return clubNotice(message, 'confirm', title);
}
