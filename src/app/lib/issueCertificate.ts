import { Firestore, addDoc, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { eventsRelated, isSameEligiblePerson } from './hrCertificateBatches';
import { certMediaFields, isPlaceholderCertMedia } from './uploadFile';

export { isPlaceholderCertMedia };
export const CERT_COLLECTIONS = ['certificates', 'site_certificates'] as const;

export function findExistingIssuedCertificate<T extends Record<string, any>>(
  certificates: T[],
  person: { phone?: string; universityId?: string },
  title: string
) {
  const event = String(title || '').trim();
  return certificates.find((cert) => {
    if (!cert?.id) return false;
    const samePerson = isSameEligiblePerson(
      { fullName: '', phone: String(person.phone || ''), universityId: String(person.universityId || '') },
      { fullName: '', phone: String(cert.phone || ''), universityId: String(cert.universityId || '') }
    );
    if (!samePerson) return false;
    const label = String(cert.certTitle || cert.title || '').trim();
    if (!event || !label) return true;
    return eventsRelated(label, event) || eventsRelated(event, label);
  });
}

async function patchCertificateCollections(
  db: Firestore,
  certId: string,
  patch: Record<string, unknown>,
  createIfMissing: boolean
) {
  let saved = 0;
  for (const col of CERT_COLLECTIONS) {
    const ref = doc(db, col, certId);
    try {
      await updateDoc(ref, patch);
      saved += 1;
    } catch (err) {
      if (!createIfMissing) {
        console.error(err);
        continue;
      }
      try {
        await setDoc(ref, patch, { merge: true });
        saved += 1;
      } catch (inner) {
        console.error(inner || err);
      }
    }
  }
  return saved;
}

export async function upsertIssuedCertificate(
  db: Firestore,
  input: {
    existingId?: string;
    record: Record<string, unknown>;
    fileUrl?: string;
  }
) {
  const fileUrl = String(input.fileUrl || '').trim();
  const hasNewFile = Boolean(fileUrl) && !isPlaceholderCertMedia(fileUrl);
  const identity = { ...input.record };
  delete identity.image;
  delete identity.fileUrl;
  delete identity.file;

  if (input.existingId) {
    const identitySaved = await patchCertificateCollections(db, input.existingId, identity, true);
    if (hasNewFile) {
      const mediaSaved = await patchCertificateCollections(db, input.existingId, certMediaFields(fileUrl), true);
      if (!mediaSaved) {
        throw new Error('سجل الشهادة باقٍ، لكن ملف الصورة كبير على الحفظ. صغّر الصورة ثم أعد المحاولة.');
      }
    } else if (!identitySaved) {
      throw new Error('تعذر تحديث بيانات الشهادة. السجل لم يُحذف.');
    }
    return { id: input.existingId, created: false };
  }

  if (!hasNewFile) {
    throw new Error('ارفع ملف الشهادة قبل الحفظ.');
  }

  const payload = { ...identity, ...certMediaFields(fileUrl) };
  const certRef = await addDoc(collection(db, 'certificates'), payload);
  try {
    await setDoc(doc(db, 'site_certificates', certRef.id), payload, { merge: true });
  } catch (err) {
    console.error(err);
  }
  return { id: certRef.id, created: true };
}
