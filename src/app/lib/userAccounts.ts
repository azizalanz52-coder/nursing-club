import { Firestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export function isIncompleteUserAccount(data?: { password?: string } | null) {
  return !String(data?.password || '').trim();
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

export async function completeOrCreateUserAccount(
  db: Firestore,
  payload: { phone: string; fullName: string; password: string }
) {
  const phone = String(payload.phone || '').trim();
  const fullName = payload.fullName.trim();
  const password = payload.password;
  const ref = doc(db, 'users', phone);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : undefined;

  if (existing && !isIncompleteUserAccount(existing)) {
    return { status: 'exists' as const };
  }

  await setDoc(
    ref,
    {
      ...(existing || {}),
      fullName,
      phone,
      password,
      role: existing?.role || 'عضو أساسي',
      createdAt: existing?.createdAt || new Date().toISOString(),
    },
    { merge: true }
  );

  return { status: snap.exists() ? ('claimed' as const) : ('created' as const) };
}
