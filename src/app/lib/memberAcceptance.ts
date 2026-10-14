import { Firestore, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { canonicalPhone, normalizeUniversityId, phoneVariants, universityIdVariants } from './certificatesLookup';

export type MemberAcceptance = {
  fullName: string;
  universityId: string;
  phone: string;
  status: 'مقبول' | 'مرفوض' | 'معلق';
  acceptedCommittee: string;
  whatsappLink: string;
};

export function sameMemberPhone(a?: string | null, b?: string | null) {
  const left = canonicalPhone(String(a || ''));
  const right = canonicalPhone(String(b || ''));
  return Boolean(left && right && left === right);
}

export function isAcceptedStatus(status?: string | null) {
  return String(status || '').includes('مقبول');
}

export function isRejectedStatus(status?: string | null) {
  return String(status || '').includes('مرفوض');
}

export function committeeIdFromName(name: string) {
  const value = String(name || '');
  if (value.includes('تصميم')) return 'design';
  if (value.includes('إعلام') || value.includes('الاعلام') || value.includes('الإعلام')) return 'media';
  if (value.includes('فعاليات') || value.includes('تنظيم')) return 'events-org';
  if (value.includes('الموارد') || value.includes('بشري')) return 'hr';
  if (value.includes('العلاقات')) return 'pr';
  if (value.includes('العلمي') || value.includes('علمي')) return 'scientific';
  if (value.includes('الجودة') || value.includes('جودة')) return 'quality';
  return '';
}

function rankApp(app: Record<string, unknown>) {
  if (isAcceptedStatus(String(app.status || '')) || String(app.acceptedCommittee || '').trim()) return 3;
  if (isRejectedStatus(String(app.status || ''))) return 1;
  return 2;
}

export async function findUserDoc(db: Firestore, phone: string) {
  const variants = phoneVariants(phone);
  const canonical = canonicalPhone(phone) || String(phone || '').trim();
  const ordered = Array.from(new Set([canonical, ...variants].filter(Boolean)));
  let fallback: { id: string; data: Record<string, unknown> } | null = null;
  for (const id of ordered) {
    const snap = await getDoc(doc(db, 'users', id));
    if (!snap.exists()) continue;
    const data = snap.data();
    const hasProfile = Boolean(data.assignedCommittee || data.committee || data.role || data.fullName);
    if (hasProfile) return { id: snap.id, data };
    if (!fallback) fallback = { id: snap.id, data };
  }
  return fallback;
}

export async function stampMemberAcceptance(
  db: Firestore,
  phone: string,
  fields: Record<string, unknown>
) {
  const found = await findUserDoc(db, phone);
  const id = found?.id || canonicalPhone(phone) || String(phone || '').trim();
  if (!id) return;
  await setDoc(doc(db, 'users', id), fields, { merge: true });
}

export async function resolveMemberAcceptance(
  db: Firestore,
  phone: string,
  userData?: Record<string, unknown> | null
): Promise<MemberAcceptance | null> {
  const lookupPhone = canonicalPhone(phone) || String(phone || '').trim();
  if (!lookupPhone && !userData) return null;

  const universityId = normalizeUniversityId(String(userData?.universityId || ''));
  const univSet = new Set(universityId ? universityIdVariants(universityId) : []);
  const apps: Record<string, unknown>[] = [];

  try {
    const snap = await getDocs(collection(db, 'applications'));
    snap.forEach((row) => {
      const data = row.data();
      const phoneMatch = sameMemberPhone(String(data.phone || ''), lookupPhone);
      const appUniv = normalizeUniversityId(String(data.universityId || ''));
      const univMatch = Boolean(appUniv && univSet.has(appUniv));
      if (phoneMatch || univMatch) {
        apps.push({ id: row.id, ...data });
      }
    });
  } catch (err) {
    console.error(err);
  }

  apps.sort((a, b) => rankApp(b) - rankApp(a));
  const best = apps[0] || null;
  const assigned = String(userData?.assignedCommittee || userData?.committee || '').trim();
  const appCommittee = String(best?.acceptedCommittee || best?.committee || '').trim();
  const committee = assigned || appCommittee;
  const appStatus = String(best?.status || '');

  let status: MemberAcceptance['status'] = 'معلق';
  if (committee || isAcceptedStatus(appStatus)) status = 'مقبول';
  else if (isRejectedStatus(appStatus)) status = 'مرفوض';

  if (!best && !userData && status === 'معلق') return null;

  return {
    fullName: String(best?.fullName || userData?.fullName || ''),
    universityId: String(best?.universityId || userData?.universityId || ''),
    phone: String(best?.phone || lookupPhone),
    status,
    acceptedCommittee: committee,
    whatsappLink: String(best?.whatsappLink || userData?.whatsappLink || ''),
  };
}
