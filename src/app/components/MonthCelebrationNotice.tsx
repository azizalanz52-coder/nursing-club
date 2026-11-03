'use client';

import { useEffect, useState } from 'react';
import { ClubIcon } from './icons';
import {
  isMonthCelebrationLive,
  matchMonthHonoree,
  monthCelebrationSeenKey,
  MONTH_CELEBRATION,
  type MonthHonoree,
} from '../lib/monthCelebration';

export default function MonthCelebrationNotice() {
  const [honoree, setHonoree] = useState<MonthHonoree | null>(null);

  useEffect(() => {
    if (!isMonthCelebrationLive()) return;
    const storedName = localStorage.getItem('userName') || '';
    const matched = matchMonthHonoree(storedName);
    if (!matched) return;
    const key = monthCelebrationSeenKey(matched.id);
    if (localStorage.getItem(key) === '1') return;
    const timer = window.setTimeout(() => setHonoree(matched), 2600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!honoree) return null;

  const dismiss = () => {
    localStorage.setItem(monthCelebrationSeenKey(honoree.id), '1');
    setHonoree(null);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true">
      <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/45 backdrop-blur-md" onClick={dismiss} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_60px_rgba(99,5,23,0.28)]">
        <div className="h-1.5 bg-gradient-to-l from-[#630517] via-[#F5D061] to-[#630517]" />
        <section className="px-6 pt-7 pb-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#630517] text-[#F5D061]">
            <ClubIcon name="medal" size={22} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-black text-[#630517]/70">نادي التمريض</p>
            <h3 className="text-[#630517] text-xl font-black leading-snug">{MONTH_CELEBRATION.personalTitle}</h3>
            <p className="text-slate-600 text-sm font-medium leading-7">
              {honoree.shortName}، {MONTH_CELEBRATION.personalBody}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs hover:brightness-110 cursor-pointer"
          >
            شكراً، أكمل التصفح
          </button>
        </section>
      </div>
    </div>
  );
}
