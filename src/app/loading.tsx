'use client';

import React from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#050102] flex items-center justify-center px-4 overflow-hidden" dir="rtl">
      
       {/* تأثيرات الإضاءة الخلفية المحيطة */}
       <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-[#630517]/40 to-[#F5D061]/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>

       {/* البطاقة المركزية الفاخرة */}
       <div className="relative max-w-md w-full bg-[#0d0205]/90 backdrop-blur-3xl border border-[#F5D061]/40 rounded-[40px] p-8 sm:p-10 shadow-[0_0_80px_rgba(99,5,23,0.6)] text-center space-y-8">
          
          {/* دائرة الشعار المضيئة */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
             <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#F5D061]/60 animate-spin"></div>
             <div className="absolute inset-2 rounded-full bg-[#630517]/30 blur-md animate-pulse"></div>
             
             <div className="relative w-20 h-20 bg-gradient-to-b from-[#1a0308] to-[#42050f] border border-[#F5D061]/70 rounded-2xl flex items-center justify-center shadow-lg">
                <Image
                  src="/logo.png"
                  alt="شعار نادي التمريض"
                  width={50}
                  height={50}
                  className="object-contain drop-shadow"
                />
             </div>
          </div>

          {/* نص الصلاة على النبي */}
          <div className="space-y-3">
             <span className="inline-block px-3.5 py-1 rounded-full bg-[#F5D061]/10 border border-[#F5D061]/30 text-[#F5D061] text-[11px] font-bold tracking-widest uppercase">
                بوابة نادي التمريض
             </span>
             <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide leading-relaxed">
                اللهم صل وسلم على نبينا محمد
             </h2>
             <p className="text-zinc-400 text-xs">
                جاري إعداد محتوى لوحة التحكم والبيانات بأمان تام...
             </p>
          </div>

          {/* شريط التحميل */}
          <div className="space-y-2">
             <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div className="h-full bg-gradient-to-r from-amber-500 via-[#F5D061] to-yellow-200 rounded-full animate-pulse w-3/4 shadow-[0_0_15px_#F5D061]"></div>
             </div>
             <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                <span>SYSTEM LOADING</span>
                <span className="text-[#F5D061] font-bold">VER 2026</span>
             </div>
          </div>

          {/* التوقيع السفلي */}
          <div className="pt-4 border-t border-white/5 text-[11px] text-[#F5D061]/80 font-bold tracking-wider">
             جامعة حفر الباطن • نادي التمريض
          </div>

       </div>
    </div>
  );
}