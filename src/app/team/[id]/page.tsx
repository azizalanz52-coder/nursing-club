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
    whatsappLink: 'https://chat.whatsapp.com/example-design',
    members: []
  },
  media: {
    id: 'media',
    name: 'لجنة الإعلام',
    description: 'إدارة منصات التواصل الاجتماعي، التغطيات الحية، وصناعة المحتوى المرئي والمكتوب.',
    icon: '📸',
    maleLeader: 'راشد السبيعي',
    femaleLeader: 'ريم الشمري',
    whatsappLink: 'https://chat.whatsapp.com/example-media',
    members: []
  },
  pr: {
    id: 'pr',
    name: 'لجنة العلاقات العامة',
    description: 'بناء الشراكات، استقبال الضيوف، والتنسيق الفعّال بين النادي والجهات الخارجية.',
    icon: '🌐',
    maleLeader: 'خالد القحطاني',
    femaleLeader: 'ديمة العتيبي',
    whatsappLink: 'https://chat.whatsapp.com/example-pr',
    members: []
  },
  quality: {
    id: 'quality',
    name: 'لجنة الجودة والتطوير',
    description: 'مراجعة وتقييم الأداء، قياس رضا الأعضاء، وتقديم مقترحات تحسين العمل المؤسسي.',
    icon: '📊',
    maleLeader: 'سلطان الحربي',
    femaleLeader: 'نورة الدوسري',
    whatsappLink: 'https://chat.whatsapp.com/example-quality',
    members: []
  },
  scientific: {
    id: 'scientific',
    name: 'لجنة المحتوى العلمي',
    description: 'إعداد ومراجعة المطويات الطبية، تنظيم المحاضرات التخصصية، ودعم الأنشطة الأكاديمية.',
    icon: '🔬',
    maleLeader: 'فهد المطيري',
    femaleLeader: 'أفنان العنزي',
    whatsappLink: 'https://chat.whatsapp.com/example-scientific',
    members: []
  },
  hr: {
    id: 'hr',
    name: 'لجنة الموارد البشرية',
    description: 'إدارة شؤون الأعضاء، متابعة الانضمام، وتنظيم تقييمات الأداء والتحفيز.',
    icon: '👥',
    maleLeader: 'تركي العنزي',
    femaleLeader: 'سارة الرشيدي',
    whatsappLink: 'https://chat.whatsapp.com/example-hr',
    members: []
  },
  'events-org': {
    id: 'events-org',
    name: 'لجنة التنظيم والفعاليات',
    description: 'التخطيط الميداني للفعاليات، إدارة الحشود، والتنسيق اللوجستي للورش والملتقيات.',
    icon: '📅',
    maleLeader: 'فيصل الدوسري',
    femaleLeader: 'غادة العمري',
    whatsappLink: 'https://chat.whatsapp.com/example-events',
    members: []
  },
};

export default function CommitteeDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const baseDetails = defaultCommitteesDetails[id] || null;
  
  const [committee, setCommittee] = useState<any>(baseDetails);
  const [currentUserPhone, setCurrentUserPhone] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAuthorizedMember, setIsAuthorizedMember] = useState<boolean>(false);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [committeeTasks, setCommitteeTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [showExcuseModal, setShowExcuseModal] = useState<boolean>(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');
  const [excuseText, setExcuseText] = useState<string>('');
  const [modalMessage, setModalMessage] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone') || '';
    const name = localStorage.getItem('userName') || '';
    const trimmedPhone = phone.trim();
    
    setCurrentUserPhone(trimmedPhone);
    setCurrentUserName(name.trim());
    
    if (trimmedPhone !== '') {
      setIsLoggedIn(true);
    }

    if (!baseDetails) {
      setLoading(false);
      return;
    }

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
          setCommittee((prev: any) => ({
            ...prev,
            maleLeader: cloudData.maleLeader || prev.maleLeader,
            femaleLeader: cloudData.femaleLeader || prev.femaleLeader,
            whatsappLink: cloudData.whatsappLink || prev.whatsappLink,
          }));
        }

        const appsSnap = await getDocs(collection(db, 'applications'));
        let userAuthorized = trimmedPhone === '0553731265';

        if (!appsSnap.empty) {
          const acceptedFromApps: any[] = [];
          appsSnap.forEach((d) => {
            const data = d.data();
            const acceptedComm = data.acceptedCommittee || '';
            const matchesId = acceptedComm.includes(baseDetails.name) || acceptedComm.includes(id) || baseDetails.name.includes(acceptedComm);
            
            if (data.status === 'مقبول' && matchesId) {
              acceptedFromApps.push({
                name: data.fullName,
                phone: data.phone ? String(data.phone).trim() : '',
                role: 'عضو أساسي',
                status: 'نشط ✓',
                universityId: data.universityId || ''
              });

              if (trimmedPhone !== '' && data.phone && String(data.phone).trim() === trimmedPhone) {
                userAuthorized = true;
              }
            }
          });

          if (acceptedFromApps.length > 0) {
            const existingPhones = new Set(mergedMembers.map((m: any) => m.phone));
            const uniqueNew = acceptedFromApps.filter(m => !existingPhones.has(m.phone));
            mergedMembers = [...mergedMembers, ...uniqueNew];
          }
        }

        if (!userAuthorized && trimmedPhone !== '') {
          const foundInDirect = mergedMembers.some((m: any) => m.phone && String(m.phone).trim() === trimmedPhone);
          if (foundInDirect) userAuthorized = true;
        }

        setIsAuthorizedMember(userAuthorized);
        setCommittee((prev: any) => ({ ...prev, members: mergedMembers }));

        const eventsSnap = await getDocs(collection(db, 'site_events'));
        if (!eventsSnap.empty) {
          const evs: any[] = [];
          eventsSnap.forEach((d) => { evs.push({ id: d.id, ...d.data() }); });
          setEventsList(evs);
          if (evs.length > 0) setSelectedEventTitle(evs[0].title);
        }

        const tasksSnap = await getDocs(collection(db, 'committee_tasks'));
        if (!tasksSnap.empty) {
          const tasks: any[] = [];
          tasksSnap.forEach((d) => { tasks.push({ id: d.id, ...d.data() }); });
          setCommitteeTasks(tasks);
        }
      } catch (err) {
        console.error('Error fetching cloud data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCloudData();
  }, [id, baseDetails]);

  const isAdmin = currentUserPhone === '0553731265';

  const displayedMembers = isAdmin 
    ? (committee?.members || [])
    : (committee?.members || []).filter((m: any) => {
        const memberPhone = m.phone ? String(m.phone).trim() : '';
        return currentUserPhone !== '' && memberPhone === currentUserPhone;
      });

  const handleUploadExcuseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!excuseText.trim() || !selectedEventTitle) return;

    try {
      const updatedMembers = (committee.members || []).map((m: any) => {
        const memberPhone = m.phone ? String(m.phone).trim() : '';
        if (currentUserPhone !== '' && memberPhone === currentUserPhone) {
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
      setModalMessage(`تم إرسال اعتذارك عن فعالية (${selectedEventTitle}) بنجاح 📋✨`);
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error uploading excuse:', err);
      setModalMessage('حدث خطأ أثناء إرسال الاعتذار، يرجى المحاولة مرة أخرى.');
      setShowSuccessModal(true);
    }
  };

  const relevantTasks = committeeTasks.filter(t => {
    const cName = t.committee || '';
    return committee && (cName.includes(committee.name) || cName.includes('الجودة') || cName.includes('التطوير'));
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

  if (!baseDetails) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 py-20 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold">🔍</div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900">لم يتم تحديد اللجنة</h1>
            <p className="text-xs text-slate-500 leading-relaxed">يرجى الانتقال إلى صفحة الهيكلة التنظيمية واختيار لجنتك المعتمدة.</p>
          </div>
          <div className="pt-2">
            <Link href="/team" className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 transition-all inline-block">
              الانتقال لصفحة اللجان ➔
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <p className="text-sm font-bold text-slate-500 animate-pulse">جاري التحقق من صلاحيات العضوية والخصوصية...</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 py-20 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold">🔒</div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900">تسجيل الدخول مطلوب</h1>
            <p className="text-xs text-slate-500 leading-relaxed">بوابة الأعضاء واللجان مخصصة للأعضاء المقبولين فقط. يرجى تسجيل الدخول برقم الجوال.</p>
          </div>
          <div className="pt-2">
            <Link href="/" className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 transition-all inline-block">
              العودة للرئيسية وتسجيل الدخول ➔
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthorizedMember) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-800 py-20 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 text-red-700 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold">⚠️</div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900">عذراً، لست من أعضاء هذه اللجنة</h1>
            <p className="text-xs text-slate-500 leading-relaxed">حسابك غير مقترن أو مقبول رسمياً في ({committee?.name}). هذه الصفحة مؤمنة تماماً.</p>
          </div>
          <div className="pt-2">
            <Link href="/team" className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 transition-all inline-block">
              العودة لقائمة اللجان ➔
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="flex justify-between items-center">
          <Link href="/team" className="text-sm font-bold text-[#630517] hover:underline flex items-center gap-1">
            ← العودة لجميع اللجان
          </Link>
          <div className="flex items-center gap-3">
            {!isAdmin && (
              <button
                type="button"
                onClick={() => setShowExcuseModal(true)}
                className="px-4 py-2 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow-md hover:brightness-110 transition-all cursor-pointer flex items-center gap-1.5"
              >
                🙋‍♂️ أنا أعتذر عن حضور فعالية
              </button>
            )}
            <span className="px-4 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-extrabold tracking-wider uppercase border border-[#630517]/20">
              بوابة الأعضاء الرسمية
            </span>
          </div>
        </div>

        {/* رأس اللجنة */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#630517]/10 border border-[#630517]/20 flex items-center justify-center text-3xl shadow-sm">
                {committee?.icon}
              </div>
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">عضو معتمد في هذه اللجنة ✓</span>
                <h1 className="text-3xl font-black text-slate-900 mt-1">{committee?.name}</h1>
                <p className="text-slate-600 text-sm mt-1">{committee?.description}</p>
              </div>
            </div>

            {committee?.whatsappLink && (
              <a
                href={committee.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-black text-xs shadow hover:bg-emerald-700 transition-all flex items-center gap-2"
              >
                <span>💬</span>
                <span>قروب واتساب اللجنة</span>
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80">
              <span className="text-slate-400 font-bold">قائد الطلاب:</span>
              <span className="font-extrabold text-slate-900 text-sm">{committee?.maleLeader}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/80">
              <span className="text-slate-400 font-bold">قائدة الطالبات:</span>
              <span className="font-extrabold text-slate-900 text-sm">{committee?.femaleLeader}</span>
            </div>
          </div>
        </div>

        {/* مهام اللجنة */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">📌 مهام اللجنة ومهام لجنة الجودة والتطوير</h2>
              <p className="text-xs text-slate-500 mt-1">تابع المهام والفعاليات المسندة للجنة وقم بتحديث إنجازها:</p>
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

      </div>

      {/* نوافذ الحوار والاعتذارات */}
      {showExcuseModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleUploadExcuseSubmit} className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 border-2 border-[#630517]/20">
            <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              🙋‍♂️
            </div>
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-black text-slate-900">أنا أعتذر عن حضور فعالية</h3>
              <p className="text-xs text-slate-500">اختر الفعالية التي تعتذر عنها واكتب سببك ببساطة:</p>
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
                  placeholder="مثال: أعتذر عن عدم الحضور بسبب ظرف طارئ..."
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