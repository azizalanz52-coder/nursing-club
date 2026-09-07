'use client';

import React from 'react';
import Link from 'next/link';

export default function CommitteesPreview() {
  const committees = [
    {
      id: '1',
      title: 'لجنة التصميم والجرافيك',
      description: 'مسؤولة عن الهوية البصرية، تصميم المنشورات، البنرات، والمحتوى المرئي للنادي.',
      icon: '🎨'
    },
    {
      id: '2',
      title: 'اللجنة العلمية والبحثية',
      description: 'إعداد الأوراق البحثية، المحتوى العلمي، وورش العمل التمريضية الأكاديمية.',
      icon: '🔬'
    },
    {
      id: '3',
      title: 'لجنة التنظيم والفعاليات',
      description: 'التخطيط الميداني وإدارة الحشود وتنظيم الملتقيات والمعارض الكبرى.',
      icon: '📅'
    },
    {
      id: '4',
      title: 'لجنة العلاقات العامة والإعلام',
      description: 'بناء الشراكات المجتمعية، إدارة منصات التواصل، والتغطيات الإعلامية.',
      icon: '🤝'
    },
    {
      id: '5',
      title: 'لجنة التطوع خدمة المجتمع',
      description: 'تنظيم الحملات التوعوية الميدانية والقياسات الحيوية للزوار والمنسوبين.',
      icon: '❤️'
    },
    {
      id: '6',
      title: 'اللجنة التقنية والدعم الرقمي',
      description: 'إدارة الموقع الإلكتروني، الأنظمة الرقمية، والدعم التقني لفعاليات النادي.',
      icon: '💻'
    },
    {
      id: '7',
      title: 'لجنة الدعم اللوجستي والتجهيز',
      description: 'تأمين وتجهيز المستلزمات الطبية والأدوات اللازمة للأنشطة والفعاليات.',
      icon: '⚙️'
    }
  ];

  return (
    <section className="py-20 bg-[#630517] text-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-4">
          <div className="space-y-3 text-right">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#F5D061]/20 text-[#F5D061] text-xs font-black tracking-widest uppercase border border-[#F5D061]/30">
              هيكل النادي التنظيمي
            </span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              لجان نادي التمريض (7 لجان)
            </h2>
            <p className="text-slate-200 text-sm sm:text-base">
              نخبة من الكوادر الطلابية الموزعة على سبع لجان تخصصية لصناعة الأثر والتميز.
            </p>
          </div>

          <Link
            href="/team"
            className="px-6 py-3 rounded-2xl bg-[#F5D061] text-[#630517] font-black text-xs sm:text-sm shadow-lg hover:brightness-110 transition-all shrink-0"
          >
            عرض أعضاء اللجان ←
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {committees.map((comm) => (
            <div
              key={comm.id}
              className="relative rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between group min-h-[320px] bg-slate-950 border border-[#F5D061]/30 p-8 transition-all hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40 z-0" />

              <div className="relative z-10 flex justify-between items-start">
                <span className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-md">
                  {comm.icon}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#F5D061]/20 text-[#F5D061] text-xs font-black border border-[#F5D061]/30">
                  لجنة معتمدة
                </span>
              </div>

              <div className="relative z-10 space-y-3 text-right pt-6">
                <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#F5D061] transition-colors">
                  {comm.title}
                </h3>
                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                  {comm.description}
                </p>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}