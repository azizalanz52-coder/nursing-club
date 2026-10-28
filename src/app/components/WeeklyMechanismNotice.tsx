'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClubIcon } from './icons';

const DISMISS_KEY = 'nurs_week_mech_notice';

export default function WeeklyMechanismNotice() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY) === '1') setOpen(false);
  }, []);

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
    <aside className="max-w-3xl mx-auto px-4 pt-6" dir="rtl">
      <div className="rounded-3xl border-2 border-[#F5D061] bg-white p-5 sm:p-6 space-y-3 text-right shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-amber-800">تنبيه · إضافة جديدة</p>
            <h2 className="text-base sm:text-lg font-black text-[#630517]">آلية المنافسة الأسبوعية</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, '1');
              setOpen(false);
            }}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 cursor-pointer shrink-0"
            aria-label="إخفاء التنبيه"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium leading-7">
          <li>لوحة الصدارة فيها تبويبان: <strong>الصدارة العامة</strong> للمجموع من أول يوم، و<strong>متصدر الأسبوع</strong> ونقاطه تبدأ من الصفر كل أحد.</li>
          <li>الأسبوع يُقفل <strong>السبت 11:59 م بتوقيت الرياض</strong>، وتُحسب صدارة ذلك الأسبوع مرة واحدة.</li>
          <li>متصدر الأسبوع، متصدر الأسبوع الماضي، صاحب أطول سلسلة، وأسبوع كامل 3/3 تظهر كشارات بجانب الاسم. ألوان الأرقام توضّح المراكز بدون منصات مكتوبة.</li>
          <li>عند تعادل النقاط يتقدم من كان <strong>الأسرع في أكثر أيام الأسبوع</strong>، ثم الأكثر أيام 3/3.</li>
          <li>إذا بقي التعادل بعد الفواصل يتشارك الاثنان صدارة الأسبوع.</li>
          <li>الشهادة الخاصة لمن يجمع <strong>3 صدارات أسبوعية خلال الفصل</strong>، ليست بالضرورة متتالية.</li>
        </ul>
        <Link
          href="/faq#faq-week"
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#630517] hover:underline"
        >
          <ClubIcon name="info" size={13} /> التفاصيل في الأسئلة الشائعة
        </Link>
      </div>
    </aside>
  );
}
