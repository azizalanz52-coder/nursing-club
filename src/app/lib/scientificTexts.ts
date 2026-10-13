export type ScientificTextStatus = 'pending' | 'approved' | 'rejected';

export function isApprovedScientificText(item?: { status?: string } | null) {
  const status = String(item?.status || 'approved');
  return status === 'approved';
}

export function isArchivedScientificText(item?: { archived?: boolean } | null) {
  return Boolean(item?.archived);
}

export function scientificArchiveTitle(item?: { archiveTitle?: string } | null) {
  const title = String(item?.archiveTitle || '').trim();
  return title || 'نصوص عامة';
}

export function groupTextsByArchiveTitle<T extends { archiveTitle?: string }>(texts: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of texts) {
    const key = scientificArchiveTitle(item);
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ar'));
}

export function existingArchiveTitles(texts: { archiveTitle?: string }[]) {
  return Array.from(new Set(texts.map((item) => scientificArchiveTitle(item)).filter((title) => title !== 'نصوص عامة')));
}

export function scientificStatusLabel(status?: string) {
  if (status === 'pending') return 'بانتظار تقييم الإدارة والرؤساء';
  if (status === 'rejected') return 'مرفوض — يحتاج تعديل';
  return 'معتمد وجاهز للتصميم';
}

export function formatScientificDate(value: unknown) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return new Date(value).toLocaleDateString('ar-SA');
  const parsed = Date.parse(String(value));
  if (!Number.isNaN(parsed)) return new Date(parsed).toLocaleDateString('ar-SA');
  return String(value);
}

export function scientificPdfUrl(item?: { pdfUrl?: string; fileUrl?: string; fileName?: string } | null) {
  if (!item) return '';
  if (item.pdfUrl) return item.pdfUrl;
  const file = String(item.fileUrl || '');
  const name = String(item.fileName || '').toLowerCase();
  if (!file) return '';
  if (name.endsWith('.pdf') || file.startsWith('data:application/pdf') || file.includes('.pdf')) {
    return file;
  }
  return '';
}
