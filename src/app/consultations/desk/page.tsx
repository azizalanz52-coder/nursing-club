'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { emailToPhone, isAdminPhone } from '../../lib/authIdentity';
import { canonicalPhone } from '../../lib/certificatesLookup';
import {
  CONSULT_FOCUSES,
  CONSULT_TEAM_LIMIT,
  decideConsultRequest,
  formatConsultDate,
  formatConsultTime,
  loadConsultations,
  reminderDue,
  reminderMessage,
  saveConsultations,
  publishRequests,
  whatsappUrl,
  type Consultant,
  type ConsultRequest,
} from '../../lib/consultations';

function newId() {
  return `person_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

async function loadStoredRequests() {
  const snap = await getDocs(collection(db, 'suggestions'));
  const rows: ConsultRequest[] = [];
  snap.forEach((item) => {
    const data = item.data();
    if (data.kind !== 'consultation') return;
    const request = {
      ...data,
      id: item.id,
      visitorName: data.visitorName || data.name,
    } as ConsultRequest;
    if (!request.visitorPhone || !request.date || !request.time) return;
    rows.push(request);
  });
  return rows.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

export default function ConsultationsDeskPage() {
  const [phone, setPhone] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [requests, setRequests] = useState<ConsultRequest[]>([]);
  const [name, setName] = useState('');
  const [focuses, setFocuses] = useState<string[]>([CONSULT_FOCUSES[0], CONSULT_FOCUSES[1]]);
  const [memberPhone, setMemberPhone] = useState('');
  const [links, setLinks] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    const [config, stored] = await Promise.all([loadConsultations(db), loadStoredRequests()]);
    setConsultants(config.consultants);
    setRequests(stored);
    setLoaded(true);
    await publishRequests(db, stored).catch(() => undefined);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setPhone(user ? emailToPhone(user.email) : '');
      setReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!phone) return;
    void reload().catch((err) => {
      console.error(err);
      setLoaded(true);
      setNotice('تعذر قراءة الطلبات.');
    });
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void loadStoredRequests().then(setRequests).catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [phone]);

  if (!ready || phone === null) {
    return <main className="min-h-screen bg-[#F6F0E8] grid place-items-center text-sm font-bold text-[#630517]" dir="rtl">نتحقق من الدخول...</main>;
  }

  if (!phone) {
    return (
      <main className="min-h-screen bg-[#F6F0E8] grid place-items-center p-6" dir="rtl">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center space-y-4 border border-[#F5D061]">
          <h1 className="text-2xl font-black text-[#630517]">لوحة طاقم الاستشارات</h1>
          <p className="text-sm font-bold text-stone-600">ادخل بحسابك عشان تشوف الطلبات وتوافق أو ترفض.</p>
          <Link href="/login?next=/consultations/desk" className="inline-block rounded-full bg-[#630517] px-6 py-3 text-sm font-black text-[#F5D061]">تسجيل الدخول</Link>
        </div>
      </main>
    );
  }

  const me = canonicalPhone(phone);
  const admin = isAdminPhone(me);
  const mine = consultants.find((person) => canonicalPhone(person.phone) === me);
  if (!loaded) {
    return <main className="min-h-screen bg-[#F6F0E8] grid place-items-center text-sm font-bold text-[#630517]" dir="rtl">نجمع الطلبات...</main>;
  }
  if (!mine) {
    return (
      <main className="min-h-screen bg-[#F6F0E8] grid place-items-center p-6" dir="rtl">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center space-y-3 border border-stone-200">
          <h1 className="text-xl font-black text-[#630517]">هذي اللوحة لطاقم الاستشارات</h1>
          <Link href="/consultations" className="inline-block text-sm font-black text-[#630517]">العودة للاستشارات</Link>
        </div>
      </main>
    );
  }

  const visible = requests.filter((item) => admin || !mine || item.consultantId === mine.id);
  const due = visible.filter((item) => reminderDue(item, now));

  const addConsultant = async (event: FormEvent) => {
    event.preventDefault();
    if (consultants.length >= CONSULT_TEAM_LIMIT) {
      setNotice('الطاقم ثلاثة أشخاص فقط.');
      return;
    }
    const person: Consultant = {
      id: newId(),
      name: name.trim(),
      focuses,
      phone: canonicalPhone(memberPhone),
    };
    if (!person.name || !/^05\d{8}$/.test(person.phone)) {
      setNotice('اكتب الاسم ورقم جوال يبدأ بـ 05.');
      return;
    }
    if (!person.focuses.length) {
      setNotice('اختر مجالاً واحداً على الأقل تحت اسمه.');
      return;
    }
    try {
      const next = [...consultants, person];
      await saveConsultations(db, { consultants: next });
      setConsultants(next);
      setName('');
      setMemberPhone('');
      setFocuses([CONSULT_FOCUSES[0], CONSULT_FOCUSES[1]]);
      setNotice(`انضاف ${person.name}.`);
    } catch (err) {
      console.error(err);
      setNotice('إضافة الطاقم من إدارة النادي.');
    }
  };

  const removeConsultant = async (id: string) => {
    try {
      const next = consultants.filter((person) => person.id !== id);
      await saveConsultations(db, { consultants: next });
      setConsultants(next);
    } catch (err) {
      console.error(err);
      setNotice('حذف الطاقم من إدارة النادي.');
    }
  };

  const decide = async (item: ConsultRequest, status: 'approved' | 'rejected') => {
    setNotice('');
    try {
      const result = await decideConsultRequest(db, item, {
        status,
        meetingLink: links[item.id] || '',
        rejectReason: reasons[item.id] || '',
      });
      setRequests((prev) => prev.map((row) => (row.id === item.id ? result.request : row)));
      if (result.whatsappUrl) window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
      setNotice(status === 'approved' ? 'تمت الموافقة وانفتحت رسالة الزائر.' : 'انرفض الموعد والزائر يقدر يغيّره.');
    } catch (err) {
      console.error(err);
      setNotice(err instanceof Error ? err.message : 'تعذر حفظ القرار.');
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F0E8] text-[#1a0208]" dir="rtl">
      <section className="bg-[#630517] text-[#fff6d6]">
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-2">
          <p className="text-xs font-black text-[#F5D061]">فريق ترياق · ثلاثة مستشارين</p>
          <h1 className="text-3xl font-black">طلبات الاستشارة</h1>
          <p className="text-sm font-bold text-white/80">إذا ناسب الوقت اضغط موافق وجهّز رابط الاجتماع. إذا ما ناسب اضغط رفض، والزائر يشوف السبب ويغيّر الموعد.</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {notice ? <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#630517]">{notice}</p> : null}

        {due.map((item) => (
          <a
            key={`remind-${item.id}`}
            href={whatsappUrl(item.visitorPhone, reminderMessage(item))}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-3xl bg-[#630517] px-5 py-4 text-sm font-black text-[#F5D061]"
          >
            باقي أقل من 10 دقائق مع {item.visitorName}. أرسل تذكير WhatsApp
          </a>
        ))}

        <section className="space-y-3">
          <h2 className="text-lg font-black">الطلبات ({visible.length})</h2>
          {visible.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm font-bold text-stone-500">ما فيه طلبات.</p>
          ) : visible.map((item) => (
            <article key={item.id} className="rounded-3xl border border-stone-200 bg-white p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-black">{item.visitorName}</h3>
                <span className="text-xs font-black text-[#630517]">
                  {item.status === 'approved' ? 'موافق' : item.status === 'rejected' ? 'مرفوض' : 'بانتظارك'}
                </span>
              </div>
              <p className="text-sm font-bold">{formatConsultDate(item.date)} · {formatConsultTime(item.time)}</p>
              <p className="text-sm font-bold">الموضوع: {item.topic}</p>
              <p className="text-xs font-bold text-stone-500">{item.meetingApp} · مع {item.consultantName} · {item.visitorPhone}</p>
              {item.meetingLink ? <p className="text-xs font-bold break-all">{item.meetingLink}</p> : null}
              {item.status === 'pending' ? (
                <div className="space-y-2">
                  {item.meetingApp !== 'WhatsApp' ? (
                    <input
                      value={links[item.id] || ''}
                      onChange={(event) => setLinks((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      placeholder={`رابط ${item.meetingApp}`}
                      className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-bold"
                      dir="ltr"
                    />
                  ) : (
                    <p className="text-xs font-bold text-stone-500">الاجتماع عبر WhatsApp، وجهّز المكالمة من رقمك.</p>
                  )}
                  <input
                    value={reasons[item.id] || ''}
                    onChange={(event) => setReasons((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    placeholder="سبب الرفض إذا ما ناسب الوقت"
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-bold"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { void decide(item, 'approved'); }} className="flex-1 rounded-xl bg-[#1f7a3a] py-2.5 text-xs font-black text-white">موافق</button>
                    <button type="button" onClick={() => { void decide(item, 'rejected'); }} className="flex-1 rounded-xl bg-[#630517] py-2.5 text-xs font-black text-[#F5D061]">رفض</button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </section>

        {admin ? (
          <section className="rounded-3xl border border-[#F5D061] bg-[#fff6d6] p-6 space-y-4">
            <h2 className="text-lg font-black text-[#630517]">الطاقم ({consultants.length}/{CONSULT_TEAM_LIMIT})</h2>
            {consultants.map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-black">{person.name}</p>
                  <p className="text-[11px] font-bold text-stone-500">{person.focuses.join(' · ')} · {person.phone}</p>
                </div>
                <button type="button" onClick={() => { void removeConsultant(person.id); }} className="text-xs font-black text-red-700">حذف</button>
              </div>
            ))}
            {consultants.length < CONSULT_TEAM_LIMIT ? (
              <form onSubmit={addConsultant} className="grid gap-3 sm:grid-cols-3">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="اسم المستشار" className="rounded-xl border border-[#F5D061] bg-white px-3 py-2 text-sm font-bold" required />
                <input value={memberPhone} onChange={(event) => setMemberPhone(event.target.value)} placeholder="05XXXXXXXX" dir="ltr" className="rounded-xl border border-[#F5D061] bg-white px-3 py-2 text-sm font-bold" required />
                <div className="flex flex-wrap gap-2 sm:col-span-3">
                  {CONSULT_FOCUSES.map((item) => {
                    const on = focuses.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setFocuses((current) => (
                          on ? current.filter((value) => value !== item) : [...current, item]
                        ))}
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${on ? 'bg-[#630517] text-[#F5D061]' : 'bg-white text-[#630517]'}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <button type="submit" className="sm:col-span-3 rounded-xl bg-[#630517] py-3 text-sm font-black text-[#F5D061]">إضافة المستشار</button>
              </form>
            ) : null}
          </section>
        ) : null}

        <p className="text-center">
          <Link href="/consultations" className="text-sm font-black text-[#630517]">صفحة الاستشارات</Link>
        </p>
      </div>
    </main>
  );
}
