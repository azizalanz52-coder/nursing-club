'use client';

import React from 'react';

const leaders = [
  {
    name: "عبدالله محمد المطيري",
    position: "رئيس النادي",
  },
  {
    name: "اريام محمد الجبو",
    position: "نائب رئيس النادي",
  },
];

export default function LeadershipPreview() {
  return (
    <section className="relative py-24 bg-gradient-to-br from-[#36020A] via-[#630517] to-[#4A030F] overflow-hidden border-t border-[#D4AF37]/20" dir="rtl">
      
      {/* هالأت الإضاءة المتوهجة الخلفية المتحركة */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#D4AF37]/15 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-10 right-1/4 w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* شارة العنوان */}
        <div className="text-center mb-12 space-y-3">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-black tracking-widest uppercase shadow-lg">
            <span>👑 القيادة العليا</span>
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-[#D4AF37] tracking-tight">
            رؤساء النادي
          </h2>
          <p className="text-amber-50/80 text-sm font-medium">
            فريق القيادة في نادي التمريض
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {leaders.map((leader, index) => (
            <div
              key={index}
              className="relative group bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 border-2 border-[#D4AF37]/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] text-center transition-all duration-500 hover:-translate-y-2 hover:border-[#D4AF37] hover:shadow-[0_25px_60px_rgba(212,175,55,0.25)] overflow-hidden"
            >
              {/* إطار متوهج خلفي خفيف */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] via-amber-200 to-[#630517] rounded-[2.6rem] blur-sm opacity-20 group-hover:opacity-60 transition duration-700 pointer-events-none" />

              <div className="relative z-10">
                {/* أيقونة أو صورة الشخصية مع تدرج ذهبي متوهج */}
                <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#630517] to-[#36020A] flex items-center justify-center border-4 border-[#D4AF37] shadow-[0_10px_25px_rgba(212,175,55,0.3)] group-hover:scale-105 transition-transform duration-500">
                  <span className="text-4xl text-[#D4AF37] animate-pulse">
                    👤
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#630517] transition-colors">
                  {leader.name}
                </h3>

                <div className="mt-3 inline-block bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-5 py-1.5 rounded-full">
                  <p className="text-[#997A15] font-black text-sm tracking-wide">
                    {leader.position}
                  </p>
                </div>
              </div>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}