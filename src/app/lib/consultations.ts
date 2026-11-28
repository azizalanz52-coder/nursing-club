import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { canonicalPhone } from './certificatesLookup';

export const CONSULTATIONS_DOC = ['site_settings', 'consultations'] as const;
export const CONSULT_REQUESTS_DOC = ['committees', 'teryag_consult_requests'] as const;
export const CONSULT_TOPICS = ['مشاركة في هاكاثون', 'ابتكار', 'اختراع', 'تصميم', 'برمجة'] as const;
export const CONSULT_FOCUSES = ['الابتكارات', 'الاختراعات', 'التصاميم', 'البرمجة'] as const;
export const MEETING_APPS = ['Microsoft Teams', 'Google Meet', 'WhatsApp'] as const;
export const CONSULT_TEAM_LIMIT = 3;
export const CONSULT_TIMES = [
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
] as const;

export type MeetingApp = (typeof MEETING_APPS)[number];
export type ConsultStatus = 'pending' | 'approved' | 'rejected';

export type Consultant = {
  id: string;
  name: string;
  focuses: string[];
  phone: string;
};

export type ConsultRequest = {
  id: string;
  consultantId: string;
  consultantName: string;
  consultantPhone: string;
  visitorName: string;
  visitorPhone: string;
  topic: string;
  date: string;
  time: string;
  meetingApp: MeetingApp;
  meetingLink: string;
  status: ConsultStatus;
  rejectReason: string;
  createdAt: string;
};

export type ConsultationsConfig = {
  consultants: Consultant[];
};

const LOCAL_KEY = 'teryag-consult-request';
const LOCAL_BODY = 'teryag-consult-body';

export function riyadhToday(now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
}

export function riyadhMinutes(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(now));
  const bag: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') bag[part.type] = part.value;
  });
  return Number(bag.hour || 0) * 60 + Number(bag.minute || 0);
}

export function formatConsultDate(ymd: string) {
  if (!ymd) return '';
  return new Date(`${ymd}T12:00:00+03:00`).toLocaleDateString('ar-EG', {
    timeZone: 'Asia/Riyadh',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatConsultTime(value: string) {
  const [hourRaw, minuteRaw] = String(value || '').split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? 'م' : 'ص';
  const h12 = hour % 12 || 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function appointmentMs(date: string, time: string) {
  const ms = Date.parse(`${date}T${time}:00+03:00`);
  return Number.isFinite(ms) ? ms : 0;
}

export function openTimes(date: string, now = Date.now()) {
  if (!date || date < riyadhToday(now)) return [];
  if (date > riyadhToday(now)) return [...CONSULT_TIMES];
  const minutes = riyadhMinutes(now);
  return CONSULT_TIMES.filter((time) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute > minutes;
  });
}

export function whatsappPhone(phone: string) {
  const local = canonicalPhone(phone);
  if (!/^05\d{8}$/.test(local)) return '';
  return `966${local.slice(1)}`;
}

export function whatsappUrl(phone: string, message: string) {
  const number = whatsappPhone(phone);
  if (!number) return '';
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function requestMessage(item: ConsultRequest) {
  return [
    'طلب استشارة جديد',
    `من: ${item.visitorName}`,
    `الجوال: ${item.visitorPhone}`,
    `الموضوع: ${item.topic}`,
    `الموعد المقترح: ${formatConsultDate(item.date)}، ${formatConsultTime(item.time)}`,
    `طريقة الاجتماع: ${item.meetingApp}`,
    'بانتظار موافقتك أو رفضك من لوحة الطاقم.',
  ].join('\n');
}

export function decisionMessage(item: ConsultRequest) {
  if (item.status === 'approved') {
    return [
      'تمت الموافقة على استشارتك',
      `مع: ${item.consultantName}`,
      `الموعد: ${formatConsultDate(item.date)}، ${formatConsultTime(item.time)}`,
      `طريقة الاجتماع: ${item.meetingApp}`,
      item.meetingLink ? `الرابط: ${item.meetingLink}` : 'التواصل يتم عبر WhatsApp.',
    ].join('\n');
  }
  return [
    'تعذر قبول الموعد المقترح',
    item.rejectReason ? `السبب: ${item.rejectReason}` : 'اختر وقتاً ثانياً من صفحة الاستشارات.',
    'تقدر تغيّر الموعد من صفحة الاستشارات.',
  ].join('\n');
}

export function reminderMessage(item: ConsultRequest) {
  return [
    'تذكير: الاستشارة تبدأ خلال 10 دقائق',
    `مع: ${item.consultantName}`,
    `للزائر: ${item.visitorName}`,
    `الموعد: ${formatConsultDate(item.date)}، ${formatConsultTime(item.time)}`,
    `طريقة الاجتماع: ${item.meetingApp}`,
    item.meetingLink ? `الرابط: ${item.meetingLink}` : 'التواصل عبر WhatsApp.',
  ].join('\n');
}

export function reminderDue(item: ConsultRequest, now = Date.now()) {
  if (item.status !== 'approved') return false;
  const start = appointmentMs(item.date, item.time);
  if (!start) return false;
  return now >= start - 10 * 60 * 1000 && now <= start + 15 * 60 * 1000;
}

function asConsultant(value: unknown): Consultant | null {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  if (!row) return null;
  const id = String(row.id || '').trim();
  const name = String(row.name || '').trim();
  const phone = canonicalPhone(String(row.phone || ''));
  if (!id || !name || !phone) return null;
  const stored = Array.isArray(row.focuses) ? row.focuses.map((item) => String(item || '').trim()) : [];
  const legacy = String(row.focus || '').trim();
  const raw = stored.length ? stored : (legacy ? [legacy] : []);
  const focuses = raw.flatMap((item) => (
    item === 'الابتكارات والاختراعات' ? ['الابتكارات', 'الاختراعات'] : [item]
  )).filter((item, index, list) => item && list.indexOf(item) === index);
  if (!focuses.length) return null;
  return { id, name, phone, focuses };
}

function asRequest(value: unknown, id = ''): ConsultRequest | null {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : null;
  if (!row) return null;
  const requestId = String(row.id || id || '').trim();
  const status = String(row.status || '');
  const meetingApp = String(row.meetingApp || '');
  if (!requestId || !['pending', 'approved', 'rejected'].includes(status)) return null;
  if (!MEETING_APPS.includes(meetingApp as MeetingApp)) return null;
  return {
    id: requestId,
    consultantId: String(row.consultantId || ''),
    consultantName: String(row.consultantName || ''),
    consultantPhone: canonicalPhone(String(row.consultantPhone || '')),
    visitorName: String(row.visitorName || row.name || ''),
    visitorPhone: canonicalPhone(String(row.visitorPhone || '')),
    topic: String(row.topic || ''),
    date: String(row.date || ''),
    time: String(row.time || ''),
    meetingApp: meetingApp as MeetingApp,
    meetingLink: String(row.meetingLink || ''),
    status: status as ConsultStatus,
    rejectReason: String(row.rejectReason || ''),
    createdAt: String(row.createdAt || ''),
  };
}

export async function loadConsultations(db: Firestore): Promise<ConsultationsConfig> {
  const snap = await getDoc(doc(db, CONSULTATIONS_DOC[0], CONSULTATIONS_DOC[1]));
  const data = snap.data() || {};
  const consultants = (Array.isArray(data.consultants) ? data.consultants : [])
    .map(asConsultant)
    .filter((item): item is Consultant => Boolean(item))
    .slice(0, CONSULT_TEAM_LIMIT);
  return { consultants };
}

export async function saveConsultations(db: Firestore, config: ConsultationsConfig) {
  await setDoc(doc(db, CONSULTATIONS_DOC[0], CONSULTATIONS_DOC[1]), {
    consultants: config.consultants.slice(0, CONSULT_TEAM_LIMIT),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function loadPublicRequests(db: Firestore) {
  const snap = await getDoc(doc(db, CONSULT_REQUESTS_DOC[0], CONSULT_REQUESTS_DOC[1]));
  const data = snap.data() || {};
  return (Array.isArray(data.requests) ? data.requests : [])
    .map((item) => asRequest(item))
    .filter((item): item is ConsultRequest => Boolean(item));
}

async function writePublicRequests(db: Firestore, requests: ConsultRequest[]) {
  await setDoc(doc(db, CONSULT_REQUESTS_DOC[0], CONSULT_REQUESTS_DOC[1]), {
    kind: 'teryag-consults',
    requests,
    updatedAt: new Date().toISOString(),
  });
}

export async function upsertPublicRequest(db: Firestore, request: ConsultRequest) {
  const current = await loadPublicRequests(db);
  const next = [request, ...current.filter((item) => item.id !== request.id)].slice(0, 80);
  await writePublicRequests(db, next);
}

export async function publishRequests(db: Firestore, requests: ConsultRequest[]) {
  const current = await loadPublicRequests(db);
  const map = new Map(current.map((item) => [item.id, item]));
  requests.forEach((item) => map.set(item.id, item));
  await writePublicRequests(db, [...map.values()].slice(0, 80));
}

export function rememberRequest(request: ConsultRequest) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, request.id);
  localStorage.setItem(LOCAL_BODY, JSON.stringify(request));
}

export function rememberedRequestId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(LOCAL_KEY) || '';
}

export function rememberedRequest() {
  if (typeof window === 'undefined') return null;
  try {
    return asRequest(JSON.parse(localStorage.getItem(LOCAL_BODY) || 'null'));
  } catch {
    return null;
  }
}

export async function createConsultRequest(
  db: Firestore,
  input: {
    consultant: Consultant;
    visitorName: string;
    visitorPhone: string;
    topic: string;
    date: string;
    time: string;
    meetingApp: MeetingApp;
  }
) {
  const visitorName = input.visitorName.trim();
  const visitorPhone = canonicalPhone(input.visitorPhone);
  const topic = input.topic.trim();
  if (!visitorName || !/^05\d{8}$/.test(visitorPhone) || !topic) {
    throw new Error('اكتب اسمك ورقم جوالك وموضوع الاستشارة.');
  }
  if (!openTimes(input.date).includes(input.time as (typeof CONSULT_TIMES)[number])) {
    throw new Error('الوقت خارج الفترة من 4 العصر إلى 10 الليل.');
  }
  const request: ConsultRequest = {
    id: `consult_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    consultantId: input.consultant.id,
    consultantName: input.consultant.name,
    consultantPhone: input.consultant.phone,
    visitorName,
    visitorPhone,
    topic,
    date: input.date,
    time: input.time,
    meetingApp: input.meetingApp,
    meetingLink: '',
    status: 'pending',
    rejectReason: '',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'suggestions', request.id), {
    kind: 'consultation',
    ...request,
    name: visitorName,
    content: requestMessage(request),
    status: 'pending',
  });
  try {
    await upsertPublicRequest(db, request);
  } catch {
    // الزائر بدون دخول ما يقدر ينشر الحالة، والطاقم ينشرها من اللوحة.
  }
  rememberRequest(request);
  return {
    request,
    whatsappUrl: whatsappUrl(input.consultant.phone, requestMessage(request)),
  };
}

export async function decideConsultRequest(
  db: Firestore,
  request: ConsultRequest,
  decision: { status: 'approved' | 'rejected'; meetingLink?: string; rejectReason?: string }
) {
  const next: ConsultRequest = {
    ...request,
    status: decision.status,
    meetingLink: decision.status === 'approved' ? String(decision.meetingLink || '').trim() : '',
    rejectReason: decision.status === 'rejected' ? String(decision.rejectReason || '').trim() : '',
  };
  if (decision.status === 'approved' && next.meetingApp !== 'WhatsApp' && !next.meetingLink) {
    throw new Error('حط رابط Microsoft Teams أو Google Meet قبل الموافقة.');
  }
  await setDoc(doc(db, 'suggestions', request.id), {
    kind: 'consultation',
    ...next,
    name: next.visitorName,
    content: decisionMessage(next),
  }, { merge: true });
  await upsertPublicRequest(db, next);
  return {
    request: next,
    whatsappUrl: whatsappUrl(next.visitorPhone, decisionMessage(next)),
  };
}
