import { Firestore, collection, deleteField, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { canonicalPhone, phoneVariants } from './certificatesLookup';

function isLeadershipAccount(phone: string, role?: string) {
  const value = String(role || '');
  return (
    phone === '0553731265' ||
    value === 'System Admin' ||
    value === 'General Supervisor' ||
    value.includes('رئيس النادي') ||
    value.includes('رئيسة النادي') ||
    value.includes('نائب رئيس') ||
    value.includes('نائبة رئيس') ||
    value.includes('نائبة الرئيس')
  );
}

export function isIncompleteUserAccount(data?: {
  password?: string;
  authMigrated?: boolean;
  lastActive?: number | string;
} | null) {
  if (!data) return true;
  if (data.authMigrated) return false;
  if (String(data.password || '').trim()) return false;
  if (data.lastActive) return false;
  return true;
}

export async function notifyExistingUser(
  db: Firestore,
  phone: string,
  fields: Record<string, unknown>
) {
  const clean = String(phone || '').trim();
  if (!clean) return false;
  const ref = doc(db, 'users', clean);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  await updateDoc(ref, fields);
  return true;
}

export async function notifyLeadership(db: Firestore, message: string) {
  await notifyExistingUser(db, '0553731265', { latestNotification: message });
  try {
    const snap = await getDocs(collection(db, 'users'));
    for (const item of snap.docs) {
      if (isLeadershipAccount(item.id, item.data()?.role)) {
        await notifyExistingUser(db, item.id, { latestNotification: message });
      }
    }
  } catch (err) {
    console.error(err);
  }
}

export async function notifyCommitteeByKeyword(db: Firestore, keyword: string, message: string) {
  const snap = await getDocs(collection(db, 'users'));
  for (const item of snap.docs) {
    const assigned = String(item.data()?.assignedCommittee || item.data()?.committee || '');
    if (assigned.includes(keyword)) {
      await notifyExistingUser(db, item.id, { latestNotification: message });
    }
  }
}

export async function findUserDocsByPhone(db: Firestore, phone: string) {
  const clean = String(phone || '').trim();
  const ids = Array.from(new Set([clean, canonicalPhone(clean), ...phoneVariants(clean)].filter(Boolean)));
  const docs: { id: string; data: Record<string, any> }[] = [];
  for (const id of ids) {
    const snap = await getDoc(doc(db, 'users', id));
    if (snap.exists()) docs.push({ id: snap.id, data: snap.data() });
  }
  return docs;
}

export function omitPassword<T extends Record<string, any>>(data: T) {
  const { password: _password, ...safe } = data;
  return safe as Omit<T, 'password'>;
}

export async function stripPasswordFields(db: Firestore, phone: string) {
  const clean = String(phone || '').trim();
  const ids = Array.from(new Set([clean, canonicalPhone(clean), ...phoneVariants(clean)].filter(Boolean)));
  let updated = 0;
  for (const id of ids) {
    const ref = doc(db, 'users', id);
    const snap = await getDoc(ref);
    if (!snap.exists() || !Object.prototype.hasOwnProperty.call(snap.data() || {}, 'password')) continue;
    await updateDoc(ref, {
      password: deleteField(),
      authMigrated: true,
      passwordResetAt: new Date().toISOString(),
    });
    updated += 1;
  }
  return updated;
}

export async function purgeAllStoredPasswords(db: Firestore) {
  const snap = await getDocs(collection(db, 'users'));
  let updated = 0;
  for (const row of snap.docs) {
    if (!Object.prototype.hasOwnProperty.call(row.data() || {}, 'password')) continue;
    await updateDoc(row.ref, {
      password: deleteField(),
      authMigrated: true,
    });
    updated += 1;
  }
  return updated;
}

export async function setUserPasswordOnPhone(db: Firestore, phone: string, password: string, idToken?: string) {
  const clean = String(phone || '').trim();
  if (!clean || password.length < 6) {
    throw new Error('يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.');
  }

  const res = await fetch('/api/auth/set-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ phone: clean, password }),
  });
  const data = await res.json().catch(() => ({}));
  await stripPasswordFields(db, clean);
  if (!res.ok) {
    throw new Error(data.error || 'تعذر تحديث كلمة المرور في نظام الدخول.');
  }
  return data;
}

export async function completeOrCreateUserAccount(
  db: Firestore,
  payload: { phone: string; fullName: string; password: string }
) {
  const phone = String(payload.phone || '').trim();
  const fullName = payload.fullName.trim();
  const ref = doc(db, 'users', phone);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : undefined;

  if (existing && !isIncompleteUserAccount(existing)) {
    return { status: 'exists' as const };
  }

  await setDoc(
    ref,
    {
      ...(omitPassword(existing || {})),
      fullName,
      phone,
      role: existing?.role || 'عضو أساسي',
      createdAt: existing?.createdAt || new Date().toISOString(),
      authMigrated: true,
      password: deleteField(),
    },
    { merge: true }
  );

  return { status: snap.exists() ? ('claimed' as const) : ('created' as const) };
}
