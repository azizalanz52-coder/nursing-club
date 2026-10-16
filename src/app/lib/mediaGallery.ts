import { Firestore, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

export const MEDIA_GALLERY_COL = 'media_committee_gallery';
export const MEDIA_LEGACY_COL = 'media_committee_uploads';
export const MEDIA_STORAGE_FOLDER = 'media_gallery';

export const MEDIA_CATEGORIES = [
  'تغطيات مرئية وفيديوهات',
  'صور فوتوغرافية',
  'موشن غرافيك',
] as const;

export function mediaFileUrls(item: any): string[] {
  const fromFiles = Array.isArray(item?.files) ? item.files.filter(Boolean) : [];
  const extras = [item?.mediaUrl, item?.imageUrl, item?.fileUrl, item?.url].filter(Boolean);
  return Array.from(new Set([...fromFiles, ...extras]));
}

export function isMediaVideo(src: string, item?: any) {
  if (item?.mediaType === 'video') return true;
  const value = String(src || '').toLowerCase();
  return (
    value.startsWith('data:video') ||
    value.includes('.mp4') ||
    value.includes('.mov') ||
    value.includes('.webm') ||
    value.includes('video')
  );
}

export function buildMediaRecord(opts: {
  title: string;
  category: string;
  urls: string[];
  isVideo: boolean;
  addedBy: string;
  source: string;
  uploaderRole: string;
}) {
  const primary = opts.urls[0] || '';
  return {
    title: opts.title.trim(),
    category: opts.category,
    files: opts.urls,
    mediaUrl: primary,
    imageUrl: primary,
    mediaType: opts.isVideo ? 'video' : 'image',
    createdAt: new Date().toLocaleDateString('ar-SA'),
    timestamp: Date.now(),
    addedBy: opts.addedBy,
    uploadedBy: opts.addedBy,
    uploaderRole: opts.uploaderRole,
    committee: 'لجنة الإعلام',
    source: opts.source,
    status: 'معتمد',
  };
}

export function mediaOriginLabel(item: any): string {
  const blob = `${item?.source || ''} ${item?.uploaderRole || ''} ${item?.addedBy || ''}`;
  if (blob.includes('أدمن') || blob.includes('الادمن')) return 'الأدمن';
  if (blob.includes('قائد') || blob.includes('لوحة اللجنة') || blob.includes('لوحة قادة')) return 'قادة الإعلام';
  if (blob.includes('عضو') || blob.includes('صفحة الأعضاء') || blob.includes('بوابة')) return 'بوابة الأعضاء';
  return 'لجنة الإعلام';
}

export async function deleteMediaRecord(db: Firestore, item: { id: string; _col?: string }) {
  const primary = item._col || MEDIA_GALLERY_COL;
  await deleteDoc(doc(db, primary, item.id));
  const other = primary === MEDIA_GALLERY_COL ? MEDIA_LEGACY_COL : MEDIA_GALLERY_COL;
  try {
    await deleteDoc(doc(db, other, item.id));
  } catch {
    // twin document may not exist
  }
}

export function subscribeMediaGallery(db: Firestore, onData: (items: any[]) => void) {
  let gallery: any[] = [];
  let uploads: any[] = [];

  const emit = () => {
    const seen = new Set(gallery.map((item) => item.id));
    const merged = [...gallery, ...uploads.filter((item) => !seen.has(item.id))];
    merged.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
    onData(merged);
  };

  const unsubGallery = onSnapshot(
    collection(db, MEDIA_GALLERY_COL),
    (snap) => {
      gallery = snap.docs.map((d) => ({ id: d.id, ...d.data(), _col: MEDIA_GALLERY_COL }));
      emit();
    },
    (err) => console.error(err)
  );

  const unsubUploads = onSnapshot(
    collection(db, MEDIA_LEGACY_COL),
    (snap) => {
      uploads = snap.docs.map((d) => ({ id: d.id, ...d.data(), _col: MEDIA_LEGACY_COL }));
      emit();
    },
    () => emit()
  );

  return () => {
    unsubGallery();
    unsubUploads();
  };
}
