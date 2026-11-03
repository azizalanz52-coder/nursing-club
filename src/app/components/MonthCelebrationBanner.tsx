'use client';

import { useEffect, useState } from 'react';
import { ClubIcon } from './icons';
import { isMonthCelebrationLive, MONTH_CELEBRATION, type MonthHonoree } from '../lib/monthCelebration';

function RankMedal({ rank }: { rank: MonthHonoree['rank'] }) {
  const gold = rank === 'gold';
  return (
    <div
      className={`relative mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
        gold
          ? 'bg-gradient-to-br from-[#F5D061] via-amber-200 to-[#c9a227] text-[#630517] shadow-[0_0_24px_rgba(245,208,97,0.55)]'
          : 'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-700 shadow-[0_0_16px_rgba(148,163,184,0.35)]'
      }`}
      style={{ animation: 'monthMedalPulse 2.2s ease-in-out infinite' }}
      aria-hidden
    >
      <ClubIcon name="medal" size={26} />
      <span
        className={`pointer-events-none absolute inset-0 rounded-full border ${
          gold ? 'border-[#F5D061]/80' : 'border-slate-200/90'
        }`}
        style={{ animation: 'monthMedalRing 2.2s ease-in-out infinite' }}
      />
    </div>
  );
}

export default function MonthCelebrationBanner() {
  const [live, setLive] = useState(() => isMonthCelebrationLive());

  useEffect(() => {
    setLive(isMonthCelebrationLive());
    const timer = window.setInterval(() => setLive(isMonthCelebrationLive()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!live) return null;

  return (
    <section
      data-month-celebration="1"
      className="relative overflow-hidden border-y border-[#F5D061]/35 bg-gradient-to-br from-[#3a020c] via-[#630517] to-[#4A030F] text-white"
      dir="rtl"
    >
      <style>{`
        @keyframes monthMedalPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.06); filter: brightness(1.12); }
        }
        @keyframes monthMedalRing {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.18); opacity: 0.25; }
        }
      `}</style>
      <div className="absolute -top-16 left-[-10%] h-56 w-56 rounded-full bg-[#F5D061]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-[-8%] h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12 text-center space-y-6">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5D061]/15 text-[#F5D061] text-[11px] font-black border border-[#F5D061]/30">
          <ClubIcon name="medal" size={13} />
          شكر وتقدير
        </span>

        <h2 className="text-2xl sm:text-4xl font-black leading-tight tracking-tight">
          {MONTH_CELEBRATION.headline}
        </h2>

        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto pt-1">
          {MONTH_CELEBRATION.honorees.map((honoree) => {
            const gold = honoree.rank === 'gold';
            return (
              <div
                key={honoree.id}
                className={`rounded-[1.6rem] px-5 py-5 text-center backdrop-blur-sm border ${
                  gold
                    ? 'border-[#F5D061]/55 bg-[#F5D061]/10 shadow-[0_12px_40px_rgba(245,208,97,0.12)]'
                    : 'border-white/20 bg-white/[0.08]'
                }`}
              >
                <RankMedal rank={honoree.rank} />
                <p className={`text-[11px] font-black mb-1 ${gold ? 'text-[#F5D061]' : 'text-slate-200'}`}>
                  {honoree.rankLabel}
                </p>
                <p className="text-lg sm:text-xl font-black text-white leading-snug">{honoree.fullName}</p>
                <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-black">
                  <span
                    className={`px-3 py-1 rounded-full ${
                      gold ? 'bg-[#F5D061] text-[#630517]' : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {honoree.points} نقطة
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/15">
                    {honoree.days} يوماً
                  </span>
                </div>
                <p className="mt-3 text-[12px] sm:text-sm text-amber-50/85 leading-relaxed font-medium">
                  {honoree.blurb}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
