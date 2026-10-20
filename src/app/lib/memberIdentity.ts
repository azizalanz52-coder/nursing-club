import { Firestore, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
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
      try {
        const ref = doc(db, col, cert.id);
        const snap = await getDoc(ref);
        if (!snap.exists()) continue;
        await updateDoc(ref, patch);
        updated += 1;
      } catch (err) {
        console.error(err);
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
