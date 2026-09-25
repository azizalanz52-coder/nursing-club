'use client';

import React from 'react';
import Link from 'next/link';

export default function CaseStudyCard() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-10" dir="ltr">
      <div className="bg-gradient-to-r from-[#7a081d] via-[#630517] to-[#8c1c32] border-2 border-[#F5D061] rounded-[2.5rem] p-8 sm:p-10 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden group">
        
        {/* إضاءات خلفية جمالية ومشرقة */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-[#F5D061]/20 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-3 z-10">
          <span className="bg-[#F5D061] text-[#630517] font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider inline-block shadow-md">
            ⚡ Daily Challenge (Updates every 24h)
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Clinical Case Study Challenge
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 font-medium max-w-xl leading-relaxed">
            Test your advanced clinical knowledge with daily updated scenarios (Easy, Moderate & Hard levels, 4 options each).
          </p>
        </div>

        <div className="z-10 whitespace-nowrap">
          <Link
            href="/case-study"
            className="inline-flex items-center justify-center gap-3 bg-[#F5D061] text-[#630517] px-8 py-4 rounded-2xl font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <span>Start Challenge</span>
            <span className="text-lg">🩺</span>
          </Link>
        </div>

      </div>
    </section>
  );
}