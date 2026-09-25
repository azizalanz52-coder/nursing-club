'use client';

import React from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#4a0310] via-[#630517] to-[#2c0108] flex items-center justify-center px-4 relative overflow-hidden selection:bg-[#F5D061] selection:text-[#630517]" dir="rtl">
      
      {/* تأثيرات خلفية ضوئية متحركة ومتعددة الأبعاد */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#F5D061]/15 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* البوكس الزجاجي الفاخر */}
      <div className="max-w-md w-full bg-black/50 backdrop-blur-2xl border border-[#F5D061]/40 p-8 sm:p-10 rounded-[36px] shadow-[0_0_50px_rgba(0,0,0,0.6)] text-center space-y-7 text-white relative z-10 overflow-hidden group">
        
        {/* إطار إشعاعي خلف الشعار */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#F5D061]/10 rounded-full blur-2xl group-hover:bg-[#F5D061]/20 transition-all duration-700"></div>

        {/* أيقونة أو شعار النادي بتصميم نبضي متحرك */}
        <div className="relative w-24 h-24 mx-auto bg-gradient-to-b from-[#630517] to-[#3a020d] border-2 border-[#F5D061]/60 rounded-3xl flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden transform hover:scale-105 transition-transform duration-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#F5D061]/20 to-transparent animate-shimmer"></div>
          <Image
            src="/logo.png"
            alt="شعار نادي التمريض"
            width={60}
            height={60}
            className="object-contain drop-shadow-[0_4px_10px_rgba(245,208,97,0.4)] animate-pulse"
          />
        </div>

        {/* شارة علوية متألقة */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#F5D061]/10 via-[#F5D061]/20 to-[#F5D061]/10 border border-[#F5D061]/40 text-[#F5D061] text-xs font-black tracking-wider uppercase shadow-inner">
          <span className="animate-spin text-sm">✨</span>
          <span>جاري تجهيز التجربة الاستثنائية</span>
        </div>

        {/* الصلاة على النبي والنص التوضيحي */}
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-[#F5D061] leading-relaxed drop-shadow-sm">
            اللهم صل وسلم على نبينا محمد
          </h2>
          <p className="text-amber-100/70 text-xs sm:text-sm font-medium leading-relaxed">
            نُعد لك منصة رقمية متكاملة تليق بإنجازات ومستقبل نادي التمريض... لحظات معدودة وتكتمل البوصلة 🩺✨
          </p>
        </div>

        {/* شريط التحميل المطور المضيء (Progress Bar) */}
        <div className="space-y-2">
          <div className="w-full bg-black/70 rounded-full h-3 p-0.5 border border-[#F5D061]/30 overflow-hidden relative shadow-inner">
            <div className="bg-gradient-to-r from-amber-400 via-[#F5D061] to-yellow-300 h-full rounded-full animate-[loading_2s_ease-in-out_infinite] shadow-[0_0_15px_rgba(245,208,97,0.8)] w-2/3"></div>
          </div>
          <div className="flex justify-between items-center text-[10px] text-[#F5D061]/70 font-mono px-1">
            <span>تحميل المكونات...</span>
            <span className="animate-pulse">جاري الاتصال بقاعدة البيانات ⚡</span>
          </div>
        </div>

        {/* التوقيع السفلي */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-[11px] text-[#F5D061] font-extrabold tracking-widest uppercase">
            نادي التمريض • جامعة حفر الباطن
          </span>
        </div>

      </div>
    </main>
  );
}