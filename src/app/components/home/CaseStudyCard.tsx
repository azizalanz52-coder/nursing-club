'use client';

import React from 'react';
import Link from 'next/link';

export default function CaseStudyCard() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-10" dir="ltr">
      <div className="bg-gradient-to-r from-[#9d174d] via-[#be185d] to-[#f472b6] border-2 border-pink-200 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden group">
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-white/20 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 z-10">
          <span className="bg-white text-[#9d174d] font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider inline-block shadow-md">
            🎀 Pink October • Breast Cancer Week
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Breast Cancer Nursing Challenge
          </h2>
          <p className="text-xs sm:text-sm text-pink-50 font-medium max-w-xl leading-relaxed">
            تحدٍّ يومي بحالات تمريضية عن الكشف المبكر، الرعاية بعد الاستئصال، والعلاج الكيميائي. Easy · Moderate · Hard.
          </p>
        </div>

        <div className="z-10 whitespace-nowrap">
          <Link
            href="/case-study"
            className="inline-flex items-center justify-center gap-3 bg-white text-[#9d174d] px-8 py-4 rounded-2xl font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <span>Start Challenge</span>
            <span className="text-lg">🎀</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
