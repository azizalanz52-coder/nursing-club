'use client';

import { useEffect, useState } from 'react';
import { ClubIcon } from './icons';
import { isMonthCelebrationLive, MONTH_CELEBRATION } from '../lib/monthCelebration';

export default function MonthCelebrationBanner() {
  const [live, setLive] = useState(false);

  useEffect(() => {
    setLive(isMonthCelebrationLive());
    const timer = window.setInterval(() => setLive(isMonthCelebrationLive()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!live) return null;

  return (
    <section className="relative overflow-hidden border-y border-[#F5D061]/35 bg-gradient-to-br from-[#3a020c] via-[#630517] to-[#4A030F] text-white" dir="rtl">
      <div className="absolute -top-16 left-[-10%] h-56 w-56 rounded-full bg-[#F5D061]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-[-8%] h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12 text-center space-y-5">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5D061]/15 text-[#F5D061] text-[11px] font-black border border-[#F5D061]/30">
          <ClubIcon name="medal" size={13} />
          تكريم دراسة الحالة
        </span>

        <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
          {MONTH_CELEBRATION.headline}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {MONTH_CELEBRATION.honorees.map((honoree) => (
            <div
              key={honoree.id}
              className="min-w-[9.5rem] rounded-2xl border border-[#F5D061]/35 bg-white/8 px-5 py-4 backdrop-blur-sm"
            >
              <p className="text-[#F5D061] text-[10px] font-black mb-1">{MONTH_CELEBRATION.badgeLabel}</p>
              <p className="text-base sm:text-lg font-black text-white leading-snug">{honoree.fullName}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
