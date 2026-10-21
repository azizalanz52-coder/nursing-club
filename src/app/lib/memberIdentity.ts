import { Firestore, collection, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { emailToPhone } from './authIdentity';
import {
  canonicalPhone,
  findCertificatesByLookup,
  normalizeUniversityId,
  universityIdVariants,
} from './certificatesLookup';
import { findUserDoc } from './memberAcceptance';
import { requireAuthUser } from './uploadFile';

export const UNIVERSITY_ID_KEY = 'userUniversityId';
export const PROFILE_LATER_KEY = 'nurs_profile_later';

export function readStoredUniversityId() {
  if (typeof window === 'undefined') return '';
  return normalizeUniversityId(localStorage.getItem(UNIVERSITY_ID_KEY) || '');
}

export function persistUniversityId(universityId: string) {
  const id = normalizeUniversityId(universityId);
  if (!id || typeof window === 'undefined') return;
  localStorage.setItem(UNIVERSITY_ID_KEY, id);
}

export function clearStoredUniversityId() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(UNIVERSITY_ID_KEY);
  sessionStorage.removeItem(PROFILE_LATER_KEY);
}

export function isValidUniversityId(value: unknown) {
  const id = normalizeUniversityId(value);
  if (!/^\d{6,12}$/.test(id)) return false;
  const phone = canonicalPhone(id);
  return !(phone.length === 10 && phone.startsWith('05'));
}

export async function resolveLinkedIdentity(
  db: Firestore,
  phoneValue?: string,
  universityIdValue?: string
) {
  let phone = canonicalPhone(String(phoneValue || ''));
  let universityId = normalizeUniversityId(universityIdValue);

  if (phone) {
    try {
      const user = await findUserDoc(db, phone);
      if (user?.id) phone = canonicalPhone(user.id) || canonicalPhone(String(user.data?.phone || '')) || phone;
      if (!universityId) universityId = normalizeUniversityId(user?.data?.universityId);
    } catch (err) {
      console.error(err);
    }
  }

  if (universityId && !phone) {
    try {
      for (const id of universityIdVariants(universityId)) {
        const appSnap = await getDocs(query(collection(db, 'applications'), where('universityId', '==', id)));
        const hit = appSnap.docs[0];
        if (!hit) continue;
        phone = canonicalPhone(String(hit.data()?.phone || ''));
        if (phone) break;
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (phone && !universityId) {
    const certs = await findCertificatesByLookup(db, phone);
    universityId = normalizeUniversityId(certs.find((cert) => cert.universityId)?.universityId);
  }

  if (universityId && !phone) {
    const certs = await findCertificatesByLookup(db, universityId);
    phone = canonicalPhone(String(certs.find((cert) => cert.phone)?.phone || ''));
  }

  return { phone, universityId };
}

export async function linkCertificatesToIdentity(db: Firestore, phone: string, universityId: string) {
  const nextPhone = canonicalPhone(phone);
  const nextUni = normalizeUniversityId(universityId);
  if (!nextPhone && !nextUni) return 0;

  const mapped = new Map<string, any>();
  for (const value of [nextPhone, nextUni].filter(Boolean)) {
    const found = await findCertificatesByLookup(db, value);
    found.forEach((cert) => mapped.set(cert.id, cert));
  }

  let updated = 0;
  for (const cert of mapped.values()) {
    const patch: Record<string, string> = {};
    if (nextPhone && !canonicalPhone(String(cert.phone || ''))) patch.phone = nextPhone;
    if (nextUni && !normalizeUniversityId(cert.universityId)) patch.universityId = nextUni;
    if (!Object.keys(patch).length) continue;

    for (const col of ['certificates', 'site_certificates'] as const) {
      const ref = doc(db, col, cert.id);
      try {
        await updateDoc(ref, patch);
        updated += 1;
      } catch (err) {
        try {
          await updateDoc(ref, { ...patch, image: '' });
          updated += 1;
        } catch (inner) {
          console.error(inner || err);
        }
      }
    }
  }

  return updated;
}

export async function saveUniversityIdAndLink(db: Firestore, universityId: string, phoneHint?: string) {
  const uni = normalizeUniversityId(universityId);
  if (!isValidUniversityId(uni)) {
    throw new Error('أدخل رقماً جامعياً صحيحاً من 6 إلى 12 خانة.');
  }

  const user = await requireAuthUser().catch(() => {
    throw new Error('سجّل الدخول ثم أدخل الرقم الجامعي لربط شهاداتك.');
  });
  const authPhone = canonicalPhone(emailToPhone(user.email)) || emailToPhone(user.email);
  const found = await findUserDoc(db, phoneHint || authPhone);
  const profileId = found?.id || authPhone;
  if (!profileId) {
    throw new Error('تعذر التعرف على حسابك. سجّل الدخول مرة أخرى.');
  }

  const payload = {
    universityId: uni,
    phone: profileId,
    identityLinkedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, 'users', profileId), payload, { merge: true });
  } catch (err) {
    if (profileId === authPhone) throw err;
    await setDoc(doc(db, 'users', authPhone), payload, { merge: true });
  }

  if (profileId !== authPhone) {
    try {
      await setDoc(doc(db, 'users', authPhone), { universityId: uni, identityLinkedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  }

  persistUniversityId(uni);
  await linkCertificatesToIdentity(db, canonicalPhone(profileId) || profileId, uni);
  return { phone: profileId, universityId: uni };
}

export async function repairCertificateIdentities(
  db: Firestore,
  certificates: Array<{ id: string; phone?: string; universityId?: string }>,
  people: Array<{ phone?: string; universityId?: string }>
) {
  const byUni = new Map<string, string>();
  const byPhone = new Map<string, string>();

  const remember = (phoneValue?: string, universityIdValue?: string) => {
    const phone = canonicalPhone(String(phoneValue || ''));
    const universityId = normalizeUniversityId(universityIdValue);
    if (universityId && phone && !byUni.has(universityId)) byUni.set(universityId, phone);
    if (phone && universityId && !byPhone.has(phone)) byPhone.set(phone, universityId);
  };

  people.forEach((person) => remember(person.phone, person.universityId));
  certificates.forEach((cert) => remember(cert.phone, cert.universityId));

  try {
    const apps = await getDocs(collection(db, 'applications'));
    apps.forEach((row) => remember(String(row.data()?.phone || ''), String(row.data()?.universityId || '')));
  } catch (err) {
    console.error(err);
  }

  let updated = 0;
  for (const cert of certificates) {
    if (!cert.id) continue;
    const phone = canonicalPhone(String(cert.phone || ''));
    const universityId = normalizeUniversityId(cert.universityId);
    const patch: Record<string, string> = {};
    if (!phone && universityId && byUni.get(universityId)) patch.phone = byUni.get(universityId)!;
    if (!universityId && phone && byPhone.get(phone)) patch.universityId = byPhone.get(phone)!;
    if (!Object.keys(patch).length) continue;

    for (const col of ['certificates', 'site_certificates'] as const) {
      try {
        await updateDoc(doc(db, col, cert.id), patch);
        updated += 1;
      } catch (err) {
        console.error(err);
      }
    }
  }

  return updated;
}
