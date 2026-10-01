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
  const [committeeTasks, setCommitteeTasks] = useState<any[]>([]);

  // حالات نافذة رفع الاعتذار المرن البسيط
  const [showExcuseModal, setShowExcuseModal] = useState<boolean>(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');
  const [excuseText, setExcuseText] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone') || '';
    const name = localStorage.getItem('userName') || '';
    setCurrentUserPhone(phone.trim());
    setCurrentUserName(name.trim());

    const fetchCloudData = async () => {
      try {
        const docRef = doc(db, 'committees', id);
        const docSnap = await getDoc(docRef);
        
        let mergedMembers = baseDetails.members || [];
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData.members && cloudData.members.length > 0) {
            mergedMembers = cloudData.members;
          }
          setCommittee(prev => ({
            ...prev,
            maleLeader: cloudData.maleLeader || prev.maleLeader,
            femaleLeader: cloudData.femaleLeader || prev.femaleLeader,
          }));
        }

        // جلب الأعضاء المقبولين من جدول applications
        const appsSnap = await getDocs(collection(db, 'applications'));
        if (!appsSnap.empty) {
          const acceptedFromApps: any[] = [];
          appsSnap.forEach((d) => {
            const data = d.data();
            const acceptedComm = data.acceptedCommittee || '';
            const matchesId = acceptedComm.includes(baseDetails.name) || acceptedComm.includes(id) || baseDetails.name.includes(acceptedComm);
            if (data.status === 'مقبول' && matchesId) {
              acceptedFromApps.push({
                name: data.fullName,
                phone: data.phone,
                role: 'عضو أساسي',
                status: 'نشط ✓',
                universityId: data.universityId || ''
              });
            }
          });

          if (acceptedFromApps.length > 0) {
            const existingPhones = new Set(mergedMembers.map((m: any) => m.phone));
            const uniqueNew = acceptedFromApps.filter(m => !existingPhones.has(m.phone));
            mergedMembers = [...mergedMembers, ...uniqueNew];
          }
        }

        setCommittee(prev => ({ ...prev, members: mergedMembers }));

        // جلب قائمة الفعاليات
        const eventsSnap = await getDocs(collection(db, 'site_events'));
        if (!eventsSnap.empty) {
          const evs: any[] = [];
          eventsSnap.forEach((d) => { evs.push({ id: d.id, ...d.data() }); });
          setEventsList(evs);
          if (evs.length > 0) setSelectedEventTitle(evs[0].title);
        }

        // جلب المهام الخاصة بهذه اللجنة أو من لجنة الجودة
        const tasksSnap = await getDocs(collection(db, 'committee_tasks'));
        if (!tasksSnap.empty) {
          const tasks: any[] = [];
          tasksSnap.forEach((d) => { tasks.push({ id: d.id, ...d.data() }); });
          setCommitteeTasks(tasks);
        }
      } catch (err) {
        console.error('Error fetching cloud data:', err);
      }
    };

    fetchCloudData();
  }, [id, baseDetails]);

  const isAdmin = currentUserPhone === '0553731265';

  // 🛡️ [استعادة الخصوصية التامة]: الأدمن يرى الكل، العضو يرى نفسه فقط، الزائر لا يرى شيئاً
  const displayedMembers = isAdmin 
    ? (committee.members || [])
    : (committee.members || []).filter((m: any) => {
        const memberPhone = m.phone ? String(m.phone).trim() : '';
        const memberName = m.name ? String(m.name).trim() : '';
        const matchPhone = currentUserPhone !== '' && memberPhone === currentUserPhone;
        const matchName = currentUserName !== '' && memberName === currentUserName;
        return matchPhone || matchName;
      });

  // التحقق مما إذا كان المستخدم الحالي عضواً في هذه اللجنة أو مديراً
  const isMemberOfThisCommittee = isAdmin || displayedMembers.length > 0;

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
          return {
            ...m,
            targetEvent: selectedEventTitle,
            excuseText: excuseText.trim(),
            excuseStatus: 'تم تسجيل الاعتذار عن الحضور بمرونة ✓',
            excuseDate: new Date().toLocaleDateString('ar-SA')
          };
        }
        return m;
      });

      const docRef = doc(db, 'committees', id);
      await updateDoc(docRef, { members: updatedMembers });

      setCommittee({ ...committee, members: updatedMembers });
      setShowExcuseModal(false);
      setExcuseText('');
      setModalMessage(`تم إرسال اعتذارك عن فعالية (${selectedEventTitle}) بنجاح وبدون تعقيد 📋✨`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error uploading excuse:', err);
      setModalMessage('حدث خطأ أثناء إرسال الاعتذار، يرجى المحاولة مرة أخرى.');
      setShowSuccessModal(true);
    }
  };

  // فلترة المهام الخاصة بلجنة العضو أو مهام لجنة الجودة
  const relevantTasks = committeeTasks.filter(t => {
    const cName = t.committee || '';
    return cName.includes(committee.name) || cName.includes('الجودة') || cName.includes('التطوير');
  });

  const handleToggleSubTask = async (taskId: string, subTaskIdx: number) => {
    try {
      const taskItem = committeeTasks.find(t => t.id === taskId);
      if (!taskItem) return;

      const updatedSubTasks = [...taskItem.subTasks];
      const isNowCompleted = !updatedSubTasks[subTaskIdx].completed;
      updatedSubTasks[subTaskIdx].completed = isNowCompleted;
      updatedSubTasks[subTaskIdx].completedBy = isNowCompleted ? (currentUserName || 'عضو نشط') : '';

      const taskRef = doc(db, 'committee_tasks', taskId);
      await updateDoc(taskRef, { subTasks: updatedSubTasks });

      setCommitteeTasks(committeeTasks.map(t => t.id === taskId ? { ...t, subTasks: updatedSubTasks } : t));
    } catch (e) { console.error(e); }
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
                🙋‍♂️ أنا أعتذر عن حضور فعالية
              </button>
            )}
            <span className="px-4 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-extrabold tracking-wider uppercase border border-[#630517]/20">
              بوابة الأعضاء
            </span>
          </div>
        </div>

        {/* رأس اللجنة */}
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

        {/* قسم استعراض المهام (مؤمن ولا يظهر إلا لعضو اللجنة أو الأدمن) */}
        {isMemberOfThisCommittee ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">📌 مهام اللجنة ومهام لجنة الجودة والتطوير</h2>
                <p className="text-xs text-slate-500 mt-1">تابع المهام والفعاليات المسندة للجنة أو الموجهة من الجودة وقم بتحديث إنجازها:</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-xl text-xs font-bold">
                {relevantTasks.length} مهام متاحة
              </span>
            </div>

            {relevantTasks.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl">لا توجد مهام أو فعاليات معتمدة لهذه اللجنة حتى الآن.</p>
            ) : (
              <div className="space-y-6">
                {relevantTasks.map((taskGroup) => (
                  <div key={taskGroup.id} className="p-6 rounded-3xl border border-slate-200 bg-slate-50/50 shadow-sm space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] bg-[#630517]/10 text-[#630517] font-bold px-2.5 py-1 rounded-md">لجنة: {taskGroup.committee}</span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-2">فعالية: {taskGroup.eventTitle}</h4>
                      </div>
                      <span className="text-xs font-bold text-slate-500">الموعد: {taskGroup.dueDate}</span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      {(taskGroup.subTasks || []).map((st: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => handleToggleSubTask(taskGroup.id, idx)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            st.completed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-xs border ${
                              st.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {st.completed ? '✓' : ''}
                            </div>
                            <span className={`text-xs font-bold ${st.completed ? 'line-through' : ''}`}>{st.text}</span>
                          </div>
                          {st.completedBy && (<span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">بإنجاز: {st.completedBy}</span>)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center font-black text-lg">🔒</div>
            <h3 className="text-base font-extrabold text-slate-800">قائمة المهام والفعاليات مؤمنة</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">هذه القائمة مخصصة للأعضاء المقبولين والمنضمين رسمياً لهذه اللجنة فقط حفاظاً على السرية وأمان التنظيم.</p>
          </div>
        )}

        {/* جدول الأعضاء (محمي بالخصوصية) */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900">أعضاء {committee.name}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {isAdmin ? 'عرض لوحة التحكم (جميع الأعضاء وسجلات اعتذاراتهم)' : 'عرض خاص: يظهر اسمك واعتذارك المرفوع لضمان الخصوصية'}
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
                  <th className="pb-3">حالة الحضور والاعتذارات</th>
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
                      <td className="py-4 text-slate-600 font-medium">{m.role || 'عضو أساسي'}</td>
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
                          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1 shadow-inner">
                            <p className="font-black text-[#630517]">🙋‍♂️ اعتذار عن فعالية: "{m.targetEvent || 'فعالية عامة'}"</p>
                            <p><strong>السبب:</strong> {m.excuseText}</p>
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

      {/* نافذة رفع الاعتذار المرن البسيط */}
      {showExcuseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleUploadExcuseSubmit} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 border-2 border-[#630517]/20">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              🙋‍♂️
            </div>
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-black text-slate-900">أنا أعتذر عن حضور فعالية</h3>
              <p className="text-xs text-slate-500">اختر الفعالية التي تعتذر عنها واكتب سببك ببساطة وبدون تعقيد:</p>
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
                  placeholder="مثال: أعتذر عن عدم الحضور بسبب ظرف طارئ / عدم التفرغ..."
                  value={excuseText}
                  onChange={(e) => setExcuseText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#630517]"
                  required
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
                className="w-1/2 py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                إرسال الاعتذار 🚀
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
              <h3 className="text-xl font-black text-slate-900">تم بنجاح</h3>
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