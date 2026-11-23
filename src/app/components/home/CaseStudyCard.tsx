'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ClubIcon } from '../icons';

const LINKS = [
  {
    href: '/games/word',
    icon: 'trophy' as const,
    title: 'تحدي الكلمة',
    text: 'كلمة طبية خاصة فيك، ست محاولات.',
  },
  {
    href: '/games/quiz',
    icon: 'zap' as const,
    title: 'دقيقة إسعاف',
    text: 'أربع حالات جديدة، مرة واحدة اليوم.',
  },
];

export default function CaseStudyCard() {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-10" dir="rtl">
      <div className="relative overflow-hidden rounded-[2.2rem] border-2 border-[#F5D061] bg-gradient-to-br from-[#4a0714] via-[#630517] to-[#8c1c32] p-6 text-white shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -top-16 -left-10 text-[#F5D061]/15">
          <ClubIcon name="trophy" size={120} />
        </div>
        <div className="pointer-events-none absolute -bottom-10 -right-6 text-[#F5D061]/10">
          <ClubIcon name="medal" size={110} />
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="relative z-10 flex w-full items-center justify-between gap-4 text-right"
          aria-expanded={open}
        >
          <span className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F5D061] px-3 py-1 text-[11px] font-black text-[#3b020b]">
              <ClubIcon name="sparkles" size={13} />
              كل يوم تحدٍ جديد
            </span>
            <span className="block text-3xl font-black leading-tight sm:text-4xl">الألعاب والتحديات</span>
            <span className="block max-w-xl text-sm font-medium leading-relaxed text-[#fff6d6]">
              دراسة الحالة، تحدي الكلمة، ودقيقة الإسعاف. اضغط واختر وين تبي تدخل.
            </span>
          </span>
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#F5D061] text-[#630517] shadow-lg">
            <ClubIcon name={open ? 'chevronDown' : 'award'} size={28} />
          </span>
        </button>
        {open ? (
          <div className="relative z-10 mt-6 space-y-3">
            <Link href="/case-study" className="flex items-center gap-3 rounded-3xl border border-[#F5D061]/40 bg-[#1a0208]/35 p-4 transition hover:bg-[#1a0208]/55">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5D061] text-[#630517]">
                <ClubIcon name="stethoscope" size={20} />
              </span>
              <span>
                <span className="block text-base font-black">دراسة الحالة</span>
                <span className="mt-1 block text-xs font-medium leading-relaxed text-[#fff6d6]/85">ثلاث حالات سريرية، أربع خيارات لكل حالة.</span>
              </span>
            </Link>
            <div className="grid gap-3 sm:grid-cols-2">
              {LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-3xl border border-[#F5D061]/40 bg-[#1a0208]/35 p-4 transition hover:bg-[#1a0208]/55"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5D061] text-[#630517]">
                    <ClubIcon name={item.icon} size={20} />
                  </span>
                  <span>
                    <span className="block text-base font-black">{item.title}</span>
                    <span className="mt-1 block text-xs font-medium leading-relaxed text-[#fff6d6]/85">{item.text}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative z-10 mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F5D061]/40 px-3 py-1 text-[11px] font-bold text-[#F5D061]">
              <ClubIcon name="stethoscope" size={13} /> دراسة الحالة
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F5D061]/40 px-3 py-1 text-[11px] font-bold text-[#F5D061]">
              <ClubIcon name="trophy" size={13} /> تحدي الكلمة
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F5D061]/40 px-3 py-1 text-[11px] font-bold text-[#F5D061]">
              <ClubIcon name="zap" size={13} /> دقيقة إسعاف
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
