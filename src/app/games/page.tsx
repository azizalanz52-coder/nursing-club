import React from 'react';
import Link from 'next/link';
import { ClubIcon } from '../components/icons';

const CARDS = [
  {
    href: '/case-study',
    icon: 'stethoscope' as const,
    title: 'دراسة الحالة',
    text: 'ثلاث حالات سريرية، أربع خيارات لكل حالة.',
  },
  {
    href: '/games/word',
    icon: 'trophy' as const,
    title: 'تحدي الكلمة',
    text: 'كلمة طبية، ست محاولات، مرة كل يوم.',
  },
  {
    href: '/games/quiz',
    icon: 'zap' as const,
    title: 'دقيقة إسعاف',
    text: 'أربع حالات جديدة كل يوم، مرة واحدة.',
  },
];

export default function GamesHubPage() {
  return (
    <main className="min-h-[80vh] bg-[linear-gradient(180deg,#fffaf3_0%,#fff_40%,#fff6d6_100%)] px-4 py-10 sm:px-6" dir="rtl">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex rounded-2xl bg-[#630517] px-4 py-3 text-xs font-black text-[#F5D061]">
          العودة للرئيسية
        </Link>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#F5D061] px-3 py-1 text-[11px] font-black text-[#3b020b]">
          <ClubIcon name="sparkles" size={13} />
          كل يوم تحدٍ جديد
        </p>
        <h1 className="mt-4 text-3xl font-black text-[#630517] sm:text-4xl">الألعاب والتحديات</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[2rem] border-2 border-[#F5D061] bg-gradient-to-br from-[#4a0714] via-[#630517] to-[#8c1c32] p-6 text-white shadow-xl transition hover:-translate-y-1"
            >
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5D061] text-[#630517]">
                <ClubIcon name={card.icon} size={24} />
              </span>
              <span className="block text-xl font-black">{card.title}</span>
              <span className="mt-2 block text-sm font-medium leading-relaxed text-[#fff6d6]">{card.text}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
