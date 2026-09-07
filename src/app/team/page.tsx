'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const defaultCommitteesData = [
  { id: 'design', name: 'لجنة التصميم', description: 'الهوية البصرية، تصميم البوسترات، والمحتوى المرئي.', icon: '🎨', maleLeader: 'عبدالعزيز العنزي', femaleLeader: 'شهد المرواني' },
  { id: 'media', name: 'لجنة الإعلام', description: 'منصات التواصل، التغطيات الحية، وصناعة المحتوى.', icon: '📸', maleLeader: 'راشد السبيعي', femaleLeader: 'ريم الشمري' },
  { id: 'pr', name: 'لجنة العلاقات العامة', description: 'بناء الشراكات، استقبال الضيوف، والتنسيق الخارجي.', icon: '🌐', maleLeader: 'خالد القحطاني', femaleLeader: 'ديمة العتيبي' },
  { id: 'quality', name: 'لجنة الجودة والتطوير', description: 'تقييم الأداء، قياس رضا الأعضاء، وتحسين العمل.', icon: '📊', maleLeader: 'سلطان الحربي', femaleLeader: 'نورة الدوسري' },
  { id: 'scientific', name: 'لجنة المحتوى العلمي', description: 'المطويات الطبية، المحاضرات، والدعم الأكاديمي.', icon: '🔬', maleLeader: 'فهد المطيري', femaleLeader: 'أفنان العنزي' },
  { id: 'hr', name: 'لجنة الموارد البشرية', description: 'إدارة الأعضاء، المتابعة، والتقييم والتحفيز.', icon: '👥', maleLeader: 'تركي العنزي', femaleLeader: 'سارة الرشيدي' },
  { id: 'events-org', name: 'لجنة التنظيم والفعاليات', description: 'التخطيط الميداني، إدارة الحشود، والفعاليات.', icon: '📅', maleLeader: 'فيصل الدوسري', femaleLeader: 'غادة العمري' },
];

export default function TeamPage() {
  const [committees, setCommittees] = useState(defaultCommitteesData);

  useEffect(() => {
    const loadSavedData = () => {
      const savedCommittees = localStorage.getItem('UHB_COMMITTEES_DATA');
      if (savedCommittees) {
        try {
          const parsedArray = JSON.parse(savedCommittees);
          if (parsedArray && parsedArray.length > 0) {
            const updated = defaultCommitteesData.map(comm => {
              const found = parsedArray.find((c: any) => c.id === comm.id);
              if (found) {
                return {
                  ...comm,
                  maleLeader: found.maleLeader || comm.maleLeader,
                  femaleLeader: found.femaleLeader || comm.femaleLeader,
                };
              }
              return comm;
            });
            setCommittees(updated);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    loadSavedData();
    // الاستماع لأي تحديث يحدث في التخزين المحلي
    window.addEventListener('storage', loadSavedData);
    return () => window.removeEventListener('storage', loadSavedData);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="flex justify-between items-center">
          <Link href="/" className="text-sm font-bold text-[#630517] hover:underline flex items-center gap-1">
            ← العودة للرئيسية
          </Link>
          <span className="px-4 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-extrabold tracking-wider uppercase border border-[#630517]/20">
            نادي التمريض • UHB
          </span>
        </div>

        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">لجان نادي التمريض السبع</h1>
          <p className="text-slate-600 text-base">اضغط على أي لجنة لاستعراض أعضائها وقادتها والانضمام إليها مباشرة.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {committees.map((committee) => (
            <Link
              key={committee.id}
              href={`/team/${committee.id}`}
              className="bg-white rounded-3xl border border-slate-200 p-7 shadow-lg shadow-slate-100 flex flex-col justify-between space-y-6 hover:shadow-xl hover:border-[#630517]/50 hover:scale-[1.02] transition-all cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#630517]/10 border border-[#630517]/20 flex items-center justify-center text-2xl group-hover:bg-[#630517] group-hover:text-[#F5D061] transition-all">
                  {committee.icon}
                </div>
                <h3 className="text-xl font-black text-slate-900 group-hover:text-[#630517] transition-colors">{committee.name}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{committee.description}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 font-bold">قائد الطلاب:</span>
                  <span className="font-extrabold text-slate-900">{committee.maleLeader}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60">
                  <span className="text-slate-400 font-bold">قائدة الطالبات:</span>
                  <span className="font-extrabold text-slate-900">{committee.femaleLeader}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}