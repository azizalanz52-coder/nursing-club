'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { emailToPhone } from '../lib/authIdentity';
import { canonicalPhone } from '../lib/certificatesLookup';
import {
  CONSULT_TOPICS,
  MEETING_APPS,
  createConsultRequest,
  decisionMessage,
  formatConsultDate,
  formatConsultTime,
  loadConsultations,
  loadPublicRequests,
  openTimes,
  rememberedRequest,
  rememberedRequestId,
  reminderDue,
  reminderMessage,
  riyadhToday,
  whatsappUrl,
  type Consultant,
  type ConsultRequest,
  type MeetingApp,
} from '../lib/consultations';

export default function ConsultationsPage() {
  const [consultants, setConsultants] = useState<Consultant[] | null>(null);
  const [requests, setRequests] = useState<ConsultRequest[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [date, setDate] = useState(riyadhToday());
  const [time, setTime] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [topic, setTopic] = useState<string>(CONSULT_TOPICS[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [meetingApp, setMeetingApp] = useState<MeetingApp>('Microsoft Teams');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [sentUrl, setSentUrl] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [phone, setPhone] = useState('');

  const refresh = async () => {
    const [config, list] = await Promise.all([
      loadConsultations(db),
      loadPublicRequests(db).catch(() => [] as ConsultRequest[]),
    ]);
    setConsultants(config.consultants);
    setRequests(list);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setPhone(user ? emailToPhone(user.email) : '');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    void refresh().catch((err) => {
      console.error(err);
      setConsultants([]);
    });
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void loadPublicRequests(db).then(setRequests).catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(timer);
  }, []);

  const consultant = consultants?.find((item) => item.id === selectedId) || null;
  const times = openTimes(date, now);
  const mineId = rememberedRequestId();
  const lookedUp = canonicalPhone(lookupPhone);
  const mine = (lookedUp ? requests.find((item) => item.visitorPhone === lookedUp) : null)
    || requests.find((item) => item.id === mineId)
    || rememberedRequest()
    || null;
  const remind = mine && reminderDue(mine, now) ? mine : null;
  const onTeam = Boolean(
    phone && consultants?.some((person) => canonicalPhone(person.phone) === canonicalPhone(phone)),
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consultant || !time || busy) return;
    const chosen = topic === 'أخرى' ? customTopic.trim() : topic;
    setBusy(true);
    setNotice('');
    setSentUrl('');
    try {
      const booked = await createConsultRequest(db, {
        consultant,
        visitorName,
        visitorPhone,
        topic: chosen,
        date,
        time,
        meetingApp,
      });
      setLookupPhone(booked.request.visitorPhone);
      setSentUrl(booked.whatsappUrl);
      if (booked.whatsappUrl) window.open(booked.whatsappUrl, '_blank', 'noopener,noreferrer');
      setNotice('وصل طلبك للطاقم. إذا ناسبهم الوقت يوافقون، وإذا ما ناسب يرفضونه وتقدر تغيّر الموعد.');
      void refresh();
    } catch (err) {
      console.error(err);
      setNotice(err instanceof Error ? err.message : 'تعذر إرسال الطلب.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F0E8] text-[#1a0208]" dir="rtl">
      <section className="bg-gradient-to-br from-[#3a020c] via-[#630517] to-[#4A030F] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-3 text-center">
          <p className="text-[#F5D061] text-xs font-black">برعاية فريق ترياق</p>
          <h1 className="text-3xl sm:text-4xl font-black">الاستشارات</h1>
          <p className="mx-auto max-w-xl text-sm font-bold leading-7 text-amber-50/90">استشارات متخصصة وحلول متكاملة تجمع بين الابتكار، التصميم، والتطوير التقني.</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {remind ? (
          <a
            href={whatsappUrl(remind.consultantPhone, reminderMessage(remind))}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-3xl bg-[#630517] px-5 py-4 text-center text-sm font-black text-[#F5D061]"
          >
            استشارتك بعد أقل من 10 دقائق. أرسل تذكير WhatsApp للمستشار
          </a>
        ) : null}

        {mine ? (
          <section className="rounded-3xl border border-[#F5D061] bg-white p-5 space-y-2">
            <p className="text-xs font-black text-[#630517]">طلبك</p>
            <h2 className="text-lg font-black">{mine.status === 'approved' ? 'تمت الموافقة' : mine.status === 'rejected' ? 'الموعد ما تناسب' : 'بانتظار رد الطاقم'}</h2>
            <p className="text-sm font-bold">{mine.consultantName} · {formatConsultDate(mine.date)} · {formatConsultTime(mine.time)}</p>
            <p className="text-xs font-bold text-stone-500">{mine.meetingApp}{mine.meetingLink ? ` · ${mine.meetingLink}` : ''}</p>
            {mine.status === 'rejected' ? (
              <p className="text-sm font-bold text-[#630517]">{mine.rejectReason || 'اختر وقتاً ثانياً من النموذج تحت.'}</p>
            ) : null}
            {mine.status !== 'pending' ? (
              <a href={whatsappUrl(mine.consultantPhone, decisionMessage(mine))} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-black text-[#1f7a3a]">
                فتح رسالة WhatsApp
              </a>
            ) : null}
          </section>
        ) : null}

        {!consultants ? (
          <p className="text-center text-sm font-bold text-[#630517]">نجمع الطاقم...</p>
        ) : consultants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#F5D061] bg-white p-10 text-center">
            <p className="text-base font-black text-[#630517]">الطاقم يجهز الأسماء</p>
          </div>
        ) : (
          <div className="grid items-stretch gap-3 sm:grid-cols-3">
            {consultants.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => { setSelectedId(person.id); setNotice(''); }}
                className={`flex h-full min-h-[9.5rem] flex-col items-center justify-between rounded-3xl border px-4 py-5 text-center shadow-sm ${person.id === selectedId ? 'border-[#630517] bg-[#fff6d6]' : 'border-stone-200 bg-white'}`}
              >
                <p className="flex min-h-[3.25rem] items-center text-base font-black leading-snug">{person.name}</p>
                <p className="mt-3 flex min-h-[1.75rem] flex-wrap items-center justify-center gap-1">
                  {person.focuses.map((item) => (
                    <span key={item} className="rounded-full bg-[#630517]/10 px-2 py-0.5 text-[11px] font-black text-[#630517]">{item}</span>
                  ))}
                </p>
              </button>
            ))}
          </div>
        )}

        {consultant ? (
          <form onSubmit={submit} className="rounded-3xl border border-stone-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-black text-[#630517]">موعد مع {consultant.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="date" min={riyadhToday()} value={date} onChange={(event) => { setDate(event.target.value); setTime(''); }} className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold" required />
              <input value={visitorName} onChange={(event) => setVisitorName(event.target.value)} placeholder="اسمك" className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold" required />
              <input value={visitorPhone} onChange={(event) => setVisitorPhone(event.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold" required />
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className="rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold">
                {CONSULT_TOPICS.map((item) => <option key={item}>{item}</option>)}
                <option>أخرى</option>
              </select>
            </div>
            {topic === 'أخرى' ? (
              <input value={customTopic} onChange={(event) => setCustomTopic(event.target.value)} placeholder="موضوع الاستشارة" className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold" required />
            ) : null}
            <div className="space-y-2">
              <p className="text-xs font-black text-[#630517]">طريقة الاجتماع</p>
              <div className="flex flex-wrap gap-2">
                {MEETING_APPS.map((app) => (
                  <button key={app} type="button" onClick={() => setMeetingApp(app)} className={`rounded-full px-4 py-2 text-xs font-black ${meetingApp === app ? 'bg-[#630517] text-[#F5D061]' : 'bg-[#fff6d6] text-[#630517]'}`}>
                    {app}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-black text-[#630517]">من 4 العصر إلى 10 الليل</p>
              {times.length === 0 ? (
                <p className="text-sm font-bold text-stone-500">ما فيه وقت باقي في هذا اليوم. اختر يوماً ثانياً.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {times.map((item) => (
                    <button key={item} type="button" onClick={() => setTime(item)} className={`rounded-2xl px-3 py-2 text-xs font-black ${time === item ? 'bg-[#630517] text-[#F5D061]' : 'bg-[#fff6d6] text-[#1a0208]'}`}>
                      {formatConsultTime(item)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={busy || !time} className="w-full rounded-xl bg-[#630517] py-3 text-sm font-black text-[#F5D061] disabled:opacity-60">
              {busy ? 'نرسل الطلب...' : mine?.status === 'rejected' ? 'غيّر الموعد وأرسله' : 'أرسل الموعد للطاقم'}
            </button>
            {notice ? <p className="text-center text-sm font-bold text-[#630517]">{notice}</p> : null}
            {sentUrl ? (
              <a href={sentUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-sm font-black text-[#1f7a3a]">فتح رسالة WhatsApp للمستشار</a>
            ) : null}
          </form>
        ) : null}

        <form
          onSubmit={(event) => { event.preventDefault(); setLookupPhone(lookupPhone.trim()); }}
          className="rounded-3xl border border-stone-200 bg-white p-5 space-y-3"
        >
          <h2 className="text-sm font-black text-[#630517]">تابع طلبك</h2>
          <div className="flex gap-2">
            <input value={lookupPhone} onChange={(event) => setLookupPhone(event.target.value)} placeholder="رقم جوالك" dir="ltr" className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-sm font-bold" />
            <button type="submit" className="rounded-xl bg-[#1a0208] px-4 text-xs font-black text-[#F5D061]">عرض</button>
          </div>
        </form>

        {onTeam ? (
          <p className="text-center text-[11px] text-stone-400">
            <Link href="/consultations/desk" className="font-bold text-[#630517]">لوحة طاقم الاستشارات</Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
