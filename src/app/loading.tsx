'use client';

import React from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#3b020c] via-[#630517] to-[#1a0004] flex items-center justify-center px-4 relative overflow-hidden selection:bg-[#F5D061] selection:text-[#630517]" dir="rtl">
      
      {/* خلفية ضوئية متحركة بنبض تلقائي */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F5D061]/20 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      
      {/* البوكس الزجاجي الفاخر */}
      <div className="max-w-md w-full bg-black/60 backdrop-blur-2xl border-2 border-[#F5D061]/40 p-8 sm:p-10 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] text-center space-y-7 text-white relative z-10">
        
        {/* شعار النادي مع إطار مضيء ونابض */}
        <div className="relative w-24 h-24 mx-auto bg-gradient-to-b from-[#7a081d] to-[#42030f] border-2 border-[#F5D061]/80 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(245,208,97,0.3)] animate-bounce duration-1000">
          <Image
            src="/logo.png"
            alt="شعار نادي التمريض"
            width={58}
            height={58}
            className="object-contain drop-shadow-md"
          />
        </div>

        {/* شارة علوية متألقة */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5D061]/15 border border-[#F5D061]/50 text-[#F5D061] text-xs font-black tracking-wider uppercase shadow-inner">
          <span className="animate-spin text-sm">✨</span>
          <span>جاري تجهيز التجربة الاستثنائية</span>
        </div>

        {/* الصلاة على النبي والنص التوضيحي */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-amber-100 leading-relaxed drop-shadow-md">
            اللهم صل وسلم على نبينا محمد
          </h2>
          <p className="text-amber-50/80 text-xs sm:text-sm font-medium leading-relaxed">
            نُعد لك منصة رقمية متكاملة تليق بإنجازات نادي التمريض.. لحظات معدودة وتكتمل البوصلة 🩺✨
          </p>
        </div>

        {/* شريط التحميل المضيء والمتحرك */}
        <div className="space-y-2">
          <div className="w-full bg-black/80 rounded-full h-3.5 p-0.5 border border-[#F5D061]/40 overflow-hidden relative shadow-inner">
            <div className="bg-gradient-to-r from-amber-400 via-[#F5D061] to-yellow-200 h-full rounded-full animate-pulse w-3/4 shadow-[0_0_15px_rgba(245,208,97,0.9)]"></div>
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#F5D061] font-bold px-1">
            <span>جاري تحميل المكونات...</span>
            <span className="animate-pulse">متصل بقاعدة البيانات ⚡</span>
          </div>
        </div>

        {/* التوقيع السفلي */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[11px] text-[#F5D061] font-black tracking-widest uppercase">
            نادي التمريض • جامعة حفر الباطن
          </span>
        </div>

      </div>
    </main>
  );
}