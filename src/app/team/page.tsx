'use client';

import React from 'react';
import Link from 'next/link';

const committeesList = [
  {
    id: 'design',
    name: 'لجنة التصميم',
    description: 'مسؤولة عن الهوية البصرية، تصميم البوسترات، وتجهيز المحتوى المرئي لفعاليات النادي.',
    icon: '🎨',
    maleLeader: 'عبدالعزيز العنزي',
    femaleLeader: 'شجون الحربي'
  },
  {
    id: 'media',
    name: 'لجنة الإعلام',
    description: 'إدارة منصات التواصل الاجتماعي، التغطيات الحية، وصناعة المحتوى المرئي والمكتوب.',
    icon: '📸',
    maleLeader: 'راشد السبيعي',
    femaleLeader: 'ريم الشمري'
  },
  {
    id: 'pr',
    name: 'لجنة العلاقات العامة',
    description: 'بناء الشراكات، استقبال الضيوف، والتنسيق الفعّال بين النادي والجهات الخارجية.',
    icon: '🌐',
    maleLeader: 'خالد القحطاني',
    femaleLeader: 'ديمة العتيبي'
  },
  {
    id: 'quality',
    name: 'لجنة الجودة والتطوير',
    description: 'مراجعة وتقييم الأداء، قياس رضا الأعضاء، وتقديم مقترحات تحسين العمل المؤسسي.',
    icon: '📊',
    maleLeader: 'سلطان الحربي',
    femaleLeader: 'نورة الدوسري'
  },
  {
    id: 'scientific',
    name: 'لجنة المحتوى العلمي',
    description: 'إعداد ومراجعة المطويات الطبية، تنظيم المحاضرات التخصصية، ودعم الأنشطة الأكاديمية.',
    icon: '🔬',
    maleLeader: 'فهد المطيري',
    femaleLeader: 'أفنان العنزي'
  },
  {
    id: 'hr',
    name: 'لجنة الموارد البشرية',
    description: 'إدارة شؤون الأعضاء، متابعة الانضمام، وتنظيم تقييمات الأداء والتحفيز.',
    icon: '👥',
    maleLeader: 'تركي العنزي',
    femaleLeader: 'سارة الرشيدي'
  },
  {
    id: 'events-org',
    name: 'لجنة التنظيم والفعاليات',
    description: 'التخطيط الميداني للفعاليات، إدارة الحشود، والتنسيق اللوجستي للورش والملتقيات.',
    icon: '📅',
    maleLeader: 'فيصل الدوسري',
    femaleLeader: 'غادة العمري'
  }
];

export default function TeamPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* رأس الصفحة */}
        <div className="text-center space-y-3">
          <span className="px-4 py-1.5 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-black tracking-wider uppercase border border-[#630517]/20">
            فريق العمل واللجان التنظيمية
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900">لجان نادي كلية التمريض</h1>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed">
            تعرف على لجان نادي التمريض وقادتها، واستعرض أعضاء كل لجنة وبوابات الاعتذارات والمتابعة المرتبطة بها بكل سهولة.
          </p>
        </div>

        {/* شبكة اللجان السبع */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {committeesList.map((committee) => (
            <div
              key={committee.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-14 h-14 rounded-2xl bg-[#630517]/10 border border-[#630517]/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {committee.icon}
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    نشطة ومعتمدة ✓
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">{committee.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{committee.description}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 space-y-1 font-semibold">
                  <p>👨‍💼 قائد الطلاب: <span className="text-slate-800 font-bold">{committee.maleLeader}</span></p>
                  <p>👩‍💼 قائدة الطالبات: <span className="text-slate-800 font-bold">{committee.femaleLeader}</span></p>
                </div>

                <Link
                  href={`/team/${committee.id}`}
                  className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] text-xs font-black text-center shadow hover:brightness-110 transition-all block"
                >
                  دخول صفحة اللجنة والأعضاء ➔
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* زر العودة للرئيسية */}
        <div className="text-center pt-6">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs shadow-sm hover:bg-slate-50 transition-all">
            ← العودة للرئيسية
          </Link>
        </div>

      </div>
    </main>
  );
}