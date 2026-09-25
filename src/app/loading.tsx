'use file';
'use client';

import React from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  return (
    <main className="min-h-screen bg-[#0d0104] flex items-center justify-center px-4 relative overflow-hidden selection:bg-[#F5D061] selection:text-[#630517]" dir="rtl">
      
      {/* خلفية هندسية عميقة مع توهج أحمر وذهبي خفيف */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,5,23,0.3)_0%,transparent_70%)] pointer-events-none"></div>
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#630517]/40 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#F5D061]/10 rounded-full blur-[140px] pointer-events-none"></div>

      {/* الحاوية الرئيسية بتصميم زجاجي عائم (Floating Glass Card) */}
      <div className="max-w-lg w-full bg-[#140206]/80 backdrop-blur-3xl border border-[#F5D061]/20 p-8 sm:p-12 rounded-[48px] shadow-[0_30px_100px_rgba(0,0,0,0.9)] text-center space-y-8 relative z-10">
        
        {/* رادار بصري متحرك وحلقات مضيئة تحيط بالشعار */}
        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
          {/* حلقة التدفق الخارجية */}
          <div className="absolute inset-0 rounded-full border border-dashed border-[#F5D061]/40 animate-[spin_10s_linear_infinite]"></div>
          {/* حلقة النبض الداخلية */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-[#630517] to-[#F5D061]/20 animate-pulse blur-sm"></div>
          
          {/* بوسك الشعار المركزي */}
          <div className="relative w-20 h-20 bg-[#1f0308] border border-[#F5D061]/60 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(245,208,97,0.3)]">
            <Image
              src="/logo.png"
              alt="شعار نادي التمريض"
              width={48}
              height={48}
              className="object-contain drop-shadow-[0_2px_8px_rgba(245,208,97,0.5)]"
            />
          </div>
        </div>

        {/* مؤشر حالة بصري فخم */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/10 text-amber-200/90 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#F5D061] animate-ping"></span>
          <span className="font-mono">INITIALIZING SYSTEM...</span>
        </div>

        {/* الصلاة على النبي (العنصر الأساسي المتبقي) مع تصميم نصي فاخر */}
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-[#F5D061] leading-tight">
            اللهم صل وسلم على نبينا محمد
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-medium">
            نحضر لك بيئة عمل رقمية ذكية تليق بطموحات نادي التمريض
          </p>
        </div>

        {/* شريط تحميل احترافي بتصميم Minimalist متطور */}
        <div className="space-y-3 pt-2">
          <div className="w-full bg-black/80 rounded-full h-2 p-0.5 border border-white/10 overflow-hidden relative">
            <div className="bg-gradient-to-r from-[#630517] via-[#F5D061] to-amber-200 h-full rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-4/5 shadow-[0_0_12px_rgba(245,208,97,0.8)]"></div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono tracking-widest px-1">
            <span>SECURE CONNECTION</span>
            <span className="text-[#F5D061]/80 font-bold">READY TO LAUNCH</span>
          </div>
        </div>

        {/* التوقيع السفلي */}
        <div className="pt-4 border-t border-white/5 flex flex-col items-center gap-1">
          <span className="text-[10px] text-zinc-400 font-semibold tracking-widest uppercase">
            نادي التمريض • جامعة حفر الباطن
          </span>
          <span className="text-[9px] text-zinc-600 font-mono">2026 © ALL RIGHTS RESERVED</span>
        </div>

      </div>
    </main>
  );
}