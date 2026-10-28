'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { defaultFaqPage, loadFaqPage, publishedFaqItems, type FaqPage } from '../lib/faq';
import { ClubIcon } from '../components/icons';
import Footer from '../components/Footer';

export default function FaqPage() {
  const [page, setPage] = useState<FaqPage>(() => defaultFaqPage());
  const [openId, setOpenId] = useState<string | null>(null);
  const items = publishedFaqItems(page);

  useEffect(() => {
    loadFaqPage(db).then((data) => {
      setPage(data);
      const first = publishedFaqItems(data)[0];
      if (first) setOpenId(first.id);
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#F6F0E8] text-slate-900" dir="rtl">
      <section className="bg-gradient-to-br from-[#3a020c] via-[#630517] to-[#4A030F] text-white py-14 px-4 sm:px-6 border-b-4 border-[#F5D061]">
        <div className="max-w-3xl mx-auto space-y-4 text-center">
          <Link href="/" className="block text-xs font-bold text-[#F5D061] hover:underline">
            ← العودة للرئيسية
          </Link>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#F5D061] text-[#630517] text-[11px] font-black">
            <ClubIcon name="info" size={13} /> الأسئلة الشائعة
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">أسئلة يتكرر طرحها</h1>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-3">
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#630517]/10 px-6 py-16 text-center space-y-2 shadow-sm">
            <p className="text-lg font-black text-[#630517]">ما نُشرت أسئلة بعد</p>
            <p className="text-sm text-slate-500">تظهر هنا فور إضافتها من لوحة التحكم.</p>
          </div>
        ) : (
          items.map((item) => {
            const open = openId === item.id;
            return (
              <article key={item.id} className="bg-white rounded-3xl border border-[#630517]/10 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  className="w-full text-right px-5 py-4 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-black text-[#630517] leading-relaxed">{item.question}</span>
                  <ClubIcon
                    name="chevronDown"
                    size={18}
                    className={`text-[#F5D061] transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open ? (
                  <div className="px-5 pb-5 text-sm text-slate-700 leading-8 border-t border-slate-100 pt-3">
                    {item.answer}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      <Footer />
    </main>
  );
}
