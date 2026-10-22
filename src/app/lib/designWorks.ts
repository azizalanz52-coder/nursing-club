import { Firestore, addDoc, collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { canonicalPhone } from './certificatesLookup';

export const DESIGN_WORKS_COL = 'design_committee_works';
export const DESIGN_STORAGE_FOLDER = 'design_works';

export const DESIGN_KINDS = [
  'بوستر فعالية',
  'ستوري / سناب',
  'بنر',
  'مطوية / شهادة',
  'أخرى',
] as const;

export type DesignWork = {
  id: string;
  eventTitle: string;
  kind: string;
  title: string;
  files: string[];
  fileUrl: string;
  addedBy: string;
  addedByPhone: string;
  source: string;
  uploaderRole: string;
  timestamp: number;
  createdAt: string;
};

export function designFileUrls(item: any): string[] {
  const fromFiles = Array.isArray(item?.files) ? item.files.filter(Boolean) : [];
  const extras = [item?.fileUrl, item?.imageUrl, item?.url].filter(Boolean);
  return Array.from(new Set([...fromFiles, ...extras]));
}

export function isDesignPdf(src: string) {
  const value = String(src || '').toLowerCase();
  return value.startsWith('data:application/pdf') || value.includes('.pdf');
}

export function groupDesignWorksByEvent(works: DesignWork[]) {
  const groups = new Map<string, DesignWork[]>();
  for (const work of works) {
    const key = String(work.eventTitle || '').trim() || 'بدون فعالية';
    const list = groups.get(key) || [];
    list.push(work);
    groups.set(key, list);
  }
  return Array.from(groups.entries()).sort((a, b) => {
    const aTime = Math.max(...a[1].map((item) => Number(item.timestamp || 0)));
    const bTime = Math.max(...b[1].map((item) => Number(item.timestamp || 0)));
    return bTime - aTime;
  });
}

export function uniqueDesignEvents(works: { eventTitle?: string }[]) {
  return new Set(works.map((item) => String(item.eventTitle || '').trim()).filter(Boolean)).size;
}

export type DesignContributor = {
  key: string;
  name: string;
  phone: string;
  works: DesignWork[];
};

export function groupEventContributors(items: DesignWork[]): DesignContributor[] {
  const map = new Map<string, DesignContributor>();
  for (const work of items) {
    const phone = canonicalPhone(work.addedByPhone);
    const name = String(work.addedBy || '').trim() || 'عضو لجنة التصميم';
    const key = phone || name;
    const current = map.get(key) || { key, name, phone, works: [] };
    if (name && current.name === 'عضو لجنة التصميم') current.name = name;
    current.works.push(work);
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => b.works.length - a.works.length || a.name.localeCompare(b.name, 'ar'));
}

export function designWorkCountLabel(count: number) {
  if (count === 1) return 'عمل واحد';
  if (count === 2) return 'عملان';
  return `${count} أعمال`;
}

export function designParticipantCountLabel(count: number) {
  if (count === 1) return 'مشارك واحد';
  if (count === 2) return 'مشاركان';
  return `${count} مشاركين`;
}

export async function saveDesignWork(
  db: Firestore,
  opts: {
    eventTitle: string;
    kind: string;
    title?: string;
    urls: string[];
    addedBy: string;
    addedByPhone: string;
    source: string;
    uploaderRole: string;
  }
) {
  const urls = opts.urls.filter(Boolean);
  if (urls.length === 0) {
    throw new Error('لا توجد ملفات صالحة للحفظ. أعد اختيار التصميم ثم ارفع.');
  }
  const eventTitle = opts.eventTitle.trim();
  if (!eventTitle) {
    throw new Error('اكتب اسم الفعالية أولاً.');
  }
  await addDoc(collection(db, DESIGN_WORKS_COL), {
    eventTitle,
    kind: opts.kind,
    title: String(opts.title || '').trim() || eventTitle,
    files: urls,
    fileUrl: urls[0],
    imageUrl: urls[0],
    addedBy: opts.addedBy.trim() || 'عضو لجنة التصميم',
    addedByPhone: canonicalPhone(opts.addedByPhone),
    uploadedBy: opts.addedBy.trim() || 'عضو لجنة التصميم',
    source: opts.source,
    uploaderRole: opts.uploaderRole,
    committee: 'لجنة التصميم',
    timestamp: Date.now(),
    createdAt: new Date().toLocaleDateString('ar-SA'),
  });
}

export async function deleteDesignWork(db: Firestore, id: string) {
  await deleteDoc(doc(db, DESIGN_WORKS_COL, id));
}

export function subscribeDesignWorks(db: Firestore, onData: (items: DesignWork[]) => void) {
  return onSnapshot(
    collection(db, DESIGN_WORKS_COL),
    (snap) => {
      const items = snap.docs
        .map((row) => {
          const data = row.data();
          const files = designFileUrls({ id: row.id, ...data });
          return {
            id: row.id,
            eventTitle: String(data.eventTitle || '').trim() || 'بدون فعالية',
            kind: String(data.kind || 'أخرى'),
            title: String(data.title || data.eventTitle || ''),
            files,
            fileUrl: files[0] || '',
            addedBy: String(data.addedBy || data.uploadedBy || 'عضو لجنة التصميم'),
            addedByPhone: String(data.addedByPhone || ''),
            source: String(data.source || ''),
            uploaderRole: String(data.uploaderRole || 'عضو لجنة'),
            timestamp: Number(data.timestamp || 0),
            createdAt: String(data.createdAt || ''),
          } satisfies DesignWork;
        })
        .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
      onData(items);
    },
    (err) => console.error(err)
  );
}
