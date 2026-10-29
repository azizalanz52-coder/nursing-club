'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClubIcon } from './icons';
import { WEEKLY_COPY } from '../lib/caseStudyWeekly';

const DISMISS_KEY = 'nurs_week_live_notice_v6';

export default function WeeklyMechanismNotice({
  onBlockingChange,
}: {
  onBlockingChange?: (blocking: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const shouldOpen = localStorage.getItem(DISMISS_KEY) !== '1';
    setOpen(shouldOpen);
    setReady(true);
    onBlockingChange?.(shouldOpen);
  }, [onBlockingChange]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
    onBlockingChange?.(false);
  };

  if (!ready) return null;

  if (!open) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-6" dir="rtl">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] font-black text-[#630517] hover:underline cursor-pointer inline-flex items-center gap-1.5"
        >
          <ClubIcon name="info" size={13} /> آلية المنافسة الأسبوعية
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[420] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[1.8rem] bg-white border-2 border-[#F5D061]/50 shadow-[0_25px_60px_rgba(99,5,23,0.28)]">
        <div className="h-1.5 bg-gradient-to-l from-[#F5D061] via-amber-300 to-[#630517]" />
        <div className="p-5 sm:p-7 space-y-5 text-right">
          <div className="space-y-2 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-[11px] font-black">
              <ClubIcon name="bell" size={13} /> إضافة جديدة
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#630517]">آلية المنافسة الأسبوعية</h2>
            <p className="text-sm text-slate-600 font-medium leading-7">{WEEKLY_COPY.noticeIntro}</p>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium leading-7">
            {WEEKLY_COPY.noticePoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <Link
            href="/faq#faq-week"
            className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#630517] hover:underline"
          >
            <ClubIcon name="info" size={13} /> الأسئلة الشائعة
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-3.5 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-sm cursor-pointer hover:brightness-110"
          >
            فهمت، أدخل التحدي
          </button>
        </div>
      </div>
    </div>
  );
}
