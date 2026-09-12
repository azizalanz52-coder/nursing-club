'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

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
  const [eventsList, setEventsList] = useState<any[]>([]);

  // حالات نافذة رفع العذر للفعالية
  const [showExcuseModal, setShowExcuseModal] = useState<boolean>(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');
  const [excuseText, setExcuseText] = useState<string>('');
  const [excuseFile, setExcuseFile] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone') || '';
    const name = localStorage.getItem('userName') || '';
    setCurrentUserPhone(phone.trim());
    setCurrentUserName(name.trim());

    const fetchCloudData = async () => {
      try {
        // جلب تفاصيل اللجنة
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

        // جلب قائمة الفعاليات المتاحة ليختار العضو الفعالية التي يعتذر عنها
        const eventsSnap = await getDocs(collection(db, 'site_events'));
        if (!eventsSnap.empty) {
          const evs: any[] = [];
          eventsSnap.forEach((d) => { evs.push({ id: d.id, ...d.data() }); });
          setEventsList(evs);
          if (evs.length > 0) setSelectedEventTitle(evs[0].title);
        }
      } catch (err) {
        console.error('Error fetching cloud data:', err);
      }
    };

    fetchCloudData();
  }, [id, baseDetails]);

  // التحقق هل المستخدم الحالي هو المدير العام
  const isAdmin = currentUserPhone === '0553731265';

  // فلترة أمنية مشددة:
  // - المدير يرى الجميع.
  // - العضو العادي لا يرى سوى اسمه فقط إذا طابق رقم جواله أو اسمه المسجل.
  const displayedMembers = isAdmin 
    ? (committee.members || [])
    : (committee.members || []).filter((m: any) => {
        const memberPhone = m.phone ? String(m.phone).trim() : '';
        const memberName = m.name ? String(m.name).trim() : '';

        const matchPhone = currentUserPhone !== '' && memberPhone === currentUserPhone;
        const matchName = currentUserName !== '' && memberName === currentUserName;

        return matchPhone || matchName;
      });

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadExcuseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!excuseText.trim() || !selectedEventTitle) return;

    try {
      const updatedMembers = (committee.members || []).map((m: any) => {
        const memberPhone = m.phone ? String(m.phone).trim() : '';
        const memberName = m.name ? String(m.name).trim() : '';
        const matchPhone = currentUserPhone !== '' && memberPhone === currentUserPhone;
        const matchName = currentUserName !== '' && memberName === currentUserName;

        if (matchPhone || matchName) {
          // نخزن الاعتذار مع تحديد الفعالية المحددة ليتم رفعه للجنة الموارد البشرية (HR) وباقي اللجان
          return {
            ...m,
            targetEvent: selectedEventTitle,
            excuseText: excuseText.trim(),
            excuseFile: excuseFile || '',
            excuseStatus: 'مُرفع للـ HR (قيد المراجعة ⏳)',
            excuseDate: new Date().toISOString()
          };
        }
        return m;
      });

      const docRef = doc(db, 'committees', id);
      await updateDoc(docRef, { members: updatedMembers });

      setCommittee({ ...committee, members: updatedMembers });
      setShowExcuseModal(false);
      setExcuseText('');
      setExcuseFile('');
      setModalMessage(`تم رفع اعتذارك عن فعالية (${selectedEventTitle}) بنجاح وإرساله إلى لجنة الموارد البشرية وقادة اللجنة 📋✨`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error uploading excuse:', err);
      setModalMessage('حدث خطأ أثناء رفع الاعتذار، يرجى المحاولة مرة أخرى.');
      setShowSuccessModal(true);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="flex justify-between items-center">
          <Link href="/team" className="text-sm font-bold text-[#630517] hover:underline flex items-center gap-1">
            ← العودة لجميع اللجان
          </Link>
          <div className="flex items-center gap-3">
            {!isAdmin && displayedMembers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowExcuseModal(true)}
                className="px-4 py-2 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
              >
                📄 اعتذار عن فعالية (لـ HR)
              </button>
            )}
            <span className="px-4 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-extrabold tracking-wider uppercase border border-[#630517]/20">
              بوابة الأعضاء والقادة
            </span>
          </div>
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
                {isAdmin ? 'عرض لوحة التحكم (جميع الأعضاء وسجلات اعتذاراتهم للـ HR)' : 'عرض خاص: يظهر اسمك واعتذارك المرفوع لضمان الخصوصية'}
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
                  <th className="pb-3">الحالة وسجل الاعتذارات (HR)</th>
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
                      <td className="py-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            {m.status || 'نشط'}
                          </span>
                          {m.excuseStatus && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                              {m.excuseStatus}
                            </span>
                          )}
                        </div>
                        {m.excuseText && (
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-inner">
                            <p className="font-black text-[#630517]">📅 الاعتذار عن فعالية: "{m.targetEvent || 'فعالية عامة'}"</p>
                            <p><strong>📝 سبب الاعتذار:</strong> {m.excuseText}</p>
                            {m.excuseFile && (
                              <a
                                href={m.excuseFile}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#630517] font-bold underline block mt-1"
                              >
                                📎 عرض المرفق / العذر الطبي المرفوع
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showExcuseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleUploadExcuseSubmit} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 border-2 border-[#630517]/20">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              📄
            </div>
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-black text-slate-900">تقديم اعتذار عن فعالية (لملف الموارد البشرية HR)</h3>
              <p className="text-xs text-slate-500">اختر الفعالية التي تعتذر عن حضورها واكتب السبب ليتم توثيقه في سجلك.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">اختر الفعالية</label>
                <select
                  value={selectedEventTitle}
                  onChange={(e) => setSelectedEventTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-[#630517]"
                  required
                >
                  {eventsList.length === 0 ? (
                    <option value="الفعالية العامة للنادي">الفعالية العامة للنادي</option>
                  ) : (
                    eventsList.map((ev, i) => (
                      <option key={i} value={ev.title}>{ev.title} ({ev.date || 'قريباً'})</option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">سبب الاعتذار</label>
                <textarea
                  rows={3}
                  placeholder="مثال: أعتذر عن عدم الحضور بسبب ظرف طارئ / اختبار..."
                  value={excuseText}
                  onChange={(e) => setExcuseText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#630517]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">إرفاق إثبات أو عذر (اختياري)</label>
                <input
                  type="file"
                  accept="image/*, application/pdf"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      const base64 = await convertFileToBase64(e.target.files[0]);
                      setExcuseFile(base64);
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExcuseModal(false)}
                className="w-1/2 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                إرسال الاعتذار للـ HR 🚀
              </button>
            </div>
          </form>
        </div>
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border-2 border-[#F5D061]">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              ✨
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">سجل الموارد البشرية</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{modalMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer transition-all"
            >
              حسنًا 🚀
            </button>
          </div>
        </div>
      )}
    </main>
  );
}