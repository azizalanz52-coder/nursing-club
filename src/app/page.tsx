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

     {/* قسم الوصول السريع للنشرة الأسبوعية - فايب جريدة ورقية عتيقة */}
<section className="py-10 px-4 sm:px-6">
  <div className="max-w-4xl mx-auto bg-[#F4F1EA] border-4 border-neutral-900 p-8 sm:p-12 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
    
    {/* تأثير التايبو العملاق في الخلفية (Big Typography مثل الـ 'JA!' في الجريدة) */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
      <span className="text-[13rem] sm:text-[18rem] font-black font-sans text-neutral-900/[0.035] uppercase tracking-tighter leading-none transform -rotate-6">
        NEWS
      </span>
    </div>

    {/* تأثيرات خطوط الأعضاء والنصوص الدقيقة بالخلفية (Micro-text Watermark) */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden grid grid-cols-3 gap-2 text-[7px] font-mono text-neutral-900">
      <div>nursing club weekly edition clinical updates health standards...</div>
      <div>faculty of nursing hafar al batin breaking news medical care...</div>
      <div>SLE exam preparation guidelines professional nursing skills...</div>
    </div>

    {/* محتوى الكرت الصحفي */}
    <div className="relative z-10 space-y-6 text-center">
      
      {/* ترويسة علوية للجريدة */}
      <div className="flex justify-between items-center text-[10px] sm:text-xs font-sans font-bold text-neutral-600 uppercase tracking-widest border-b-2 border-neutral-900 pb-2">
        <span>جامعة حفر الباطن</span>
        <span className="text-[#630517] font-black">ISSUE NO. 01</span>
        <span>الجريدة الأسبوعية</span>
      </div>

      <div className="space-y-3 max-w-2xl mx-auto">
        <span className="inline-block px-3 py-1 bg-[#630517] text-[#F5D061] text-[10px] font-black uppercase tracking-wider font-sans">
          📰 الإصدارات والأخبار الحصرية
        </span>
        
        <h2 className="text-3xl sm:text-5xl font-black text-neutral-900 font-serif tracking-tight">
          النشرة الأسبوعية لنادي التمريض
        </h2>
        
        <p className="text-neutral-700 text-xs sm:text-sm leading-relaxed font-serif italic max-w-xl mx-auto">
          "اطلع على أحدث أخبار التمريض العالمية، مصادر مذاكرة اختبار الهيئة السعودية (SLE)، والأسس السريرية المعتمدة بفايب صحفي عتيق."
        </p>
      </div>
      
      <div className="pt-2">
        <Link
          href="/newsletter"
          className="px-8 py-3.5 bg-neutral-900 text-[#F5D061] hover:bg-[#630517] font-black text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2 font-sans uppercase tracking-wider border-2 border-neutral-900 cursor-pointer"
        >
          <span>📖</span>
          <span>استعراض النشرة الصحفية الأسبوعية ➔</span>
        </Link>
      </div>

      {/* تذييل الكرت الصحفي */}
      <div className="border-t border-neutral-300 pt-3 text-[10px] text-neutral-500 font-sans">
        نادي كلية التمريض • الإصدار الرقمي الموثق
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