'use client';

import { useState } from 'react';

type MediaWorkflowNoticeProps = {
  audience: 'member' | 'leader';
};

const STEPS = [
  'أسماء الفعاليات تجي من قسم الفعاليات. أي فعالية تنزل هناك تظهر في القائمة تلقائياً، وما يحتاج أحد يكتب الاسم مرة ثانية.',
  'العضو والقائد يختارون الفعالية ويرفعون صوراً فقط. كل صورة حدها 8 ميغابايت، والفعالية تقف عند 50 صورة. الصورة المرفوضة ما تحسب من هذا الحد.',
  'الصورة توصل بانتظار الاعتماد. في لوحة الإدارة والرؤساء، قسم لجنة الإعلام، تُعتمد فتظهر في معرض الأنشطة، أو تُرفض.',
  'العدد يحسب للرافع من لحظة الرفع. يبقى محسوباً حتى لو انرفضت الصورة، وحتى لو انحذفت من القائمة بعد يوم من الرفض.',
  'في لوحة القادة يظهر اسم كل عضو وعدد صوره، وتحت الاسم توزيعها على الفعاليات. القائد يرفع من نفس خانة الأعضاء.',
];

export default function MediaWorkflowNotice({ audience }: MediaWorkflowNoticeProps) {
  const [open, setOpen] = useState(true);
  const place = audience === 'leader' ? 'لوحة تحكم القادة' : 'بوابة الأعضاء';

  return (
    <section className="rounded-3xl border border-[#F5D061] bg-[#fff6d6] p-5 sm:p-6" dir="rtl" role="note">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 text-right cursor-pointer"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#630517] text-[#F5D061] text-lg font-black">!</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-black text-[#630517]/70">تنبيه آلية العمل · {place}</span>
          <span className="block text-lg font-black text-[#630517] mt-0.5">كيف يشتغل رفع لجنة الإعلام</span>
        </span>
        <span className="shrink-0 rounded-full bg-[#630517] px-3 py-1.5 text-[11px] font-black text-[#F5D061]">
          {open ? 'تصغير' : 'تكبير'}
        </span>
      </button>
      {open ? (
        <ol className="mt-4 space-y-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm font-medium leading-7 text-slate-800">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#630517] text-[#F5D061] text-[11px] font-black">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
