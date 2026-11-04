import { Firestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { emailToPhone } from './authIdentity';
import { canonicalPhone, normalizeUniversityId } from './certificatesLookup';
import { findUserDoc, sameMemberPhone } from './memberAcceptance';
import {
  isValidUniversityId,
  persistUniversityId,
  readStoredUniversityId,
  saveUniversityIdAndLink,
} from './memberIdentity';
import { requireAuthUser } from './uploadFile';

export function readStoredProfileName() {
  if (typeof window === 'undefined') return '';
  return String(localStorage.getItem('userName') || localStorage.getItem('fullName') || '').trim();
}

export function persistProfileName(fullName: string) {
  if (typeof window === 'undefined') return;
  const name = String(fullName || '').trim();
  if (!name) return;
  localStorage.setItem('userName', name);
  localStorage.setItem('fullName', name);
}

export async function updateOwnName(db: Firestore, fullName: string) {
  const trimmed = String(fullName || '').trim();
  if (trimmed.length < 3) {
    throw new Error('أدخل الاسم الكامل بشكل صحيح.');
  }

  const user = await requireAuthUser().catch(() => {
    throw new Error('سجّل الدخول أولاً لتعديل بياناتك.');
  });
  const authPhone = canonicalPhone(emailToPhone(user.email)) || emailToPhone(user.email);
  const found = await findUserDoc(db, authPhone);
  const profileId = found?.id || authPhone;
  if (!profileId) {
    throw new Error('تعذر التعرف على حسابك. سجّل الدخول مرة أخرى.');
  }

  await updateDoc(doc(db, 'users', profileId), { fullName: trimmed });
  persistProfileName(trimmed);

  try {
    const snap = await getDocs(collection(db, 'case_study_submissions'));
    await Promise.all(
      snap.docs.map(async (row) => {
        const phone = String(row.data()?.phone || row.data()?.phoneNumber || '');
        if (!sameMemberPhone(phone, profileId) && phone !== profileId) return;
        await updateDoc(row.ref, { studentName: trimmed });
      })
    );
  } catch (err) {
    console.error(err);
  }

  return { phone: profileId, fullName: trimmed };
}

export async function updateOwnUniversityId(db: Firestore, universityId: string, phoneHint?: string) {
  const uni = normalizeUniversityId(universityId);
  if (!isValidUniversityId(uni)) {
    throw new Error('أدخل رقماً جامعياً صحيحاً من 6 إلى 12 خانة.');
  }
  return saveUniversityIdAndLink(db, uni, phoneHint);
}

export async function loadOwnProfileFields(db: Firestore, phoneHint?: string) {
  const storedName = readStoredProfileName();
  const storedUni = readStoredUniversityId();
  let phone = canonicalPhone(phoneHint || '') || '';
  let fullName = storedName;
  let universityId = storedUni;

  try {
    const user = await requireAuthUser().catch(() => null);
    if (user?.email) {
      phone = canonicalPhone(emailToPhone(user.email)) || emailToPhone(user.email) || phone;
    }
  } catch {
    /* ignore */
  }

  if (!phone && typeof window !== 'undefined') {
    phone = canonicalPhone(localStorage.getItem('userPhone') || localStorage.getItem('phone') || '') || '';
  }

  if (phone) {
    const found = await findUserDoc(db, phone);
    if (found?.data) {
      phone = found.id || phone;
      if (found.data.fullName) fullName = String(found.data.fullName);
      if (found.data.universityId) universityId = normalizeUniversityId(found.data.universityId);
    }
  }

  return { phone, fullName, universityId };
}
