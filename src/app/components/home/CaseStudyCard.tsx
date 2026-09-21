'use client';

import React from 'react';
import Link from 'next/link';

export default function CaseStudyCard() {
  return (
    <section className="w-full max-w-5xl mx-auto px-4 my-8" dir="ltr">
      <div className="bg-gradient-to-r from-[#630517] via-[#4a030f] to-[#3b020b] border-2 border-[#F5D061]/40 rounded-[2.5rem] p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 text-left relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#F5D061]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <span className="bg-[#F5D061] text-[#630517] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider inline-block shadow">
            Daily Challenge ⏱️ (Updates every 24h)
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Clinical Case Study
          </h2>
          <p className="text-xs sm:text-sm text-amber-50/80 font-medium max-w-xl">
            Case Study - Test your knowledge now with clinical scenarios (Easy to Moderate levels, 4 options each).
          </p>
        </div>

        <div className="z-10 whitespace-nowrap">
          <Link
            href="/case-study"
            className="inline-flex items-center justify-center gap-2 bg-[#F5D061] text-[#630517] px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <span>Start Challenge</span>
            <span>🩺</span>
          </Link>
        </div>

      </div>
    </section>
  );
}