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
import { ClubIcon } from "./components/icons";
import RcqButton from "./components/RcqButton";

export default function Home() {
  return (
    <main>
      <RcqButton />
      <Hero />
      <About />
      
      {/* قسم الوصول السريع لصفحة الرؤساء والقادة - بتصميم عنابي وذهبي ملوكي متدرج */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-br from-[#630517] via-[#4d0312] to-[#31010a] text-white border-y-2 border-[#F5D061]/30 relative overflow-hidden shadow-2xl">
        {/* إضاءات وتوهجات جمالية بالخلفية */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,208,97,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#F5D061]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#630517]/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#F5D061]/15 text-[#F5D061] text-xs font-black uppercase tracking-wider border border-[#F5D061]/30 backdrop-blur-md shadow-inner">
            <ClubIcon name="crown" size={14} />
            <span>الهيكل القيادي والتنظيمي</span>
          </span>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            رؤساء وقادة لجان <span className="text-[#F5D061] drop-shadow-md">نادي التمريض</span>
          </h2>

          <p className="text-amber-100/90 text-sm sm:text-base max-w-xl mx-auto font-medium leading-relaxed">
            تعرف على رئيس النادي ونائبه وقادة اللجان السبع.
          </p>

          <div className="pt-3">
            <Link
              href="/team"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F5D061] via-amber-300 to-[#F5D061] text-[#630517] font-black text-xs sm:text-sm shadow-[0_10px_25px_rgba(245,208,97,0.3)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2.5 cursor-pointer border border-[#F5D061]"
            >
              <ClubIcon name="crown" size={16} />
              <span>استعراض رؤساء وقادة النادي</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto rounded-[32px] overflow-hidden bg-gradient-to-br from-[#3a020c] via-[#630517] to-[#4A030F] p-8 sm:p-12 relative shadow-[0_20px_50px_rgba(99,5,23,0.18)]">
          <div className="absolute -top-20 left-[-8%] h-64 w-64 rounded-full bg-[#F5D061]/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 text-center space-y-6">
            <span className="inline-block px-4 py-1.5 bg-[#F5D061]/15 text-[#F5D061] text-xs font-black rounded-full border border-[#F5D061]/30">
              النشرة
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              النشرة الأسبوعية
            </h2>
            <p className="text-amber-50/85 text-sm max-w-xl mx-auto leading-relaxed">
              جداول اختبارات دفعات كلية التمريض، مصادر اختبار الهيئة، وتحديثات النادي — تُنشر من لوحة التحكم وتصل للطلاب مباشرة.
            </p>
            <Link
              href="/newsletter"
              className="px-8 py-4 bg-[#F5D061] text-[#630517] font-black text-sm shadow-xl hover:brightness-105 transition-all inline-flex items-center gap-2 rounded-2xl"
            >
              فتح النشرة
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