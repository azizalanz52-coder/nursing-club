'use client';

import React from 'react';
import Image from 'next/image';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[99999] bg-[#020001] flex items-center justify-center px-4 overflow-hidden" dir="rtl">
      
       {/* تأثيرات خلفية نارية وذهبية متوهجة */}
       <div className="absolute w-[600px] h-[600px] bg-gradient-to-r from-red-900/40 via-amber-600/20 to-transparent rounded-full blur-[160px] pointer-events-none animate-pulse"></div>

       {/* البوكس الرئيسي الفخم جداً */}
       <div className="relative max-w-md w-full bg-[#120205] border-2 border-amber-400/60 rounded-[48px] p-8 sm:p-12 shadow-[0_0_100px_rgba(245,208,97,0.3)] text-center space-y-8">
          
          {/* دائرة الشعار المتحركة */}
          <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
             <div className="absolute inset-0 rounded-full border-4 border-amber-400/30 border-t-amber-400 animate-spin"></div>
             <div className="relative w-20 h-20 bg-[#24040a] border border-amber-400/80 rounded-3xl flex items-center justify-center shadow-2xl">
                <Image
                  src="/logo.png"
                  alt="شعار نادي التمريض"
                  width={52}
                  height={52}
                  className="object-contain"
                />
             </div>
          </div>

          {/* نص الصلاة على النبي (العنصر الأساسي اللي طلبته) */}
          <div className="space-y-3">
             <div className="inline-block px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase">
                ⚡ إطلاق منصة نادي التمريض 2026
             </div>
             <h2 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
                اللهم صل وسلم على نبينا محمد
             </h2>
             <p className="text-amber-100/60 text-xs font-medium">
                نصنع لك تجربة رقمية استثنائية.. ثوانٍ المعدودة ويبدأ العرض
             </p>
          </div>

          {/* شريط تحميل فخم ومختلف كلياً */}
          <div className="space-y-2.5">
             <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-amber-400/40 p-0.5">
                <div className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200 rounded-full animate-pulse w-4/5 shadow-[0_0_20px_#F5D061]"></div>
             </div>
             <div className="flex justify-between items-center text-[10px] text-amber-300/80 font-mono font-bold">
                <span>LOADING ASSETS</span>
                <span>جامعة حفر الباطن</span>
             </div>
          </div>

          {/* التوقيع السفلي */}
          <div className="pt-4 border-t border-white/10 text-[11px] text-amber-400 font-extrabold tracking-widest">
             نادي التمريض • حفر الباطن
          </div>

       </div>
    </div>
  );
}