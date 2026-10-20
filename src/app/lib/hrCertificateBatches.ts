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

function looksLikeUniversityId(value: string) {
  const id = normalizeUniversityId(value);
  if (!id || looksLikePhone(id) || looksLikePhone(value)) return false;
  return /^\d{6,14}$/.test(id);
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

export function eventTitleFromCertLabel(label: string) {
  return norm(label).replace(/^شهادة\s*مشاركة\s*/u, '').trim() || norm(label);
}

export function eventsRelated(a: string, b: string) {
  if (sameEventTitle(a, b)) return true;
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  if (!left || !right) return false;
  const [short, long] = left.length <= right.length ? [left, right] : [right, left];
  return short.length >= 10 && long.includes(short);
}

export function stableBatchId(eventTitle: string) {
  const key = normalizePersonName(eventTitle).replace(/\s+/g, '_');
  return `event_${key}`.slice(0, 120);
}

export function isSameEligiblePerson(a: CertEligiblePerson, b: CertEligiblePerson) {
  const aUniv = normalizeUniversityId(a.universityId);
  const bUniv = normalizeUniversityId(b.universityId);
  if (aUniv && bUniv) return aUniv === bUniv;

  const aPhone = canonicalPhone(a.phone);
  const bPhone = canonicalPhone(b.phone);
  if (aPhone && bPhone) return aPhone === bPhone;

  return false;
}

export function filterNewRecipients(incoming: CertEligiblePerson[], existing: CertEligiblePerson[]) {
  return mergeRecipients(existing, incoming).added;
}

export function mergeRecipients(existing: CertEligiblePerson[], incoming: CertEligiblePerson[]) {
  const recipients = existing.map((person) => ({ ...person }));
  const added: CertEligiblePerson[] = [];

  for (const person of incoming) {
    const byIdOrPhone = recipients.find((item) => isSameEligiblePerson(item, person));
    if (byIdOrPhone) {
      if (!byIdOrPhone.universityId && person.universityId) byIdOrPhone.universityId = person.universityId;
      if (!byIdOrPhone.phone && person.phone) byIdOrPhone.phone = person.phone;
      continue;
    }

    const incomingName = normalizePersonName(person.fullName);
    const byName = recipients.find((item) => normalizePersonName(item.fullName) === incomingName);
    if (byName) {
      const existingId = normalizeUniversityId(byName.universityId);
      const incomingId = normalizeUniversityId(person.universityId);
      if (existingId && incomingId && existingId !== incomingId) {
        added.push(person);
        recipients.push(person);
        continue;
      }
      if (!byName.universityId && person.universityId) byName.universityId = person.universityId;
      if (!byName.phone && person.phone) byName.phone = person.phone;
      continue;
    }

    added.push(person);
    recipients.push(person);
  }

  return { recipients, added };
}

function headerKey(value: string) {
  return value.replace(/\s+/g, '').replace(/[إأآ]/g, 'ا').toLowerCase();
}

function cellText(value: unknown) {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(Math.round(value));
  }
  return String(value).trim();
}

function isNameHeader(value: string) {
  const h = headerKey(value);
  return (
    h === 'اسم' ||
    h === 'name' ||
    h === 'fullname' ||
    h.startsWith('الاسم') ||
    h.startsWith('اسمالطالب') ||
    h.startsWith('اسمالمستفيد') ||
    h.startsWith('اسمالمشارك') ||
    h.includes('fullname')
  );
}

function isPhoneHeader(value: string) {
  const h = headerKey(value);
  return ['جوال', 'هاتف', 'phone', 'موبايل', 'mobile', 'رقمالجوال'].some((key) => h === key || h.includes(key));
}

function isUnivHeader(value: string) {
  const h = headerKey(value);
  if (h === 'id' || h === 'uid' || h === 'stid') return true;
  return ['جامعي', 'university', 'اكاديمي', 'academic', 'studentid', 'رقمالطالب'].some((key) => h.includes(key));
}

function headerScore(cells: string[]) {
  let score = 0;
  for (const cell of cells) {
    if (isNameHeader(cell) || isPhoneHeader(cell) || isUnivHeader(cell)) score += 3;
    if (looksLikeUniversityId(cell) || looksLikePhone(cell)) score -= 4;
  }
  return score;
}

function bestUniversityId(raw: unknown, formatted: unknown) {
  const fromNum =
    typeof raw === 'number' && Number.isFinite(raw) && Math.abs(raw) >= 1e5 ? String(Math.round(raw)) : '';
  const fromFmt = normalizeUniversityId(formatted);
  const fromRaw = normalizeUniversityId(raw);
  const candidates = [fromNum, fromFmt, fromRaw].filter((value) => /^\d{6,14}$/.test(value));
  return candidates.sort((a, b) => b.length - a.length)[0] || '';
}

function pickName(rawRow: unknown[], fmtRow: unknown[], nameIdx: number) {
  const fromCol = cellText(fmtRow[nameIdx] ?? rawRow[nameIdx]);
  if (fromCol && !isNameHeader(fromCol)) return fromCol;
  for (let i = 0; i < Math.max(fmtRow.length, rawRow.length); i++) {
    const text = cellText(fmtRow[i] ?? rawRow[i]);
    if (text.length >= 2 && /[\u0600-\u06FF]/.test(text) && !isNameHeader(text) && !isUnivHeader(text) && !isPhoneHeader(text)) {
      return text;
    }
  }
  return fromCol;
}

export type ExcelParseResult = {
  people: CertEligiblePerson[];
  skippedDuplicates: string[];
  namedRows: number;
};

export function parseEligibleExcel(buffer: ArrayBuffer): ExcelParseResult {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as unknown[][];
  const fmtRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][];
  const rowCount = Math.max(rawRows.length, fmtRows.length);
  if (!rowCount) return { people: [], skippedDuplicates: [], namedRows: 0 };

  let headerAt = -1;
  let best = 0;
  for (let i = 0; i < Math.min(6, rowCount); i++) {
    const cells = (fmtRows[i] || rawRows[i] || []).map((cell) => cellText(cell));
    const score = headerScore(cells);
    if (score > best) {
      best = score;
      headerAt = i;
    }
  }
  const hasHeaders = headerAt >= 0 && best >= 3;
  const headerCells = hasHeaders ? (fmtRows[headerAt] || rawRows[headerAt] || []).map((cell) => cellText(cell)) : [];
  const nameIdx = Math.max(0, headerCells.findIndex((cell) => isNameHeader(cell)));
  const phoneIdx = headerCells.findIndex((cell) => isPhoneHeader(cell));
  const univIdx = headerCells.findIndex((cell) => isUnivHeader(cell));
  const startAt = hasHeaders ? headerAt + 1 : 0;

  const people: CertEligiblePerson[] = [];
  const skippedDuplicates: string[] = [];
  let namedRows = 0;

  for (let r = startAt; r < rowCount; r++) {
    const rawRow = rawRows[r] || [];
    const fmtRow = fmtRows[r] || [];
    if (!rawRow.length && !fmtRow.length) continue;

    const fullName = pickName(rawRow, fmtRow, nameIdx);
    if (!fullName || fullName.length < 2 || isNameHeader(fullName)) continue;
    namedRows += 1;

    let phone = phoneIdx >= 0 ? canonicalPhone(cellText(fmtRow[phoneIdx] ?? rawRow[phoneIdx])) : '';
    let universityId = univIdx >= 0 ? bestUniversityId(rawRow[univIdx], fmtRow[univIdx]) : '';

    const width = Math.max(rawRow.length, fmtRow.length);
    for (let i = 0; i < width; i++) {
      const text = cellText(fmtRow[i] ?? rawRow[i]);
      if (!universityId && i !== nameIdx && i !== phoneIdx && looksLikeUniversityId(text)) {
        universityId = bestUniversityId(rawRow[i], fmtRow[i]);
      }
      if (!phone && i !== nameIdx && looksLikePhone(text)) {
        phone = canonicalPhone(text);
      }
    }

    const person = { fullName, phone, universityId };
    if (people.some((item) => isSameEligiblePerson(item, person))) {
      skippedDuplicates.push(fullName);
      continue;
    }
    people.push(person);
  }

  return { people, skippedDuplicates, namedRows };
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
    if (!event) return true;
    return title.includes(event) || event.includes(norm(cert.certTitle || cert.title));
  });
}

export function certEventLabel(cert: { title?: string; certTitle?: string }) {
  return norm(cert.certTitle || cert.title);
}

export function peopleFromEventCertificates(
  certificates: Array<{
    fullName?: string;
    recipientName?: string;
    phone?: string;
    universityId?: string;
    title?: string;
    certTitle?: string;
  }>,
  eventTitle: string
) {
  const people: CertEligiblePerson[] = [];
  certificates.forEach((cert) => {
    const label = certEventLabel(cert);
    if (!eventsRelated(label, eventTitle) && !eventsRelated(eventTitleFromCertLabel(label), eventTitle)) return;
    const person = {
      fullName: String(cert.fullName || cert.recipientName || '').trim(),
      phone: String(cert.phone || '').trim(),
      universityId: String(cert.universityId || '').trim(),
    };
    if (!person.fullName) return;
    if (people.some((item) => isSameEligiblePerson(item, person) || normalizePersonName(item.fullName) === normalizePersonName(person.fullName))) {
      return;
    }
    people.push(person);
  });
  return people;
}

export function suggestedCertTitle(eventTitle: string) {
  const title = norm(eventTitle);
  if (!title) return 'شهادة مشاركة فعالية';
  if (title.includes('شهادة')) return title;
  return `شهادة مشاركة ${title}`;
}
