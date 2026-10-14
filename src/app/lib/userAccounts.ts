import { Firestore, collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

function isLeadershipAccount(phone: string, role?: string) {
  const value = String(role || '');
  return (
    phone === '0553731265' ||
    value === 'System Admin' ||
    value === 'General Supervisor' ||
    value.includes('رئيس النادي') ||
    value.includes('رئيسة النادي') ||
    value.includes('نائب رئيس') ||
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
