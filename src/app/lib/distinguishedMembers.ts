import { Firestore, collection, deleteField, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import {
  BASIC_MEMBER_ROLE,
  DISTINGUISHED_MEMBER_ROLE,
  isAdminPhone,
  isPrivilegedRole,
} from './authIdentity';
import { loadCaseSubmissions, topCaseStudyPhones } from './caseStudy';
import { canonicalPhone } from './certificatesLookup';
import { findUserDocsByPhone } from './userAccounts';

export const CASE_STUDY_DISTINGUISHED_FLAG = 'caseStudyDistinguished';
export const DISTINGUISHED_PROMOTION_NOTICE =
  'مباركة على ترقيتك إلى عضو مميز لتفاعلك الدائم في المنصة.';

function isLockedClubRole(phone: string, role?: string | null) {
  if (isAdminPhone(phone)) return true;
  if (isPrivilegedRole(role)) return true;
  const value = String(role || '');
  return (
    value.includes('رئيس لجنة') ||
    value.includes('رئيسة لجنة') ||
    value.includes('قائد') ||
    value.includes('قائدة') ||
    value.includes('مشرف') ||
    value.includes('الجندي الخفي')
  );
}

function isPromotableMemberRole(role?: string | null) {
  const value = String(role || '').trim();
  return !value || value === BASIC_MEMBER_ROLE || value === 'عضو';
}

export async function syncCaseStudyDistinguished(
  db: Firestore,
  submissions?: Array<Record<string, any>>
) {
  const rows = submissions || await loadCaseSubmissions(db);
  const topPhones = new Set(topCaseStudyPhones(rows));
  const touched = new Map<string, string>();

  for (const phone of topPhones) {
    const docs = await findUserDocsByPhone(db, phone);
    for (const item of docs) {
      const role = String(item.data?.role || '');
      if (isLockedClubRole(item.id, role) || isLockedClubRole(phone, role)) continue;
      if (!isPromotableMemberRole(role)) continue;
      await updateDoc(doc(db, 'users', item.id), {
        role: DISTINGUISHED_MEMBER_ROLE,
        [CASE_STUDY_DISTINGUISHED_FLAG]: true,
        latestNotification: DISTINGUISHED_PROMOTION_NOTICE,
      });
      touched.set(item.id, DISTINGUISHED_MEMBER_ROLE);
      if (phone) touched.set(phone, DISTINGUISHED_MEMBER_ROLE);
    }
  }

  const flaggedSnap = await getDocs(
    query(collection(db, 'users'), where(CASE_STUDY_DISTINGUISHED_FLAG, '==', true))
  );

  for (const item of flaggedSnap.docs) {
    const data = item.data();
    const role = String(data?.role || '');
    const phone = canonicalPhone(item.id) || item.id;
    if (topPhones.has(phone) || [...topPhones].some((top) => canonicalPhone(top) === phone)) continue;
    if (isLockedClubRole(item.id, role) || isLockedClubRole(phone, role)) {
      await updateDoc(item.ref, { [CASE_STUDY_DISTINGUISHED_FLAG]: deleteField() });
      continue;
    }
    if (role !== DISTINGUISHED_MEMBER_ROLE && !isPromotableMemberRole(role)) {
      await updateDoc(item.ref, { [CASE_STUDY_DISTINGUISHED_FLAG]: deleteField() });
      continue;
    }
    await updateDoc(item.ref, {
      role: BASIC_MEMBER_ROLE,
      [CASE_STUDY_DISTINGUISHED_FLAG]: deleteField(),
      latestNotification: 'خرجت من أول خمسة في دراسة الحالة، ورجعت رتبتك إلى عضو أساسي. نافس من جديد للعودة.',
    });
    touched.set(item.id, BASIC_MEMBER_ROLE);
    if (phone) touched.set(phone, BASIC_MEMBER_ROLE);
  }

  return touched;
}
