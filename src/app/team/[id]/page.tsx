'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const defaultCommitteesDetails: Record<string, any> = {
  design: {
    id: 'design',
    name: 'لجنة التصميم',
    description: 'مسؤولة عن الهوية البصرية، تصميم البوسترات، وتجهيز المحتوى المرئي لفعاليات النادي.',
    icon: '🎨',
    maleLeader: 'عبدالعزيز العنزي',
    femaleLeader: 'شجون الحربي',
    members: []
  },
  media: {
    id: 'media',
    name: 'لجنة الإعلام',
    description: 'إدارة منصات التواصل الاجتماعي، التغطيات الحية، وصناعة المحتوى المرئي والمكتوب.',
    icon: '📸',
    maleLeader: 'راشد السبيعي',
    femaleLeader: 'ريم الشمري',
    members: []
  },
  pr: {
    id: 'pr',
    name: 'لجنة العلاقات العامة',
    description: 'بناء الشراكات، استقبال الضيوف، والتنسيق الفعّال بين النادي والجهات الخارجية.',
    icon: '🌐',
    maleLeader: 'خالد القحطاني',
    femaleLeader: 'ديمة العتيبي',
    members: []
  },
  quality: {
    id: 'quality',
    name: 'لجنة الجودة والتطوير',
    description: 'مراجعة وتقييم الأداء، قياس رضا الأعضاء، وتقديم مقترحات تحسين العمل المؤسسي.',
    icon: '📊',
    maleLeader: 'سلطان الحربي',
    femaleLeader: 'نورة الدوسري',
    members: []
  },
  scientific: {
    id: 'scientific',
    name: 'لجنة المحتوى العلمي',
    description: 'إعداد ومراجعة المطويات الطبية، تنظيم المحاضرات التخصصية، ودعم الأنشطة الأكاديمية.',
    icon: '🔬',
    maleLeader: 'فهد المطيري',
    femaleLeader: 'أفنان العنزي',
    members: []
  },
  hr: {
    id: 'hr',
    name: 'لجنة الموارد البشرية',
    description: 'إدارة شؤون الأعضاء، متابعة الانضمام، وتنظيم تقييمات الأداء والتحفيز.',
    icon: '👥',
    maleLeader: 'تركي العنزي',
    femaleLeader: 'سارة الرشيدي',
    members: []
  },
  'events-org': {
    id: 'events-org',
    name: 'لجنة التنظيم والفعاليات',
    description: 'التخطيط الميداني للفعاليات، إدارة الحشود، والتنسيق اللوجستي للورش والملتقيات.',
    icon: '📅',
    maleLeader: 'فيصل الدوسري',
    femaleLeader: 'غادة العمري',
    members: []
  },
};

export default function CommitteeDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || 'design';
  const baseDetails = defaultCommitteesDetails[id] || defaultCommitteesDetails['design'];
  
  const [committee, setCommittee] = useState<any>(baseDetails);
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');

  useEffect(() => {
    const phone = localStorage.getItem('userPhone') || '';
    const name = localStorage.getItem('userName') || '';
    setCurrentUserPhone(phone.trim());
    setCurrentUserName(name.trim());

    const fetchCloudCommittee = async () => {
      try {
        const docRef = doc(db, 'committees', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          setCommittee({
            ...baseDetails,
            maleLeader: cloudData.maleLeader || baseDetails.maleLeader,
            femaleLeader: cloudData.femaleLeader || baseDetails.femaleLeader,
            members: cloudData.members && cloudData.members.length > 0 ? cloudData.members : baseDetails.members
          });
        }
      } catch (err) {
        console.error('Error fetching committee from cloud:', err);
      }
    };

    fetchCloudCommittee();
  }, [id, baseDetails]);

  // التحقق هل المستخدم الحالي هو المدير العام
  const isAdmin = currentUserPhone === '0553731265';

  // فلترة أمنية مشددة:
  // - المدير يرى الجميع.
  // - العضو العادي لا يرى سوى اسمه فقط إذا طابق رقم جواله أو اسمه المسجل في بيانات العضو بدقة، ودون إظهار أي عضو فارغ البيانات.
  const displayedMembers = isAdmin 
    ? (committee.members || [])
    : (committee.members || []).filter((m: any) => {
        const memberPhone = m.phone ? String(m.phone).trim() : '';
        const memberName = m.name ? String(m.name).trim() : '';

        const matchPhone = currentUserPhone !== '' && memberPhone === currentUserPhone;
        const matchName = currentUserName !== '' && memberName === currentUserName;

        return matchPhone || matchName;
      });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="flex justify-between items-center">
          <Link href="/team" className="text-sm font-bold text-[#630517] hover:underline flex items-center gap-1">
            ← العودة لجميع اللجان
          </Link>
          <span className="px-4 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-extrabold tracking-wider uppercase border border-[#630517]/20">
            بوابة الأعضاء والقادة
          </span>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#630517]/10 border border-[#630517]/20 flex items-center justify-center text-3xl shadow-sm">
              {committee.icon}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900">{committee.name}</h1>
              <p className="text-slate-600 text-sm mt-1">{committee.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80">
              <span className="text-slate-400 font-bold">قائد الطلاب:</span>
              <span className="font-extrabold text-slate-900 text-sm">{committee.maleLeader}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80">
              <span className="text-slate-400 font-bold">قائدة الطالبات:</span>
              <span className="font-extrabold text-slate-900 text-sm">{committee.femaleLeader}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900">أعضاء {committee.name}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {isAdmin ? 'عرض لوحة التحكم (جميع الأعضاء)' : 'عرض خاص: يظهر اسمك فقط لضمان الخصوصية'}
              </p>
            </div>
            <span className="px-3 py-1 bg-[#630517] text-[#F5D061] rounded-xl text-xs font-bold shadow">
              {isAdmin ? `${committee.members?.length || 0} أعضاء` : (displayedMembers.length > 0 ? 'عضو مسجل' : 'خاص ومؤمن')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs font-bold">
                  <th className="pb-3 pr-4">اسم العضو</th>
                  <th className="pb-3">المهمة / الدور</th>
                  <th className="pb-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                      {isAdmin ? 'لا توجد أعضاء في هذه اللجنة.' : 'لست مسجلاً في هذه اللجنة، أو أن أسماء وبقية الأعضاء مخفية لخصوصية الحسابات.'}
                    </td>
                  </tr>
                ) : (
                  displayedMembers.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                      <td className="py-4 pr-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-[#630517]/10 text-[#630517] flex items-center justify-center text-xs font-black">
                          {m.name ? m.name.charAt(0) : 'ع'}
                        </span>
                        {m.name}
                      </td>
                      <td className="py-4 text-slate-600 font-medium">{m.role}</td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          {m.status || 'نشط'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}