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

     {/* قسم الوصول السريع للنشرة الأسبوعية - فايب صحفي ينبض بهويتنا الحقيقية */}
<section className="py-12 px-4 sm:px-6">
  <div className="max-w-4xl mx-auto bg-[#F7F4EE] border-4 border-[#630517] rounded-[32px] p-8 sm:p-12 relative overflow-hidden shadow-[0_20px_50px_rgba(99,5,23,0.18)]">
    
    {/* تأثير التايبو العملاق في الخلفية بهوية النشرة */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
      <span className="text-[12rem] sm:text-[17rem] font-black font-sans text-[#630517]/[0.045] uppercase tracking-tighter leading-none transform -rotate-3">
        NEWS
      </span>
    </div>

    {/* تأثيرات خطوط الأعمدة والدقة الصحفية بالخلفية */}
    <div className="absolute inset-0 opacity-[0.04] pointer-events-none select-none overflow-hidden grid grid-cols-3 gap-2 text-[7px] font-mono text-[#630517]">
      <div>nursing club weekly edition clinical updates health standards...</div>
      <div>exclusive newsletter medical care breaking news professional skills...</div>
      <div>SLE exam preparation guidelines leadership nursing activities...</div>
    </div>

    {/* محتوى الكرت الصحفي الحيوي */}
    <div className="relative z-10 space-y-6 text-center">
      
      {/* ترويسة علوية للنشرة */}
      <div className="flex justify-between items-center text-xs font-sans font-bold text-[#630517] uppercase tracking-widest border-b-2 border-[#630517]/30 pb-3">
        <span className="bg-[#630517]/10 px-3 py-1 rounded-full text-[10px]">نادي التمريض</span>
        <span className="font-black">ISSUE NO. 01</span>
        <span className="bg-[#630517]/10 px-3 py-1 rounded-full text-[10px]">النشرة الأسبوعية</span>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        <span className="inline-block px-4 py-1.5 bg-[#630517] text-[#F5D061] text-xs font-black uppercase tracking-wider font-sans rounded-full shadow-md">
          📰 الإصدارات والأخبار الحصرية
        </span>
        
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 font-serif tracking-tight leading-tight">
          النشرة الأسبوعية لنادي التمريض
        </h2>
        
        <p className="text-slate-700 text-xs sm:text-sm leading-relaxed font-serif italic max-w-xl mx-auto">
          "اطلع على أحدث أخبار التمريض العالمية، مصادر مذاكرة اختبار الهيئة السعودية (SLE)، والأسس السريرية المعتمدة بفايب صحفي فخم ينبض بالإبداع."
        </p>
      </div>
      
      <div className="pt-3">
        <Link
          href="/newsletter"
          className="px-8 py-4 bg-[#630517] text-[#F5D061] hover:bg-slate-900 font-black text-xs sm:text-sm shadow-xl hover:scale-105 transition-all inline-flex items-center gap-2.5 font-sans uppercase tracking-wider border-2 border-[#630517] rounded-2xl cursor-pointer"
        >
          <span>📖</span>
          <span>استعراض النشرة الأسبوعية ➔</span>
        </Link>
      </div>

      {/* تذييل الكرت النظيف */}
      <div className="border-t border-[#630517]/20 pt-3 text-[11px] text-slate-600 font-sans font-bold">
        نادي التمريض 
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