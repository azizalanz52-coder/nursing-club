'use client';

import React from 'react';
import Link from 'next/link';
import Hero from "./components/Hero";
import About from "./components/home/About";
import EventsPreview from "./components/home/EventsPreview";
import CaseStudyCard from "./components/home/CaseStudyCard";
import WhatsAppCommunity from "./components/home/WhatsAppCommunity";
import SuggestionBox from "./components/home/SuggestionBox";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      
      {/* قسم الوصول السريع لصفحة الرؤساء والقادة */}
      <section className="py-12 bg-white border-y border-slate-200 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-black uppercase tracking-wider border border-[#630517]/20">
            👑 الهيكل القيادي والتنظيمي
          </span>
          <h2 className="text-3xl font-black text-slate-900">رؤساء وقادة لجان نادي التمريض</h2>
          <p className="text-slate-600 text-sm max-w-xl mx-auto">
            تعرف على فريق القيادة في قمة الهرم ورؤساء اللجان السبع المسؤولين عن مسيرة النادي.
          </p>
          <div className="pt-2">
            <Link
              href="/team"
              className="px-8 py-3.5 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs sm:text-sm shadow-lg hover:scale-105 transition-all inline-flex items-center gap-2"
            >
              <span>👑</span>
              <span>استعراض رؤساء وقادة النادي ➔</span>
            </Link>
          </div>
        </div>
      </section>

      {/* قسم الوصول السريع للنشرة الأسبوعية */}
      <section className="py-14 bg-gradient-to-br from-[#36020A] via-[#630517] to-[#4A030F] text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 space-y-4 relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#F5D061]/20 text-[#F5D061] text-xs font-black uppercase tracking-wider border border-[#F5D061]/30">
            📰 الإصدارات والأخبار
          </span>
          <h2 className="text-3xl font-black text-white">النشرة الأسبوعية لنادي التمريض</h2>
          <p className="text-amber-50/80 text-sm max-w-xl mx-auto">
            اطلع على أخبار التمريض العالمية، مصادر مذاكرة اختبار الهيئة السعودية (SLE)، وأهم الأسس التمريضية.
          </p>
          <div className="pt-2">
            <Link
              href="/newsletter"
              className="px-8 py-3.5 rounded-2xl bg-[#F5D061] text-[#630517] font-black text-xs sm:text-sm shadow-xl hover:scale-105 transition-all inline-flex items-center gap-2"
            >
              <span>📖</span>
              <span>استعراض النشرة الأسبوعية ➔</span>
            </Link>
          </div>
        </div>
      </section>

      <EventsPreview />
      <CaseStudyCard />
      <WhatsAppCommunity />
      <SuggestionBox />
      <Footer />
    </main>
  );
}