'use client';

import React, { useState } from 'react';
import Hero from "./components/Hero";
import About from "./components/home/About";
import LeadershipPreview from "./components/home/LeadershipPreview";
import CommitteesPreview from "./components/home/CommitteesPreview";
import EventsPreview from "./components/home/EventsPreview";
import CaseStudyCard from "./components/home/CaseStudyCard";
import WhatsAppCommunity from "./components/home/WhatsAppCommunity";
import SuggestionBox from "./components/home/SuggestionBox";
import Footer from "./components/Footer";

export default function Home() {
  const [showTeamModal, setShowTeamModal] = useState(false);

  return (
    <main>
      <Hero />
      <About />
      
      {/* زر ونافذة مخصصة لدمج رؤساء وقادة النادي في نافذة منبثقة لتخفيف زحمة الواجهة */}
      <section className="py-14 bg-white border-y border-slate-200 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-black uppercase tracking-wider border border-[#630517]/20">
            👑 الهيكل القيادي والتنظيمي
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">رؤساء وقادة لجان نادي التمريض</h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
            تعرف على فريق القيادة ورؤساء اللجان السبع المسؤولين عن مسيرة العطاء والتميز في النادي.
          </p>
          <button
            type="button"
            onClick={() => setShowTeamModal(true)}
            className="mt-2 px-8 py-4 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-sm shadow-xl hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-3"
          >
            <span className="text-lg">👑</span>
            <span>استعراض رؤساء وقادة النادي (نافذة منبثقة)</span>
          </button>
        </div>
      </section>

      {/* قسم النشرة الأسبوعية الجديد في الواجهة */}
      <section className="py-16 bg-gradient-to-br from-slate-900 via-[#36020A] to-slate-950 text-white relative overflow-hidden border-b border-[#D4AF37]/20">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6 relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#F5D061]/20 text-[#F5D061] text-xs font-black uppercase tracking-wider border border-[#F5D061]/30">
            📰 النشرة الأسبوعية
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">نشرة نادي التمريض الأسبوعية</h2>
          <p className="text-amber-50/80 text-sm max-w-2xl mx-auto leading-relaxed">
            تابع أبرز الفعاليات، الإنجازات، المقالات الطبية، والإصدارات الدورية لنادي كلية التمريض بجامعة حفر الباطن.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => alert('قريباً جداً سيتم إطلاق وتفعيل النشرة الأسبوعية التفاعلية الكاملة هنا! 🚀')}
              className="px-8 py-3.5 rounded-2xl bg-[#F5D061] text-[#630517] font-black text-xs sm:text-sm shadow-lg hover:scale-105 transition-all cursor-pointer inline-block"
            >
              تصفح إصدارات النشرة الأسبوعية 📂
            </button>
          </div>
        </div>
      </section>

      <EventsPreview />
      <CaseStudyCard />
      <WhatsAppCommunity />
      <SuggestionBox />
      <Footer />

      {/* النافذة المنبثقة (Modal) التي تضم رؤساء النادي وقادة اللجان معاً بشكل مرتب */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-50 w-full max-w-6xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-right" dir="rtl">
            
            <div className="bg-[#630517] text-white p-6 sm:p-8 flex justify-between items-center border-b border-[#F5D061]/20">
              <div>
                <span className="text-xs text-[#F5D061] font-bold">فريق القيادة واللجان التنظيمية</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">رؤساء وأعضاء وقادة لجان نادي التمريض</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center transition-all cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 sm:p-10 overflow-y-auto space-y-12">
              {/* مكون رؤساء النادي */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <LeadershipPreview />
              </div>

              {/* مكون قادة اللجان */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
                <CommitteesPreview />
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-slate-100 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="px-8 py-3.5 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                إغلاق النافذة ✕
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}