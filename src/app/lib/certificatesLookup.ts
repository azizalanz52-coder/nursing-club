import { Firestore, collection, getDocs, query, where } from 'firebase/firestore';

export function normalizeLookupValue(value: string) {
  return String(value || '').trim();
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

export async function findCertificatesByLookup(db: Firestore, lookup: string) {
  const value = normalizeLookupValue(lookup);
  if (!value) return [] as any[];

  const variants = phoneVariants(value);
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

  await collect('phone', variants);
  await collect('universityId', [value]);

  try {
    const appSnap = await getDocs(query(collection(db, 'applications'), where('universityId', '==', value)));
    for (const appDoc of appSnap.docs) {
      const app = appDoc.data();
      const appPhone = String(app.phone || '').trim();
      if (appPhone) await collect('phone', phoneVariants(appPhone));
    }
  } catch (err) {
    console.error(err);
  }

  return Array.from(mapped.values());
}
