import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export const COLLEGE_ADMIN_DOC = ['site_settings', 'college_administration'] as const;

export type CollegeOfficeTier = 'dean' | 'vice' | 'department' | 'secretariat';

export type CollegeOffice = {
  id: string;
  title: string;
  name: string;
  note: string;
  photo: string;
  profileUrl: string;
  tier: CollegeOfficeTier;
};

export type CollegePageCopy = {
  kicker: string;
  title: string;
  intro: string;
  vicesTitle: string;
  restTitle: string;
  clubTitle: string;
  clubBody: string;
  emptyName: string;
};

export type CollegeAdministration = {
  copy: CollegePageCopy;
  offices: CollegeOffice[];
};

export const DEFAULT_COLLEGE_COPY: CollegePageCopy = {
  kicker: 'جامعة حفر الباطن • كلية التمريض',
  title: 'إدارة كلية التمريض',
  intro:
    'نادي التمريض يعمل تحت مظلة الكلية، من مكتب العميد إلى سكرتارية العمادة. هذه الصفحة تضع الهيكل الإداري الرسمي أمام الزائر، حتى يُفهم النادي امتداداً للكلية لا نشاطاً منفصلاً عنها.',
  vicesTitle: 'وكلاء الكلية',
  restTitle: 'القسم الأكاديمي وأعمال العمادة',
  clubTitle: 'موقع النادي من هذا الهيكل',
  clubBody:
    'قيادة النادي الطلابية تدير العمل اليومي للجان، وهي مسؤولة أمام الكلية. الزائر يرى هنا الوجه الرسمي للكلية، ويرى في صفحة القادة الوجه الطلابي للنادي.',
  emptyName: 'يُستكمل الاسم من عمادة الكلية',
};

export const DEFAULT_COLLEGE_OFFICES: CollegeOffice[] = [
  {
    id: 'dean',
    title: 'عميد كلية التمريض',
    name: '',
    note: 'يرأس الكلية، ويشرف على توجهها الأكاديمي والإداري.',
    photo: '',
    profileUrl: '',
    tier: 'dean',
  },
  {
    id: 'vice-academic',
    title: 'وكيل الكلية للشؤون الأكاديمية والتعليمية',
    name: '',
    note: 'يتابع المسار التعليمي والجودة الأكاديمية للبرامج.',
    photo: '',
    profileUrl: '',
    tier: 'vice',
  },
  {
    id: 'vice-students',
    title: 'وكيل الكلية لشؤون الطلاب',
    name: '',
    note: 'يرعى شؤون الطلبة والأنشطة الطلابية داخل الكلية.',
    photo: '',
    profileUrl: '',
    tier: 'vice',
  },
  {
    id: 'vice-quality',
    title: 'وكيل الكلية للتطوير والجودة',
    name: '',
    note: 'يشرف على التطوير المستمر ومعايير الجودة.',
    photo: '',
    profileUrl: '',
    tier: 'vice',
  },
  {
    id: 'department',
    title: 'رئيس القسم الأكاديمي',
    name: '',
    note: 'يقود القسم العلمي ويربط الطلبة بالمسار الأكاديمي.',
    photo: '',
    profileUrl: '',
    tier: 'department',
  },
  {
    id: 'secretariat',
    title: 'سكرتارية عمادة الكلية',
    name: '',
    note: 'تنسّق أعمال العمادة والمراسلات الرسمية.',
    photo: '',
    profileUrl: '',
    tier: 'secretariat',
  },
];

export const COLLEGE_TIER_LABELS: Record<CollegeOfficeTier, string> = {
  dean: 'العميد',
  vice: 'وكيل',
  department: 'القسم الأكاديمي',
  secretariat: 'السكرتارية',
};

function officeDocId(id: string) {
  return `college_office_${id}`;
}

export function mergeCollegeCopy(incoming?: Partial<CollegePageCopy> | null): CollegePageCopy {
  return {
    ...DEFAULT_COLLEGE_COPY,
    ...incoming,
    kicker: incoming?.kicker?.trim() || DEFAULT_COLLEGE_COPY.kicker,
    title: incoming?.title?.trim() || DEFAULT_COLLEGE_COPY.title,
    intro: incoming?.intro?.trim() || DEFAULT_COLLEGE_COPY.intro,
    vicesTitle: incoming?.vicesTitle?.trim() || DEFAULT_COLLEGE_COPY.vicesTitle,
    restTitle: incoming?.restTitle?.trim() || DEFAULT_COLLEGE_COPY.restTitle,
    clubTitle: incoming?.clubTitle?.trim() || DEFAULT_COLLEGE_COPY.clubTitle,
    clubBody: incoming?.clubBody?.trim() || DEFAULT_COLLEGE_COPY.clubBody,
    emptyName: incoming?.emptyName?.trim() || DEFAULT_COLLEGE_COPY.emptyName,
  };
}

export function normalizeCollegeOffice(office: Partial<CollegeOffice>, fallback?: CollegeOffice): CollegeOffice {
  return {
    id: office.id || fallback?.id || `office-${Date.now()}`,
    title: office.title?.trim() || fallback?.title || 'منصب إداري',
    name: office.name ?? fallback?.name ?? '',
    note: office.note ?? fallback?.note ?? '',
    photo: office.photo ?? fallback?.photo ?? '',
    profileUrl: office.profileUrl ?? fallback?.profileUrl ?? '',
    tier: office.tier || fallback?.tier || 'vice',
  };
}

export function officeProfileHref(office: CollegeOffice) {
  const raw = office.profileUrl.trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(javascript|data|vbscript):/i.test(raw)) return '';
  return `https://${raw.replace(/^\/+/, '')}`;
}

export function mergeCollegeOffices(incoming?: CollegeOffice[] | null) {
  if (!incoming?.length) return DEFAULT_COLLEGE_OFFICES.map((office) => ({ ...office }));
  return incoming.map((office) =>
    normalizeCollegeOffice(office, DEFAULT_COLLEGE_OFFICES.find((item) => item.id === office.id))
  );
}

export function emptyCollegeAdministration(): CollegeAdministration {
  return {
    copy: { ...DEFAULT_COLLEGE_COPY },
    offices: DEFAULT_COLLEGE_OFFICES.map((office) => ({ ...office })),
  };
}

export async function loadCollegeAdministration(db: Firestore): Promise<CollegeAdministration> {
  try {
    const snap = await getDoc(doc(db, COLLEGE_ADMIN_DOC[0], COLLEGE_ADMIN_DOC[1]));
    if (!snap.exists()) return emptyCollegeAdministration();

    const data = snap.data() || {};
    const copy = mergeCollegeCopy(data.copy as Partial<CollegePageCopy> | undefined);
    const officeIds = Array.isArray(data.officeIds) ? (data.officeIds as string[]) : [];

    if (officeIds.length > 0) {
      const offices = (
        await Promise.all(
          officeIds.map(async (id) => {
            const officeSnap = await getDoc(doc(db, 'site_settings', officeDocId(id)));
            if (!officeSnap.exists()) return null;
            return normalizeCollegeOffice({ id, ...(officeSnap.data() as Partial<CollegeOffice>) });
          })
        )
      ).filter((office): office is CollegeOffice => Boolean(office));

      if (offices.length > 0) return { copy, offices };
    }

    return {
      copy,
      offices: mergeCollegeOffices((data.offices || []) as CollegeOffice[]),
    };
  } catch (err) {
    console.error(err);
    return emptyCollegeAdministration();
  }
}

export async function loadCollegeOffices(db: Firestore) {
  const { offices } = await loadCollegeAdministration(db);
  return offices;
}

export async function saveCollegeAdministration(db: Firestore, payload: CollegeAdministration) {
  const offices = payload.offices.map((office) => normalizeCollegeOffice(office));
  const previous = await getDoc(doc(db, COLLEGE_ADMIN_DOC[0], COLLEGE_ADMIN_DOC[1]));
  const previousIds = previous.exists()
    ? ((previous.data()?.officeIds as string[] | undefined) ||
        ((previous.data()?.offices as CollegeOffice[] | undefined)?.map((office) => office.id) ?? []))
    : [];

  await setDoc(
    doc(db, COLLEGE_ADMIN_DOC[0], COLLEGE_ADMIN_DOC[1]),
    {
      copy: mergeCollegeCopy(payload.copy),
      officeIds: offices.map((office) => office.id),
      updatedAt: Date.now(),
    },
    { merge: true }
  );

  await Promise.all(
    offices.map((office) => setDoc(doc(db, 'site_settings', officeDocId(office.id)), office, { merge: true }))
  );

  const removed = previousIds.filter((id) => !offices.some((office) => office.id === id));
  await Promise.all(removed.map((id) => deleteDoc(doc(db, 'site_settings', officeDocId(id))).catch(() => undefined)));
}

export function officeDisplayName(office: CollegeOffice, emptyName = DEFAULT_COLLEGE_COPY.emptyName) {
  return office.name.trim() || emptyName;
}

export function officesByTier(offices: CollegeOffice[], tier: CollegeOfficeTier | CollegeOfficeTier[]) {
  const tiers = Array.isArray(tier) ? tier : [tier];
  return offices.filter((office) => tiers.includes(office.tier));
}
