import { Firestore, collection, getDocs, query, where } from 'firebase/firestore';

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

export async function findCertificatesByLookup(db: Firestore, lookup: string) {
  const value = normalizeLookupValue(lookup);
  if (!value) return [] as any[];

  const mapped = new Map<string, any>();

  const collect = async (field: 'phone' | 'universityId', values: string[]) => {
    for (const val of values) {
      const [hrSnap, siteSnap] = await Promise.all([
        getDocs(query(collection(db, 'certificates'), where(field, '==', val))),
        getDocs(query(collection(db, 'site_certificates'), where(field, '==', val))),
      ]);
      [...hrSnap.docs, ...siteSnap.docs].forEach((d) => mapped.set(d.id, { id: d.id, ...d.data() }));
    }
  };

  await collect('phone', phoneVariants(value));
  await collect('universityId', universityIdVariants(value));

  try {
    for (const id of universityIdVariants(value)) {
      const appSnap = await getDocs(query(collection(db, 'applications'), where('universityId', '==', id)));
      for (const appDoc of appSnap.docs) {
        const app = appDoc.data();
        const appPhone = String(app.phone || '').trim();
        if (appPhone) await collect('phone', phoneVariants(appPhone));
      }
    }
  } catch (err) {
    console.error(err);
  }

  return Array.from(mapped.values());
}
