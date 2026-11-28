import { Firestore, doc, updateDoc } from 'firebase/firestore';
import { findUserDoc } from './memberAcceptance';

export const SPECIAL_CERT_CATEGORY = 'شهادة خاصة';

export type SpecialCertGreeting = {
  certId: string;
  title: string;
  message: string;
  recipientName: string;
  issuedAt: number;
};

export function readPendingSpecialCerts(data: Record<string, unknown> | null | undefined): SpecialCertGreeting[] {
  const raw = data?.pendingSpecialCerts;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return {
        certId: String(row.certId || '').trim(),
        title: String(row.title || '').trim(),
        message: String(row.message || '').trim(),
        recipientName: String(row.recipientName || '').trim(),
        issuedAt: Number(row.issuedAt || 0),
      };
    })
    .filter((item) => item.certId && item.message);
}

export async function queueSpecialCertGreeting(
  db: Firestore,
  phone: string,
  greeting: SpecialCertGreeting
) {
  const found = await findUserDoc(db, phone);
  if (!found?.id) return false;
  const next = [
    ...readPendingSpecialCerts(found.data).filter((item) => item.certId !== greeting.certId),
    greeting,
  ];
  await updateDoc(doc(db, 'users', found.id), { pendingSpecialCerts: next });
  return true;
}

export async function dismissSpecialCertGreeting(db: Firestore, phone: string, certId: string) {
  const found = await findUserDoc(db, phone);
  if (!found?.id) return false;
  const next = readPendingSpecialCerts(found.data).filter((item) => item.certId !== certId);
  await updateDoc(doc(db, 'users', found.id), { pendingSpecialCerts: next });
  return true;
}
