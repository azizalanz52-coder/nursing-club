'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { isAdminPhone, normalizePhone, phoneToEmail } from './authIdentity';
import { findUserDoc } from './memberAcceptance';

function authErrorMessage(err: any) {
  const code = String(err?.code || '');
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'كلمة المرور غير صحيحة أو الحساب غير موجود.';
  }
  if (code.includes('email-already-in-use')) {
    return 'رقم الجوال مسجل مسبقاً. قم بتسجيل الدخول مباشرة.';
  }
  if (code.includes('weak-password')) {
    return 'يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.';
  }
  if (code.includes('operation-not-allowed')) {
    return 'تفعيل الدخول بالبريد غير مفتوح في Firebase. افتح Authentication ثم Email/Password.';
  }
  return err?.message || 'تعذر إتمام العملية. حاول مرة أخرى.';
}

async function persistSession(phone: string, fullName?: string) {
  localStorage.setItem('userPhone', phone);
  if (fullName) localStorage.setItem('userName', fullName);
  sessionStorage.removeItem('adminToken');
}

async function stripLegacyPassword(phone: string) {
  try {
    await updateDoc(doc(db, 'users', phone), {
      password: deleteField(),
      authMigrated: true,
    });
  } catch (err) {
    console.error(err);
  }
}

async function bootstrapAdmin(phone: string, password: string) {
  const res = await fetch('/api/auth/bootstrap-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'تعذر تجهيز حساب المشرف.');
  }
}

export async function loginWithPhonePassword(phone: string, password: string) {
  const cleanPhone = normalizePhone(phone);
  const email = phoneToEmail(cleanPhone);

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    if (isAdminPhone(cleanPhone)) {
      await bootstrapAdmin(cleanPhone, password);
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      const foundLegacy = await findUserDoc(db, cleanPhone);
      const legacyPassword = String(foundLegacy?.data?.password || '');
      if (!foundLegacy) {
        throw new Error('رقم الجوال غير مسجل في النظام. يمكنك إنشاء حساب جديد.');
      }
      if (!legacyPassword) {
        throw new Error('هذا الرقم لم يكمل إنشاء الحساب بعد. استخدم إنشاء حساب جديد.');
      }
      if (legacyPassword !== password) {
        throw new Error('كلمة المرور غير صحيحة.');
      }
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (createErr: any) {
        if (String(createErr?.code || '').includes('email-already-in-use')) {
          throw new Error('كلمة المرور غير صحيحة.');
        }
        throw new Error(authErrorMessage(createErr));
      }
      await stripLegacyPassword(foundLegacy.id);
    }
  }

  const found = await findUserDoc(db, cleanPhone);
  const profileId = found?.id || cleanPhone;
  const profile = found?.data;
  if (profile?.password) {
    await stripLegacyPassword(profileId);
  }
  await persistSession(profileId, String(profile?.fullName || (isAdminPhone(cleanPhone) ? 'عبدالعزيز العنزي (المشرف العام)' : 'مستخدم مسجل')));
  try {
    await setDoc(doc(db, 'users', profileId), { authMigrated: true }, { merge: true });
  } catch (err) {
    console.error(err);
  }
  return { phone: profileId, fullName: String(profile?.fullName || '') };
}

export async function registerWithPhonePassword(payload: {
  phone: string;
  password: string;
  fullName: string;
}) {
  const cleanPhone = normalizePhone(payload.phone);
  const fullName = payload.fullName.trim();
  const password = payload.password;
  const email = phoneToEmail(cleanPhone);

  if (isAdminPhone(cleanPhone)) {
    throw new Error('هذا الرقم محجوز لإدارة النادي. استخدم تسجيل الدخول.');
  }
  if (password.length < 6) {
    throw new Error('يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.');
  }

  const existingSnap = await getDoc(doc(db, 'users', cleanPhone));
  const existing = existingSnap.data();
  if (existing?.password) {
    throw new Error('رقم الجوال مسجل مسبقاً بكلمة مرور. قم بتسجيل الدخول مباشرة.');
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    if (String(err?.code || '').includes('email-already-in-use')) {
      throw new Error('رقم الجوال مسجل مسبقاً. قم بتسجيل الدخول مباشرة.');
    }
    throw new Error(authErrorMessage(err));
  }

  await setDoc(
    doc(db, 'users', cleanPhone),
    {
      ...(existing || {}),
      fullName,
      phone: cleanPhone,
      role: existing?.role || 'عضو أساسي',
      createdAt: existing?.createdAt || new Date().toISOString(),
      authMigrated: true,
      password: deleteField(),
    },
    { merge: true }
  );

  await persistSession(cleanPhone, fullName);
  return { phone: cleanPhone, fullName, claimed: existingSnap.exists() };
}

export async function logoutSession() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error(err);
  }
  localStorage.removeItem('userPhone');
  localStorage.removeItem('userName');
  sessionStorage.removeItem('adminToken');
}
