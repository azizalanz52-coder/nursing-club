import { Firestore, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth } from './firebase';
import { emailToPhone } from './authIdentity';

export function normalizeLookupValue(value: string) {
  return String(value || '')
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776));
}

export function phoneVariants(value: string) {
  const raw = normalizeLookupValue(value);
  const digits = raw.replace(/\D/g, '');
  let core = digits;
  if (core.startsWith('966')) core = core.slice(3);
  if (core.startsWith('0')) core = core.slice(1);
  const variants = [raw];
  if (core) {
    variants.push(core, `0${core}`, `966${core}`);
  }
  return Array.from(new Set(variants.filter(Boolean)));
}

export function canonicalPhone(value: string) {
  const digits = normalizeLookupValue(value).replace(/\D/g, '');
  let core = digits;
  if (core.startsWith('966')) core = core.slice(3);
  if (core.startsWith('0')) core = core.slice(1);
  return core ? `0${core}` : '';
}

export function normalizeUniversityId(value: unknown) {
  let raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/e\+/i.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) raw = String(Math.round(num));
  }
  if (/^\d+\.0+$/.test(raw)) raw = raw.replace(/\.0+$/, '');
  return raw.replace(/\s+/g, '');
}

export function universityIdVariants(value: string) {
  const id = normalizeUniversityId(value);
  const raw = normalizeLookupValue(value);
  return Array.from(new Set([id, raw].filter(Boolean)));
}

export function looksLikeUniversityId(value: string) {
  const id = normalizeUniversityId(value);
  if (!/^\d{6,12}$/.test(id)) return false;
  const asPhone = canonicalPhone(id);
  return !(asPhone.length === 10 && asPhone.startsWith('05'));
}

function storedIdentity() {
  if (typeof window === 'undefined') return { phone: '', universityId: '' };
  return {
    phone: canonicalPhone(localStorage.getItem('userPhone') || ''),
    universityId: normalizeUniversityId(localStorage.getItem('userUniversityId') || ''),
  };
}

function sessionPhone() {
  const stored = storedIdentity().phone;
  const fromAuth = canonicalPhone(emailToPhone(auth.currentUser?.email || ''));
  return stored || fromAuth;
}

function identityMatchesLookup(lookup: string, phone: string, universityId: string) {
  if (phone && (canonicalPhone(lookup) === phone || phoneVariants(lookup).includes(phone))) return true;
  if (universityId && (normalizeUniversityId(lookup) === universityId || universityIdVariants(lookup).includes(universityId))) {
    return true;
  }
  return false;
}

async function readUserIdentity(db: Firestore, phone: string) {
  const ordered = Array.from(new Set([canonicalPhone(phone), ...phoneVariants(phone)].filter(Boolean)));
  for (const id of ordered) {
    try {
      const snap = await getDoc(doc(db, 'users', id));
      if (!snap.exists()) continue;
      const data = snap.data();
      return {
        phone: canonicalPhone(String(data.phone || snap.id)) || snap.id,
        universityId: normalizeUniversityId(data.universityId),
      };
    } catch (err) {
      console.error(err);
    }
  }
  return null;
}

function rememberIdentity(phones: Set<string>, unis: Set<string>, phone?: string, universityId?: string) {
  phoneVariants(phone || '').forEach((item) => phones.add(item));
  universityIdVariants(universityId || '').forEach((item) => unis.add(item));
}

export async function findCertificatesByLookup(db: Firestore, lookup: string) {
  const value = normalizeLookupValue(lookup);
  if (!value) return [] as any[];

  const phones = new Set<string>();
  const unis = new Set<string>();
  const lookupIsUniversityId = looksLikeUniversityId(value);

  if (lookupIsUniversityId) {
    rememberIdentity(phones, unis, '', value);
  } else {
    rememberIdentity(phones, unis, value, value);
  }

  const stored = storedIdentity();
  const livePhone = sessionPhone();
  if (identityMatchesLookup(value, stored.phone || livePhone, stored.universityId)) {
    rememberIdentity(phones, unis, stored.phone || livePhone, stored.universityId);
  }

  const identityPhones = Array.from(
    new Set([canonicalPhone(value), livePhone, stored.phone].filter((item) => item && !looksLikeUniversityId(item)))
  );
  for (const id of identityPhones) {
    const user = await readUserIdentity(db, id);
    if (!user) continue;
    if (identityMatchesLookup(value, user.phone, user.universityId)) {
      rememberIdentity(phones, unis, user.phone, user.universityId);
    }
  }

  const mapped = new Map<string, any>();

  const collect = async (field: 'phone' | 'universityId', values: string[]) => {
    for (const val of values) {
      if (!val) continue;
      try {
        const [hrSnap, siteSnap] = await Promise.all([
          getDocs(query(collection(db, 'certificates'), where(field, '==', val))),
          getDocs(query(collection(db, 'site_certificates'), where(field, '==', val))),
        ]);
        [...hrSnap.docs, ...siteSnap.docs].forEach((d) => mapped.set(d.id, { id: d.id, ...d.data() }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  await collect('phone', Array.from(phones));
  await collect('universityId', Array.from(unis));

  try {
    for (const id of unis) {
      const appSnap = await getDocs(query(collection(db, 'applications'), where('universityId', '==', id)));
      for (const appDoc of appSnap.docs) {
        const appPhone = String(appDoc.data()?.phone || '').trim();
        if (!appPhone) continue;
        phoneVariants(appPhone).forEach((item) => phones.add(item));
        await collect('phone', phoneVariants(appPhone));
      }
    }
  } catch (err) {
    console.error(err);
  }

  const extraPhones = new Set<string>();
  const extraUnis = new Set<string>();
  mapped.forEach((cert) => {
    phoneVariants(String(cert.phone || '')).forEach((item) => {
      if (!phones.has(item)) extraPhones.add(item);
    });
    universityIdVariants(String(cert.universityId || '')).forEach((item) => {
      if (!unis.has(item)) extraUnis.add(item);
    });
  });

  if (extraPhones.size) await collect('phone', Array.from(extraPhones));
  if (extraUnis.size) await collect('universityId', Array.from(extraUnis));

  return Array.from(mapped.values());
}
