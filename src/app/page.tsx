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
      
      {/* قسم الوصول السريع لصفحة الرؤساء والقادة - بتصميم عنابي وذهبي ملوكي متدرج */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-br from-[#630517] via-[#4d0312] to-[#31010a] text-white border-y-2 border-[#F5D061]/30 relative overflow-hidden shadow-2xl">
        {/* إضاءات وتوهجات جمالية بالخلفية */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,208,97,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#F5D061]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#630517]/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#F5D061]/15 text-[#F5D061] text-xs font-black uppercase tracking-wider border border-[#F5D061]/30 backdrop-blur-md shadow-inner">
            <span>👑</span>
            <span>الهيكل القيادي والتنظيمي</span>
          </span>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            رؤساء وقادة لجان <span className="text-[#F5D061] drop-shadow-md">نادي التمريض</span>
          </h2>

          <p className="text-amber-100/90 text-sm sm:text-base max-w-xl mx-auto font-medium leading-relaxed">
            تعرف على فريق القيادة في قمة الهرم ورؤساء اللجان السبع المسؤولين عن مسيرة النادي وإدارة كافة الأنشطة والفعاليات.
          </p>

          <div className="pt-3">
            <Link
              href="/team"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F5D061] via-amber-300 to-[#F5D061] text-[#630517] font-black text-xs sm:text-sm shadow-[0_10px_25px_rgba(245,208,97,0.3)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2.5 cursor-pointer border border-[#F5D061]"
            >
              <span className="text-base">👑</span>
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