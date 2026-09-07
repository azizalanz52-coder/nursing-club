'use client';

import React from 'react';
import Link from 'next/link';

export default function CommitteesPreview() {
  const committees = [
    {
      title: 'لجان التنظيم والفعاليات',
      description: 'تنظيم الملتقيات، الورش، والأنشطة الميدانية للنادي بكفاءة واحترافية عالية.',
      icon: '🎯'
    },
    {
      title: 'اللجنة العلمية والثقافية',
      description: 'إعداد المحتوى العلمي، المحاضرات التثقيفية، وبرامج التطوير الأكاديمي.',
      icon: '📚'
    },
    {
      title: 'لجنة العلاقات العامة والإعلام',
      description: 'إدارة منصات التواصل، التغطيات الإعلامية، وبناء الشراكات المجتمعية.',
      icon: '🤝'
    }
  ];

  return (
    <section className="py-20 bg-slate-50 text-slate-800" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-black tracking-widest uppercase border border-[#630517]/20">
            هيكل النادي
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
            لجان نادي التمريض
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            تعرف على اللجان التنظيمية التي تدير وتنسق مختلف أنشطة وبرامج النادي.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {committees.map((comm, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200/80 flex flex-col justify-between space-y-6 hover:border-[#630517]/40 hover:shadow-2xl transition-all group"
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#630517]/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                  {comm.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#630517] transition-colors">
                  {comm.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {comm.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#630517]">
                <span>انضم إلينا</span>
                <span>←</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}