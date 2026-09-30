'use client';

import React from 'react';

export default function WeeklyNewsletter() {
  return (
    <section className="py-20 bg-amber-50/40 border-y border-amber-200/60 relative overflow-hidden" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* ترويسة الجريدة الصحفية */}
        <div className="border-b-2 border-slate-900 pb-6 text-center space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
            <span>جامعة حفر الباطن</span>
            <span>العدد الأسبوعي الرسمي</span>
            <span>كلية التمريض</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-black font-serif text-slate-900 tracking-tight">
            📰 جريدة نبض التمريض الأسبوعية
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-serif italic max-w-2xl mx-auto">
            "المنارة الدورية لأحدث الأنشطة الطبية، الإصدارات، والمقالات القيادية في النادي"
          </p>
        </div>

        {/* محتوى الجريدة الإبداعي (Grid كأنه مقالات صحفية) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          
          {/* الخبر الرئيسي (المانشيت) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border-2 border-slate-900 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-[#630517] text-[#F5D061] px-4 py-1.5 rounded-bl-2xl font-black text-xs">
              🌟 المانشيت الرئيس
            </div>
            <div className="space-y-4 pt-4">
              <span className="text-xs font-bold text-slate-400">الإصدار الصحفي رقم #12 • هذا الأسبوع</span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif leading-snug">
                إطلاق البرنامج التفاعلي الشامل لمهارات العناية الحرجة والإسعافات المتقدمة
              </h3>
              <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
                شهدت قاعات التدريب بكلية التمريض إقبالاً واسعاً من أعضاء النادي لتطبيق أحدث بروتوكولات التعامل مع الحالات الإكلينيكية الطارئة بإشراف نخبة من الكوادر المتخصصة، في خطوة تعزز الجاهزية المهنية...
              </p>
            </div>
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center flex-wrap gap-3">
              <span className="text-xs font-bold text-[#630517]">بقلم: لجنة المحتوى العلمي</span>
              <button
                type="button"
                onClick={() => alert('قريباً سيتم تفعيل صفحة تفاصيل الإصدار الصحفي الكامل! 🚀')}
                className="px-6 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                قراءة المقال كاملاً ←
              </button>
            </div>
          </div>

          {/* الشريط الجانبي للجريدة */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="bg-white rounded-3xl p-6 border border-slate-300 shadow-md space-y-4">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
                <h4 className="font-black text-slate-900 text-base font-serif">📌 زاوية قادة اللجان</h4>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full">مختصر</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                تأكيد انعقاد الاجتماع الدوري للجان السبع لمناقشة خطة الفعاليات الكبرى القادمة ورفع مستوى التنسيق بين الطلاب والطالبات.
              </p>
            </div>

            <div className="bg-[#630517] text-white rounded-3xl p-6 shadow-xl space-y-4 text-center">
              <h4 className="font-black text-[#F5D061] text-lg font-serif">📬 اشتراك النشرة البريدية</h4>
              <p className="text-xs text-amber-50/90 font-medium">احصل على إصدار الجريدة الأسبوعية مباشرة فور صدورها.</p>
              <button
                type="button"
                onClick={() => alert('تم تسجيل بريدك بنجاح لتلقي الإصدارات الصحفية الأسبوعية! 🎯')}
                className="w-full py-3.5 rounded-xl bg-[#F5D061] text-[#630517] font-black text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
              >
                اشترك في النشرة الصحفية ✨
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}