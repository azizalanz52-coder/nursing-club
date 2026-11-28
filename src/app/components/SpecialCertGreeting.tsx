'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { emailToPhone } from '../lib/authIdentity';
import { findMemberContext } from '../lib/memberAcceptance';
import { certDisplayUrl } from '../lib/uploadFile';
import { dismissSpecialCertGreeting, readPendingSpecialCerts, type SpecialCertGreeting } from '../lib/specialCertificates';

const SPLASH_KEY = 'nurs_splash_seen';

const LOCAL_EXAMPLE: SpecialCertGreeting = {
  certId: 'local-example',
  title: 'شهادة تميز في دراسة الحالة',
  recipientName: 'محمد احمد ناصر',
  message: 'مبروك يا محمد، هذه شهادتك الخاصة تقديراً لالتزامك في دراسة الحالة. تقدر ترجع لها من تبويب الشهادات وقت ما تبي.',
  issuedAt: 0,
};

function localExampleRequested() {
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  return new URLSearchParams(window.location.search).get('preview') === 'special-cert';
}

export default function SpecialCertGreetingHost() {
  const [greeting, setGreeting] = useState<SpecialCertGreeting | null>(null);
  const [phone, setPhone] = useState('');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    if (!localExampleRequested()) return;
    setDemo(true);
    const wait = sessionStorage.getItem(SPLASH_KEY) === '1' ? 0 : 2600;
    const timer = window.setTimeout(() => setGreeting(LOCAL_EXAMPLE), wait);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    let timer = 0;
    const unsub = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timer);
      const current = emailToPhone(user?.email);
      if (!current) {
        if (!cancelled) {
          setGreeting(null);
          setPhone('');
        }
        return;
      }
      const wait = sessionStorage.getItem(SPLASH_KEY) === '1' ? 500 : 2700;
      timer = window.setTimeout(() => {
        void findMemberContext(db, current)
          .then((context) => {
            if (cancelled) return;
            const pending = readPendingSpecialCerts(context.data).sort((a, b) => a.issuedAt - b.issuedAt);
            setPhone(context.phone || current);
            setGreeting(pending[0] || null);
          })
          .catch((err) => console.error(err));
      }, wait);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsub();
    };
  }, [demo]);

  useEffect(() => {
    if (!greeting?.certId || greeting.certId === 'local-example') {
      setPreview('');
      return;
    }
    let cancelled = false;
    void getDoc(doc(db, 'site_certificates', greeting.certId))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        setPreview(certDisplayUrl(snap.data()));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [greeting?.certId]);

  const close = async () => {
    if (!greeting || busy) return;
    if (demo) {
      setGreeting(null);
      return;
    }
    if (!phone) return;
    setBusy(true);
    setError('');
    try {
      await dismissSpecialCertGreeting(db, phone, greeting.certId);
      setGreeting(null);
    } catch (err) {
      console.error(err);
      setError('تعذر إغلاق المباركة. حاول مرة ثانية.');
    } finally {
      setBusy(false);
    }
  };

  if (!greeting) return null;
  const image = preview && !preview.toLowerCase().includes('application/pdf') && !preview.toLowerCase().includes('.pdf');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#1a0208]/70" />
      <section className="relative w-full max-w-md overflow-hidden rounded-[1.7rem] bg-[#fff6d6] shadow-[0_24px_60px_rgba(26,2,8,0.45)]">
        <div className="h-1.5 bg-[#F5D061]" />
        <div className="space-y-4 px-6 py-6 text-center">
          <p className="text-xs font-black tracking-wide text-[#630517]">شهادة خاصة</p>
          <h2 className="text-2xl font-black text-[#1a0208]">مبروك{greeting.recipientName ? ` يا ${greeting.recipientName}` : ''}</h2>
          {greeting.title ? <p className="text-sm font-black text-[#630517]">{greeting.title}</p> : null}
          <p className="rounded-2xl bg-white px-4 py-3 text-sm font-bold leading-7 text-[#1a0208]">{greeting.message}</p>
          {image ? (
            <img src={preview} alt={greeting.title || 'الشهادة'} className="mx-auto max-h-48 w-full rounded-2xl border border-[#F5D061] object-contain bg-white" />
          ) : null}
          <p className="text-xs font-bold leading-6 text-[#630517]/80">الشهادة محفوظة في تبويب الشهادات، وتقدر ترجع لها في أي وقت.</p>
          {error ? <p className="text-xs font-bold text-red-700">{error}</p> : null}
          <Link
            href="/certificates"
            onClick={() => { void close(); }}
            aria-disabled={busy}
            className={`block w-full rounded-full bg-[#630517] py-2.5 text-xs font-black text-[#F5D061] ${busy ? 'pointer-events-none opacity-60' : ''}`}
          >
            {busy ? 'نحفظ...' : 'شهاداتي'}
          </Link>
        </div>
      </section>
    </div>
  );
}
