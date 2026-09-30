'use client';

import React from 'react';
import Link from 'next/link';
import Hero from "./components/Hero";
import About from "./components/home/About";
import WeeklyNewsletter from "./components/home/WeeklyNewsletter";
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
      
      {/* بطاقة الانتقال لصفحة فريق النادي والقيادة واللجان (مرتبطة بلوحة التحكم) */}
      <section className="py-14 bg-white border-y border-slate-200 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-black uppercase tracking-wider border border-[#630517]/20">
            👑 الهيكل القيادي والتنظيمي
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">رؤساء وقادة لجان نادي التمريض</h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            تعرف على فريق القيادة ورؤساء اللجان السبع المسؤولين عن مسيرة العطاء والتميز في النادي.
          </p>
          <div className="pt-2">
            <Link
              href="/team"
              className="px-8 py-4 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-sm shadow-xl hover:scale-105 transition-all inline-flex items-center gap-3"
            >
              <span className="text-lg">👑</span>
              <span>استعراض صفحة رؤساء وقادة النادي ➔</span>
            </Link>
          </div>
        </div>
      </section>

      {/* مكون النشرة الأسبوعية المستقل (بتصميم الجريدة والمجلة الفخمة) */}
      <WeeklyNewsletter />

      <EventsPreview />
      <CaseStudyCard />
      <WhatsAppCommunity />
      <SuggestionBox />
      <Footer />
    </main>
  );
}