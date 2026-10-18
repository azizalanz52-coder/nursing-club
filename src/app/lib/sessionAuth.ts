'use client';

import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { deleteField, doc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { isAdminPhone, normalizePhone, phoneToEmail } from './authIdentity';
import { canonicalPhone, phoneVariants } from './certificatesLookup';
import { findUserDoc } from './memberAcceptance';
import { findUserDocsByPhone, isIncompleteUserAccount } from './userAccounts';

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

function phoneAuthCandidates(phone: string) {
  const raw = normalizePhone(phone);
  const canonical = canonicalPhone(raw);
  return Array.from(new Set([raw, canonical, ...phoneVariants(raw)].filter(Boolean)));
}

function isAuthMiss(err: any) {
  const code = String(err?.code || '');
  return (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found')
  );
}

function isEmailTaken(err: any) {
  return String(err?.code || '').includes('email-already-in-use');
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

async function signInAuthWithVariants(phone: string, password: string) {
  let lastErr: any = null;
  for (const candidate of phoneAuthCandidates(phone)) {
    try {
      await signInWithEmailAndPassword(auth, phoneToEmail(candidate), password);
      return candidate;
    } catch (err: any) {
      lastErr = err;
      if (!isAuthMiss(err) && !isEmailTaken(err)) throw err;
    }
  }
  throw lastErr || new Error('تعذر تسجيل الدخول.');
}

async function createAuthWithVariants(phone: string, password: string) {
  let lastErr: any = null;
  for (const candidate of phoneAuthCandidates(phone)) {
    try {
      await createUserWithEmailAndPassword(auth, phoneToEmail(candidate), password);
      return candidate;
    } catch (err: any) {
      lastErr = err;
      if (!isEmailTaken(err) && !isAuthMiss(err)) throw err;
    }
  }
  throw lastErr || new Error('تعذر إنشاء الحساب.');
}

async function finishLogin(profileId: string, profile?: Record<string, any> | null) {
  const fullName = String(
    profile?.fullName || (isAdminPhone(profileId) ? 'عبدالعزيز العنزي (المشرف العام)' : 'مستخدم مسجل')
  );
  await persistSession(profileId, fullName);
  const signedIn = Boolean(auth.currentUser);
  try {
    await setDoc(
      doc(db, 'users', profileId),
      signedIn
        ? { authMigrated: true, lastActive: Date.now() }
        : { lastActive: Date.now() },
      { merge: true }
    );
  } catch (err) {
    console.error(err);
  }
  if (signedIn && profile?.password) {
    await stripLegacyPassword(profileId);
  }
  return { phone: profileId, fullName };
}

export async function loginWithPhonePassword(phone: string, password: string) {
  const cleanPhone = normalizePhone(phone);

  try {
    await signInAuthWithVariants(cleanPhone, password);
  } catch (err: any) {
    if (isAdminPhone(cleanPhone)) {
      await bootstrapAdmin(cleanPhone, password);
      await signInWithEmailAndPassword(auth, phoneToEmail(cleanPhone), password);
    } else {
      const phoneDocs = await findUserDocsByPhone(db, cleanPhone);
      const foundLegacy = await findUserDoc(db, cleanPhone);
      if (!foundLegacy && phoneDocs.length === 0) {
        throw new Error('رقم الجوال غير مسجل في النظام. يمكنك إنشاء حساب جديد.');
      }

      const profile = foundLegacy || phoneDocs[0];
      if (profile && isIncompleteUserAccount(profile.data)) {
        throw new Error('هذا الرقم لم يكمل إنشاء الحساب بعد. استخدم إنشاء حساب جديد.');
      }

      throw new Error('كلمة المرور غير صحيحة.');
    }
  }

  const found = await findUserDoc(db, cleanPhone);
  const profileId = found?.id || canonicalPhone(cleanPhone) || cleanPhone;
  return finishLogin(profileId, found?.data);
}

export async function registerWithPhonePassword(payload: {
  phone: string;
  password: string;
  fullName: string;
}) {
  const cleanPhone = normalizePhone(payload.phone);
  const fullName = payload.fullName.trim();
  const password = payload.password;

  if (isAdminPhone(cleanPhone)) {
    throw new Error('هذا الرقم محجوز لإدارة النادي. استخدم تسجيل الدخول.');
  }
  if (password.length < 6) {
    throw new Error('يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.');
  }

  const existingFound = await findUserDoc(db, cleanPhone);
  const existing = existingFound?.data;
  const profileId = existingFound?.id || canonicalPhone(cleanPhone) || cleanPhone;

  if (existing && !isIncompleteUserAccount(existing)) {
    throw new Error('رقم الجوال مسجل مسبقاً. سجّلي الدخول، وإذا نسيتِ كلمة المرور اطلبي إعادة تعيينها من الإدارة.');
  }

  try {
    await createAuthWithVariants(profileId, password);
  } catch (err: any) {
    if (isEmailTaken(err)) {
      try {
        await signInAuthWithVariants(profileId, password);
      } catch {
        throw new Error('رقم الجوال مسجل مسبقاً. سجّلي الدخول أو اطلبي من الإدارة إعادة تعيين كلمة المرور.');
      }
    } else {
      throw new Error(authErrorMessage(err));
    }
  }

  await setDoc(
    doc(db, 'users', profileId),
    {
      ...(existing || {}),
      fullName,
      phone: profileId,
      role: existing?.role || 'عضو أساسي',
      createdAt: existing?.createdAt || new Date().toISOString(),
      authMigrated: Boolean(auth.currentUser),
      lastActive: Date.now(),
      password: deleteField(),
    },
    { merge: true }
  );

  await persistSession(profileId, fullName);
  return { phone: profileId, fullName, claimed: Boolean(existingFound) };
}

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('سجّل الدخول مرة أخرى ثم أعد المحاولة.');
  }
  if (newPassword.length < 6) {
    throw new Error('يجب أن تكون كلمة المرور الجديدة 6 أحرف أو أرقام على الأقل.');
  }
  try {
    const cred = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPassword);
  } catch (err: any) {
    throw new Error(authErrorMessage(err));
  }
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
