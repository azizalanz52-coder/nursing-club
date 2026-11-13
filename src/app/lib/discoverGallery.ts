import { Firestore, addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';

export const DISCOVER_GALLERY_FILES_COL = 'discover_gallery_files';

export type GalleryReviewStatus = 'pending' | 'approved' | 'rejected';

export type DiscoverGalleryFile = {
  id: string;
  eventId: string;
  eventTitle: string;
  url: string;
  kind: 'image' | 'video';
  uploaderName: string;
  uploaderPhone: string;
  createdAt: number;
  status: GalleryReviewStatus;
};

export function isDiscoverGalleryVideo(url: string) {
  const value = String(url || '');
  return value.startsWith('data:video') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(value);
}

export function mapDiscoverGalleryFile(id: string, data: Record<string, any>): DiscoverGalleryFile {
  const url = String(data.url || '');
  const status: GalleryReviewStatus = data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending';
  return {
    id,
    eventId: String(data.eventId || ''),
    eventTitle: String(data.eventTitle || ''),
    url,
    kind: data.kind === 'video' || isDiscoverGalleryVideo(url) ? 'video' : 'image',
    uploaderName: String(data.uploaderName || 'عضو'),
    uploaderPhone: String(data.uploaderPhone || ''),
    createdAt: Number(data.createdAt) || 0,
    status,
  };
}

export function galleryStatusLabel(status: GalleryReviewStatus) {
  if (status === 'approved') return 'معتمدة';
  if (status === 'rejected') return 'مرفوضة';
  return 'بانتظار الاعتماد';
}

export function baseEventPhotoCount(images?: string[]) {
  return (images || []).filter((img) => img && img !== '/logo.png' && img !== '/header-banner.png').length;
}

export function filesForEvent(files: DiscoverGalleryFile[], eventId: string) {
  return files.filter((file) => file.eventId === eventId && file.url);
}

export function occupyingGalleryFiles(files: DiscoverGalleryFile[], eventId: string) {
  return filesForEvent(files, eventId).filter((file) => file.status !== 'rejected');
}

export function countEventGalleryPhotos(images: string[] | undefined, files: DiscoverGalleryFile[], eventId: string) {
  return baseEventPhotoCount(images) + occupyingGalleryFiles(files, eventId).length;
}

export function eventGalleryUrls(images: string[] | undefined, files: DiscoverGalleryFile[], eventId: string, eventTitle = '') {
  const base = (images || []).filter((img) => img && img !== '/logo.png' && img !== '/header-banner.png');
  const title = eventTitle.trim();
  const extra = files
    .filter((file) => file.url && file.status === 'approved' && (file.eventId === eventId || (title && file.eventTitle === title)))
    .map((file) => file.url);
  return Array.from(new Set([...base, ...extra]));
}

export function visibleGalleryAlbums<T extends { id: string; title: string; category?: string; description?: string; images?: string[] }>(
  discoverEvents: T[],
  clubEvents: Array<{ id: string; title: string; description?: string; date?: string; poster?: string }>,
  files: DiscoverGalleryFile[]
) {
  const extras = clubEvents
    .filter((event) => event.title && eventGalleryUrls([], files, event.id, event.title).length > 0)
    .filter((event) => !discoverEvents.some((item) => item.id === event.id || item.title === event.title))
    .map((event) => ({
      id: event.id,
      title: event.title,
      category: 'فعالية',
      description: event.description || event.date || '',
      images: event.poster && event.poster !== '/header-banner.png' && event.poster !== '/logo.png' ? [event.poster] : [],
    }));
  return [...discoverEvents, ...extras];
}

export type GalleryUploaderSummary = {
  phone: string;
  name: string;
  count: number;
  events: Array<{ title: string; count: number }>;
};

export function summarizeGalleryUploaders(files: DiscoverGalleryFile[]): GalleryUploaderSummary[] {
  const people = new Map<string, GalleryUploaderSummary & { eventMap: Map<string, number> }>();
  for (const file of files) {
    if (!file.url) continue;
    const phone = file.uploaderPhone || `name:${file.uploaderName}`;
    const row = people.get(phone) || {
      phone: file.uploaderPhone,
      name: file.uploaderName || 'عضو',
      count: 0,
      events: [],
      eventMap: new Map<string, number>(),
    };
    row.count += 1;
    if (file.uploaderName) row.name = file.uploaderName;
    const title = file.eventTitle || 'فعالية';
    row.eventMap.set(title, (row.eventMap.get(title) || 0) + 1);
    people.set(phone, row);
  }
  return Array.from(people.values())
    .map((row) => ({
      phone: row.phone,
      name: row.name,
      count: row.count,
      events: Array.from(row.eventMap.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'ar')),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'));
}

export function subscribeDiscoverGalleryFiles(
  db: Firestore,
  onData: (files: DiscoverGalleryFile[]) => void
) {
  return onSnapshot(
    collection(db, DISCOVER_GALLERY_FILES_COL),
    (snap) => {
      const rows = snap.docs
        .map((row) => mapDiscoverGalleryFile(row.id, row.data() as Record<string, any>))
        .sort((a, b) => b.createdAt - a.createdAt);
      onData(rows);
    },
    (err) => {
      console.error(err);
    }
  );
}

export async function saveDiscoverGalleryFile(
  db: Firestore,
  file: Omit<DiscoverGalleryFile, 'id' | 'status'> & { status?: GalleryReviewStatus }
) {
  const ref = await addDoc(collection(db, DISCOVER_GALLERY_FILES_COL), {
    ...file,
    status: file.status || 'pending',
  });
  return ref.id;
}

export async function setDiscoverGalleryFileStatus(
  db: Firestore,
  id: string,
  status: GalleryReviewStatus
) {
  await updateDoc(doc(db, DISCOVER_GALLERY_FILES_COL, id), { status });
}
