'use client';

import React from 'react';
import { ClubIcon, SocialIcon } from '../icons';

export default function WhatsAppCommunity() {
  // يمكنك استبدال هذا الرابط برابط مجتمع الواتساب الخاص بكم
  const communityLink = "https://chat.whatsapp.com/Hz2RnzkW0oEHh1vvttSiPF";

  return (
    <section className="relative py-20 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden" dir="rtl">
      
      {/* خلفية جمالية متوهجة */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#25D366]/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#630517] via-[#850E24] to-[#630517] border-2 border-[#D4AF37]/60 shadow-2xl p-8 sm:p-12 text-center text-white space-y-6">
          
          {/* شارة علوية */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-[#D4AF37]/40 text-[#D4AF37] text-xs sm:text-sm font-black tracking-widest uppercase shadow-lg">
            <ClubIcon name="bell" size={14} />
            <span>مجتمع الكلية على واتساب</span>
          </div>

          {/* العنوان الرئيسي */}
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight drop-shadow-md">
              انضم إلى مجتمع التمريض الرسمي على الواتساب
            </h2>
            <p className="max-w-2xl mx-auto text-sm sm:text-base text-amber-50/90 leading-relaxed font-medium">
              إعلانات الكلية والتنبيهات الأكاديمية لكل الدفعات تصل هنا.
            </p>
          </div>

          {/* زر الانضمام الفخم */}
          <div className="pt-2">
            <a
              href={communityLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black px-10 py-4 rounded-full shadow-xl shadow-emerald-900/30 hover:scale-105 active:scale-95 transition-all duration-300 text-base sm:text-lg cursor-pointer"
            >
              <SocialIcon name="whatsapp" size={20} title="واتساب" />
              <span>انضم للمجتمع الرسمي</span>
            </a>
          </div>

          <p className="text-xs text-amber-100/70 font-semibold">
            لكل دفعات كلية التمريض
          </p>

        </div>

      </div>
    </section>
  );
}