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

     {/* قسم الوصول السريع للنشرة الأسبوعية - بتصميم انسيابي فاخر */}
<section className="py-8 px-4 sm:px-6">
  <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-[#36020A] to-slate-950 rounded-[36px] p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl border border-[#F5D061]/20">
    
    {/* تأثيرات توهج خلفية جمالية */}
    <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#630517]/40 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

    <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
      <span className="inline-block px-4 py-1.5 rounded-full bg-[#F5D061]/15 text-[#F5D061] text-xs font-black uppercase tracking-wider border border-[#F5D061]/30 backdrop-blur-md">
        📰 الإصدارات والأخبار الحصرية
      </span>
      
      <h2 className="text-3xl sm:text-4xl font-black text-white font-serif tracking-tight">
        النشرة الأسبوعية لنادي التمريض
      </h2>
      
      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
        اطلع على أخبار التمريض العالمية، مصادر مذاكرة اختبار الهيئة السعودية (SLE)، وأهم الأسس التمريضية بفايب صحفي فخم.
      </p>
      
      <div className="pt-4">
        <Link
          href="/newsletter"
          className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F5D061] to-amber-400 text-[#630517] font-black text-xs sm:text-sm shadow-lg hover:scale-105 hover:shadow-amber-500/20 transition-all inline-flex items-center gap-2 group"
        >
          <span className="group-hover:rotate-12 transition-transform">📖</span>
          <span>استعراض النشرة الأسبوعية</span>
          <span className="transition-transform group-hover:-translate-x-1">➔</span>
        </Link>
      </div>
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