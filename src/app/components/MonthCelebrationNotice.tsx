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

function previewHonoreeFromUrl(): MonthHonoree | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('celebrate');
  if (!id) return null;
  return MONTH_CELEBRATION.honorees.find((h) => h.id === id) || null;
}

export default function MonthCelebrationNotice() {
  const [honoree, setHonoree] = useState<MonthHonoree | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const fromUrl = previewHonoreeFromUrl();
    if (fromUrl) {
      setPreview(true);
      setHonoree(fromUrl);
      return;
    }

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

  const gold = honoree.rank === 'gold';
  const dismiss = () => {
    if (!preview) {
      localStorage.setItem(monthCelebrationSeenKey(honoree.id), '1');
    }
    setHonoree(null);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true">
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
      <button type="button" aria-label="إغلاق" className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={dismiss} />
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-[1.75rem] shadow-[0_24px_60px_rgba(99,5,23,0.35)] ${
          gold
            ? 'bg-gradient-to-b from-[#4a0310] via-[#630517] to-[#3a020c] text-white'
            : 'bg-gradient-to-b from-slate-700 via-slate-600 to-slate-800 text-white'
        }`}
      >
        <div
          className={`h-1.5 ${
            gold
              ? 'bg-gradient-to-l from-[#F5D061] via-amber-200 to-[#F5D061]'
              : 'bg-gradient-to-l from-slate-200 via-white to-slate-300'
          }`}
        />
        <section className="px-6 pt-7 pb-6 text-center space-y-4">
          <div
            className={`relative mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              gold
                ? 'bg-gradient-to-br from-[#F5D061] via-amber-200 to-[#c9a227] text-[#630517] shadow-[0_0_24px_rgba(245,208,97,0.55)]'
                : 'bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-700 shadow-[0_0_16px_rgba(148,163,184,0.4)]'
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

          <div className="space-y-2">
            <p className={`text-[11px] font-black ${gold ? 'text-[#F5D061]' : 'text-slate-200'}`}>
              {honoree.rankLabel} · {honoree.points} نقطة
            </p>
            <h3 className="text-xl font-black leading-snug text-white">{MONTH_CELEBRATION.personalTitle}</h3>
            <p className={`text-sm font-medium leading-7 ${gold ? 'text-amber-50/90' : 'text-slate-100/90'}`}>
              {honoree.shortName}، {MONTH_CELEBRATION.personalBody}
            </p>
            <p className={`text-[12px] font-bold leading-relaxed ${gold ? 'text-[#F5D061]/90' : 'text-slate-200/90'}`}>
              {honoree.blurb}
            </p>
          </div>

          <button
            type="button"
            onClick={dismiss}
            className={`w-full py-3 rounded-2xl font-black text-xs hover:brightness-110 cursor-pointer ${
              gold ? 'bg-[#F5D061] text-[#630517]' : 'bg-slate-100 text-slate-800'
            }`}
          >
            شكراً، أكمل التصفح
          </button>
        </section>
      </div>
    </div>
  );
}
