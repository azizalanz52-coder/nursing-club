import * as XLSX from 'xlsx';
import { canonicalPhone, normalizeUniversityId } from './certificatesLookup';

export type CertEligiblePerson = {
  fullName: string;
  phone: string;
  universityId: string;
};

export type CertEventBatch = {
  id: string;
  eventTitle: string;
  createdAt: number;
  createdBy: string;
  recipients: CertEligiblePerson[];
};

function norm(value: unknown) {
  return String(value || '').trim();
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\s+/g, '');
  return /^(05|\+?9665|5)\d{8}$/.test(digits) || digits.startsWith('05');
}

export function normalizePersonName(name: string) {
  return String(name || '')
    .replace(/\s+/g, ' ')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

export function sameEventTitle(a: string, b: string) {
  return normalizePersonName(a) === normalizePersonName(b);
}

export function isSameEligiblePerson(a: CertEligiblePerson, b: CertEligiblePerson) {
  const aUniv = normalizeUniversityId(a.universityId);
  const bUniv = normalizeUniversityId(b.universityId);
  if (aUniv && bUniv && aUniv === bUniv) return true;
  const aPhone = canonicalPhone(a.phone);
  const bPhone = canonicalPhone(b.phone);
  if (aPhone && bPhone && aPhone === bPhone) return true;
  const aName = normalizePersonName(a.fullName);
  const bName = normalizePersonName(b.fullName);
  return Boolean(aName && bName && aName === bName);
}

export function filterNewRecipients(incoming: CertEligiblePerson[], existing: CertEligiblePerson[]) {
  return incoming.filter((person) => !existing.some((item) => isSameEligiblePerson(person, item)));
}

function headerKey(value: string) {
  return value.replace(/\s+/g, '').replace(/[إأآ]/g, 'ا').toLowerCase();
}

function colIndex(headers: string[], keys: string[]) {
  return headers.findIndex((header) => keys.some((key) => header.includes(key)));
}

export function parseEligibleExcel(buffer: ArrayBuffer): CertEligiblePerson[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][];
  if (!rows.length) return [];

  const first = (rows[0] || []).map((cell) => headerKey(norm(cell)));
  const nameIdx = colIndex(first, ['اسم', 'name', 'fullname', 'المستفيد']);
  const phoneIdx = colIndex(first, ['جوال', 'هاتف', 'phone', 'موبايل']);
  const univIdx = colIndex(first, ['جامعي', 'university', 'id', 'رقمجامعي']);
  const hasHeaders = nameIdx >= 0 || phoneIdx >= 0 || univIdx >= 0;
  const dataRows = hasHeaders ? rows.slice(1) : rows;

  const people: CertEligiblePerson[] = [];
  const seen = new Set<string>();

  for (const row of dataRows) {
    if (!row || !row.length) continue;
    let fullName = '';
    let phone = '';
    let universityId = '';

    if (hasHeaders) {
      fullName = nameIdx >= 0 ? norm(row[nameIdx]) : norm(row[0]);
      phone = phoneIdx >= 0 ? canonicalPhone(norm(row[phoneIdx])) : '';
      universityId = univIdx >= 0 ? normalizeUniversityId(row[univIdx]) : '';
    } else {
      fullName = norm(row[0]);
      const second = norm(row[1]);
      const third = norm(row[2]);
      if (looksLikePhone(second)) {
        phone = canonicalPhone(second);
        universityId = normalizeUniversityId(third);
      } else {
        universityId = normalizeUniversityId(second);
        phone = looksLikePhone(third) ? canonicalPhone(third) : '';
      }
    }

    if (fullName.length < 3) continue;
    if (!phone && !universityId) continue;
    const person = { fullName, phone, universityId };
    if (people.some((item) => isSameEligiblePerson(item, person))) continue;
    const key = `${normalizePersonName(fullName)}|${phone}|${universityId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    people.push(person);
  }

  return people;
}

export function personHasCertificate(
  person: CertEligiblePerson,
  certificates: Array<{ phone?: string; universityId?: string; title?: string; certTitle?: string }>,
  eventTitle: string
) {
  const event = norm(eventTitle);
  return certificates.some((cert) => {
    const samePerson = isSameEligiblePerson(person, {
      fullName: '',
      phone: String(cert.phone || ''),
      universityId: String(cert.universityId || ''),
    });
    if (!samePerson) return false;
    const title = `${norm(cert.title)} ${norm(cert.certTitle)}`;
    return !event || title.includes(event);
  });
}

export function suggestedCertTitle(eventTitle: string) {
  const title = norm(eventTitle);
  if (!title) return 'شهادة مشاركة فعالية';
  if (title.includes('شهادة')) return title;
  return `شهادة مشاركة ${title}`;
}
