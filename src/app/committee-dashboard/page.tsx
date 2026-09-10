'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export default function CommitteeLeaderDashboard() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [whatsappLink, setWhatsappLink] = useState('');

  // هل المستخدم من لجنة الجودة والتطوير؟
  const [isQualityTeam, setIsQualityTeam] = useState(false);
  const [allCommitteesList] = useState<string[]>([
    'لجنة التصميم',
    'لجنة الاعلام',
    'لجنة تنظيم الفعاليات',
    'لجنة الموارد البشرية',
    'لجنة العلاقات العامة',
    'لجنة المحتوى العلمي',
    'لجنة الجودة والتطوير'
  ]);
  const [selectedMonitoredCommittee, setSelectedMonitoredCommittee] = useState<string>('لجنة التصميم');

  // إذا لم يكن من الجودة، تكون لجنته الخاصة
  const [selectedManagedCommittee, setSelectedManagedCommittee] = useState<string>('لجنة تنظيم الفعاليات');
  const [preferenceFilterTab, setPreferenceFilterTab] = useState<'pref-1' | 'pref-2' | 'pref-3'>('pref-1');

  // حالات الإشعارات والمهام المرتبطة بالفعاليات والتنبيهات
  const [announcementText, setAnnouncementText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [eventTitle, setEventTitle] = useState(''); 
  const [taskDueDate, setTaskDueDate] = useState('');

  // نافذة مركز التقارير والشكاوى المرفوعة
  const [escalatedReports, setEscalatedReports] = useState<any[]>([]);
  const [showReportsModal, setShowReportsModal] = useState(false);

  // نظام الإنذار المتدرج والتحذير قبل التصعيد للرؤساء
  const [warningReason, setWarningReason] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [targetCommitteeForWarning, setTargetCommitteeForWarning] = useState('');
  const [warningStepType, setWarningStepType] = useState<'warn-leaders' | 'escalate-presidents'>('warn-leaders');

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone');
    if (!phone) {
      alert('الرجاء تسجيل الدخول أولاً.');
      router.push('/login');
      return;
    }
    setUserPhone(phone);
    fetchLeaderData(phone);
    fetchEscalatedReports();
  }, [router]);

  const fetchLeaderData = async (phone: string) => {
    try {
      const userRef = doc(db, 'users', phone);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        router.push('/login');
        return;
      }

      const uData = userSnap.data();
      setUserData(uData);

      if (phone === '0553731265' || uData.role === 'System Admin' || uData.role === 'General Supervisor') {
        router.push('/admin');
        return;
      }

      const assigned = uData.assignedCommittee || uData.committee || '';
      const roleStr = uData.role || '';

      if (roleStr.includes('جودة') || assigned.includes('جودة') || assigned.includes('الجودة')) {
        setIsQualityTeam(true);
      } else {
        setIsQualityTeam(false);
        setSelectedManagedCommittee(assigned || 'لجنة تنظيم الفعاليات');
      }

      const reqSnap = await getDocs(collection(db, 'applications'));
      const allReqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(allReqs);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchEscalatedReports = async () => {
    try {
      const snap = await getDocs(collection(db, 'escalated_reports'));
      const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEscalatedReports(reports);
    } catch (e) {
      console.error(e);
    }
  };

  const matchesTargetCommittee = (choiceStr: string, targetComm: string) => {
    if (!choiceStr) return false;
    const cleanChoice = choiceStr.replace(/الـ/g, '').replace(/إ/g, 'ا').replace(/أ/g, 'ا').replace(/آ/g, 'ا').trim();
    const cleanTarget = targetComm.replace(/الـ/g, '').replace(/إ/g, 'ا').replace(/أ/g, 'ا').replace(/آ/g, 'ا').trim();
    
    if (cleanChoice.includes('اعلام') && cleanTarget.includes('اعلام')) return true;
    if (cleanChoice.includes('تصميم') && cleanTarget.includes('تصميم')) return true;
    if (cleanChoice.includes('فعاليات') && cleanTarget.includes('فعاليات')) return true;
    if (cleanChoice.includes('موارد') && cleanTarget.includes('موارد')) return true;
    if (cleanChoice.includes('علاقات') && cleanTarget.includes('علاقات')) return true;
    if (cleanChoice.includes('علمي') && cleanTarget.includes('علمي')) return true;
    if (cleanChoice.includes('جودة') && cleanTarget.includes('جودة')) return true;

    return choiceStr.includes(targetComm) || targetComm.includes(choiceStr);
  };

  const filteredRequests = (requests || []).filter(req => {
    const targetKey = preferenceFilterTab === 'pref-1' ? 'firstChoice' : preferenceFilterTab === 'pref-2' ? 'secondChoice' : 'thirdChoice';
    const choiceValue = req[targetKey] || '';
    return matchesTargetCommittee(choiceValue, selectedManagedCommittee) || req.acceptedCommittee === selectedManagedCommittee;
  });

  const totalApplicantsCount = requests.filter(r => matchesTargetCommittee(r.firstChoice, selectedManagedCommittee) || matchesTargetCommittee(r.secondChoice, selectedManagedCommittee) || matchesTargetCommittee(r.thirdChoice, selectedManagedCommittee)).length;
  const acceptedMembersCount = requests.filter(r => r.acceptedCommittee === selectedManagedCommittee || r.status === 'مقبول').length;

  const handleAcceptSubmit = async () => {
    if (!selectedReqId) return;
    try {
      const targetReq = requests.find(r => r.id === selectedReqId);
      const docRef = doc(db, 'applications', selectedReqId);
      await updateDoc(docRef, {
        status: 'مقبول',
        acceptedCommittee: selectedManagedCommittee,
        whatsappLink: whatsappLink,
        latestNotification: `مبروك! تم قبولك رسمياً في (${selectedManagedCommittee}) 🎉. انضم لقروب الواتساب: ${whatsappLink}`
      });

      if (targetReq?.phone) {
        try {
          const userDocRef = doc(db, 'users', targetReq.phone);
          await updateDoc(userDocRef, {
            latestNotification: `🎉 مبارك القبول النهائي في (${selectedManagedCommittee})!`
          });
        } catch (e) { console.error(e); }
      }

      setRequests((requests || []).map(r => r.id === selectedReqId ? { ...r, status: 'مقبول', acceptedCommittee: selectedManagedCommittee, whatsappLink } : r));
      setShowAcceptModal(false);
      setWhatsappLink('');
      alert(`تم قبول المتقدم في (${selectedManagedCommittee}) بنجاح! 🎉`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء قبول الطلب.');
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('هل أنت متأكد من رفض الطلب؟')) {
      try {
        const docRef = doc(db, 'applications', id);
        await updateDoc(docRef, { status: 'مرفوض' });
        setRequests((requests || []).map(r => r.id === id ? { ...r, status: 'مرفوض' } : r));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleShiftPreference = async (req: Record<string, any>) => {
    const f1 = req.firstChoice || '';
    const f2 = req.secondChoice || '';
    const f3 = req.thirdChoice || '';

    const updatedObj = {
      ...req,
      firstChoice: f2 || f3 || f1,
      secondChoice: f3 || f1 || f2,
      thirdChoice: f1 || f2 || f3
    };

    try {
      const docRef = doc(db, 'applications', req.id);
      await updateDoc(docRef, {
        firstChoice: updatedObj.firstChoice,
        secondChoice: updatedObj.secondChoice,
        thirdChoice: updatedObj.thirdChoice
      });
      setRequests((requests || []).map(r => r.id === req.id ? updatedObj : r));
      alert('تم تحويل الطالب إلى رغبته التالية بنجاح! 🔄');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحويل رغبة الطالب.');
    }
  };

  const handleSendBroadcastAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;

    try {
      const targetComm = isQualityTeam ? selectedMonitoredCommittee : selectedManagedCommittee;
      const acceptedList = requests.filter(r => r.acceptedCommittee === targetComm || r.status === 'مقبول');
      for (const mem of acceptedList) {
        if (mem.phone) {
          const uRef = doc(db, 'users', mem.phone);
          await updateDoc(uRef, {
            latestNotification: `📢 تعميم من رئيس ${targetComm}: ${announcementText}`
          });
        }
      }
      alert('تم إرسال التعميم والإشعار لجميع أعضاء اللجنة بنجاح! 🚀');
      setAnnouncementText('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال التعميم.');
    }
  };

  const handleAssignTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !eventTitle.trim()) {
      alert('الرجاء إدخال عنوان الفعالية وعنوان المهمة لضمان اكتمال مركز العمليات.');
      return;
    }

    try {
      const targetComm = isQualityTeam ? selectedMonitoredCommittee : selectedManagedCommittee;
      const acceptedList = requests.filter(r => r.acceptedCommittee === targetComm || r.status === 'مقبول');
      
      await addDoc(collection(db, 'committee_tasks'), {
        committee: targetComm,
        eventTitle: eventTitle,
        taskTitle: taskTitle,
        dueDate: taskDueDate || 'محدد قريباً',
        status: 'قيد التنفيذ',
        createdAt: Date.now()
      });

      for (const mem of acceptedList) {
        if (mem.phone) {
          const uRef = doc(db, 'users', mem.phone);
          await updateDoc(uRef, {
            latestNotification: `⚡ [مهمة فعالية: ${eventTitle}] من (${targetComm}): ${taskTitle} (الموعد: ${taskDueDate || 'عاجل'})`
          });
        }
      }
      alert(`تم ربط المهمة بفعالية (${eventTitle}) وإرسالها لكل أعضاء (${targetComm}) بنجاح! 🎯`);
      setTaskTitle('');
      setEventTitle('');
      setTaskDueDate('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع التكليف.');
    }
  };

  // معالجة إرسال الإنذار أولاً للقادة أو التصعيد النهائي للرؤساء
  const handleExecuteWarningOrEscalation = async () => {
    if (!warningReason.trim()) {
      alert('الرجاء كتابة تفاصيل الإنذار أو التقصير بوضوح.');
      return;
    }

    try {
      if (warningStepType === 'warn-leaders') {
        // الخطوة الأولى: إرسال إنذار داخلي لقائد وقائدة اللجنة مع مهلة
        await addDoc(collection(db, 'escalated_reports'), {
          targetCommittee: targetCommitteeForWarning,
          reporter: userData?.fullName || 'لجنة الجودة والتطوير',
          reason: warningReason,
          status: '⚠️ تم إرسال إنذار للقادة (بانتظار الرد خلال 24 ساعة)',
          warningSentAt: Date.now(),
          createdAt: Date.now()
        });
        alert(`📨 [تم إرسال الإنذار الداخلي]: تم توجيه إنذار تحذيري رسمي لقائد وقائدة (${targetCommitteeForWarning}) مع مهلة تصحيح.`);
      } else {
        // الخطوة الثانية: عدم التجاوب والتصعيد النهائي للرئيس ورئيسة النادي
        await addDoc(collection(db, 'escalated_reports'), {
          targetCommittee: targetCommitteeForWarning,
          reporter: userData?.fullName || 'لجنة الجودة والتطوير',
          reason: `[عدم تجاوب مع الإنذار السابق]: ${warningReason}`,
          status: '🚨 مُحال رسمياً للرئيس ورئيسة النادي (لعدم التجاوب والتأديب)',
          escalatedAt: Date.now(),
          createdAt: Date.now()
        });
        alert(`⚖️ [تم التصعيد النهائي للرؤساء]: لعدم التجاوب، تم إحالة البلاغ رسمياً لمكتب رئيس ورئيسة النادي لاتخاذ الإجراء الحازم.`);
      }

      setShowWarningModal(false);
      setWarningReason('');
      fetchEscalatedReports();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إرسال البلاغ.');
    }
  };

  const handleExportCommitteeExcel = () => {
    const targetComm = isQualityTeam ? selectedMonitoredCommittee : selectedManagedCommittee;
    const acceptedList = requests.filter(r => r.acceptedCommittee === targetComm || r.status === 'مقبول');
    if (acceptedList.length === 0) {
      alert('لا توجد بيانات لأعضاء مقبولين للتصدير حالياً.');
      return;
    }

    const excelData = acceptedList.map((m, index) => ({
      'م': index + 1,
      'اسم العضو': m.fullName,
      'رقم الجوال': m.phone,
      'الرقم الجامعي': m.universityId || '-',
      'التخصص': m.major || 'تمريض',
      'اللجنة المقبول بها': m.acceptedCommittee || targetComm
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'أعضاء اللجنة');
    XLSX.writeFile(workbook, `Committee_${targetComm}_Members.xlsx`);
    alert('تم تصدير ملف الأكسل بنجاح وجاهز لرفعه للآدمن! 📊');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600 bg-slate-50">جاري تحميل لوحة تحكم اللجنة التفاعلية...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* الشريط العلوي */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {isQualityTeam ? '⚡ غرفة عمليات لجنة الجودة والتطوير (العقل المدبر والمركز المرعب)' : 'لوحة تحكم رئيس اللجنة القيادية 🛡️'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              أهلاً بك، {userData?.fullName} • {isQualityTeam ? 'صلاحية مراقبة ورصد وإنذار وإحالة اللجان السبع للرؤساء برتبة عسكرية صارمة' : `اللجنة المعينة لك: ${selectedManagedCommittee}`}
            </p>
          </div>
          
          <div className="flex gap-2 items-center">
            {isQualityTeam && (
              <button
                type="button"
                onClick={() => setShowReportsModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow hover:bg-red-700 flex items-center gap-1.5 cursor-pointer"
              >
                <span>🚨</span>
                <span>مركز الشكاوى والتقارير المرفوعة ({escalatedReports.length})</span>
              </button>
            )}
            <Link href="/" className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200">
              الرئيسية ←
            </Link>
          </div>
        </div>

        {/* إذا كان المستخدم من لجنة الجودة، نعرض له رادار اللجان السبع مع خيار الإنذار والتصعيد المتدرج */}
        {isQualityTeam && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h3 className="font-black text-slate-900 text-sm">رادار مراقبة ورصد إنجازات اللجان السبع (التدرج: إنذار القادة أولاً ثم التصعيد للرؤساء):</h3>
              <span className="text-[11px] bg-red-100 text-red-700 font-bold px-3 py-1 rounded-xl">
                ⚠️ النظام النظامي: إنذار القادة بمهلة 24 ساعة، وإذا لم يتجاوبوا يتم رفع البلاغ للرؤساء
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {allCommitteesList.map((commName, idx) => {
                const count = requests.filter(r => r.acceptedCommittee === commName).length;
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setSelectedMonitoredCommittee(commName);
                      setSelectedManagedCommittee(commName);
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      selectedManagedCommittee === commName ? 'bg-[#630517] text-white border-[#630517] shadow-lg scale-[1.02]' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${selectedManagedCommittee === commName ? 'bg-white/20 text-[#F5D061]' : 'bg-slate-100 text-slate-600'}`}>
                        مراقبة عليا
                      </span>
                      <span className="text-lg font-black">{count} أعضاء</span>
                    </div>
                    <h4 className="font-extrabold text-sm">{commName}</h4>

                    <div className="pt-2 flex flex-col gap-1.5 border-t border-white/10 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetCommitteeForWarning(commName);
                          setWarningStepType('warn-leaders');
                          setShowWarningModal(true);
                        }}
                        className={`w-full py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                          selectedManagedCommittee === commName 
                            ? 'bg-amber-500 text-white hover:bg-amber-600' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        ⚠️ إنذار قائد وقائدة اللجنة
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetCommitteeForWarning(commName);
                          setWarningStepType('escalate-presidents');
                          setShowWarningModal(true);
                        }}
                        className={`w-full py-1.5 rounded-xl text-[10px] font-black transition-all ${
                          selectedManagedCommittee === commName 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        🚨 تصعيد البلاغ للرئيس ورئيسة النادي
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* إحصائيات فورية خاصة باللجنة المختارة */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-[#630517] to-[#80071D] text-white p-6 rounded-3xl shadow-xl space-y-2">
            <span className="text-[11px] font-bold text-[#F5D061] uppercase tracking-wider">إجمالي المتقدمين للجنة</span>
            <div className="text-3xl font-black">{totalApplicantsCount}</div>
            <p className="text-xs text-white/80">المتقدمون برغباتهم (الأولى، الثانية، والثالثة)</p>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">عدد الأعضاء المقبولين</span>
            <div className="text-3xl font-black text-slate-900">{acceptedMembersCount}</div>
            <p className="text-xs text-slate-500">تم قبولهم وانضمامهم لقروب اللجنة</p>
          </div>

          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">نسبة الإنجاز واستيعاب اللجنة</span>
            <div className="text-3xl font-black text-slate-900">
              {totalApplicantsCount > 0 ? Math.round((acceptedMembersCount / totalApplicantsCount) * 100) : 0}%
            </div>
            <p className="text-xs text-slate-500">معدل قبول المتقدمين</p>
          </div>
        </div>

        {/* الأدوات القيادية (إشعار جماعي، ربط المهام بعنوان الفعالية، وتصدير أكسل) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900">📢 إرسال إشعار جماعي لأعضاء اللجنة</h3>
              <p className="text-[11px] text-slate-500">اكتب رسالة ستصل كإشعار فوري داخل لوحة تحكم كل عضو مقبول بـ ({selectedManagedCommittee}).</p>
            </div>
            <form onSubmit={handleSendBroadcastAnnouncement} className="space-y-3 pt-2">
              <textarea
                rows={2}
                placeholder="اكتب نص التعميم أو التنبيه هنا..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#630517] text-[#F5D061] font-bold text-xs shadow hover:brightness-110 cursor-pointer"
              >
                إرسال الإشعار الفوري 🚀
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900">🎯 رفع المهام المرتبطة بالفعالية</h3>
              <p className="text-[11px] text-slate-500">اربط التكليف بـ (عنوان الفعالية) لضبط الإنجاز ومحاسبة المقصرين.</p>
            </div>
            <form onSubmit={handleAssignTask} className="space-y-2 pt-1">
              <input
                type="text"
                placeholder="عنوان الفعالية المرتبطة (مثال: ملتقى التمريض السنوي)..."
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
              />
              <input
                type="text"
                placeholder="تفاصيل المهمة المطلوبة..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
              />
              <input
                type="text"
                placeholder="الموعد النهائي (مثال: الأربعاء القادم)"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#630517] text-[#F5D061] font-bold text-xs shadow hover:brightness-110 cursor-pointer"
              >
                نشر التكليف والربط بفعالية ⚡
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900">📊 تصدير أعضاء اللجنة (Excel)</h3>
              <p className="text-[11px] text-slate-500">تصدير قائمة الأعضاء المقبولين بملف أكسل جاهز لرفعه للآدمن.</p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleExportCommitteeExcel}
                className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-lg hover:bg-emerald-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📥 تحميل ملف Excel للأعضاء</span>
              </button>
            </div>
          </div>

        </div>

        {/* الجدول الخاص بالمرشحين والمتقدمين وقبولهم */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">متقدمو وقبولو ({selectedManagedCommittee})</h3>
              <p className="text-xs text-slate-500">اختر الرغبة لعرض المتقدمين بدقة وقبولهم برابط قروب الواتساب:</p>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPreferenceFilterTab('pref-1')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${preferenceFilterTab === 'pref-1' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                🎯 الرغبة الأولى ({requests.filter(r => matchesTargetCommittee(r.firstChoice, selectedManagedCommittee)).length})
              </button>
              <button
                type="button"
                onClick={() => setPreferenceFilterTab('pref-2')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${preferenceFilterTab === 'pref-2' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                🥈 الرغبة الثانية ({requests.filter(r => matchesTargetCommittee(r.secondChoice, selectedManagedCommittee)).length})
              </button>
              <button
                type="button"
                onClick={() => setPreferenceFilterTab('pref-3')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${preferenceFilterTab === 'pref-3' ? 'bg-[#630517] text-[#F5D061]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                🥉 الرغبة الثالثة ({requests.filter(r => matchesTargetCommittee(r.thirdChoice, selectedManagedCommittee)).length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="pb-3 pr-2">اسم المتقدم</th>
                  <th className="pb-3">الرقم الجامعي</th>
                  <th className="pb-3">الرغبات</th>
                  <th className="pb-3">الحالة</th>
                  <th className="pb-3 text-left pl-2">إجراءات وصلاحيات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">لا توجد طلبات متقدمين مطابقة لهذه الرغبة في "{selectedManagedCommittee}" حالياً.</td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-2 font-bold text-slate-900">
                        {req.fullName} 
                        <div className="text-[10px] text-slate-400 font-normal">📞 {req.phone}</div>
                      </td>
                      <td className="py-3 text-slate-600 font-mono">{req.universityId || '-'}</td>
                      <td className="py-3 text-slate-600 text-[11px] space-y-0.5">
                        <p><strong className="text-[#630517]">1:</strong> {req.firstChoice}</p>
                        <p><strong className="text-slate-400">2:</strong> {req.secondChoice}</p>
                        <p><strong className="text-slate-400">3:</strong> {req.thirdChoice}</p>
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-1 rounded-full font-bold border ${
                          req.status === 'مقبول' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          req.status === 'مرفوض' ? 'bg-red-50 text-red-700 border-red-200' : 
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {req.status || 'معلق'}
                        </span>
                        {req.acceptedCommittee && (
                          <div className="text-[10px] text-[#630517] font-bold mt-1">مقبول في: {req.acceptedCommittee}</div>
                        )}
                      </td>
                      <td className="py-3 text-left pl-2 flex gap-1.5 justify-end flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleShiftPreference(req)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 font-bold hover:bg-sky-100 cursor-pointer text-xs"
                          title="تحويل الطالب لرغبته التالية"
                        >
                          🔄 تحويل لرغبة أخرى
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReqId(req.id);
                            setShowAcceptModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer text-xs"
                        >
                          قبول ✅
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(req.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 cursor-pointer text-xs"
                        >
                          رفض ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* نافذة تأكيد القبول برابط الواتساب */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-3">تأكيد القبول في {selectedManagedCommittee}</h3>
            <div className="space-y-4">
              <p className="text-xs text-slate-600">سيتم قبول الطالب رسمياً في هذه اللجنة وربطه برابط قروب الواتساب الخاص بها وإرسال تنبيه فوري له.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">رابط قروب الواتساب:</label>
                <input
                  type="text"
                  placeholder="https://chat.whatsapp.com/..."
                  value={whatsappLink}
                  onChange={(e) => setWhatsappLink(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAcceptSubmit}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow hover:bg-emerald-700 cursor-pointer"
              >
                تأكيد القبول وإرسال الرابط ✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة مركز الشكاوى والتقارير المرفوعة للرئيس والآدمن */}
      {showReportsModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto border-2 border-red-500">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">🚨 مركز التقارير والشكاوى المرفوعة بحق اللجان</h3>
              <button onClick={() => setShowReportsModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕ إغلاق</button>
            </div>
            
            <div className="space-y-3">
              {escalatedReports.length === 0 ? (
                <p className="text-center py-8 text-slate-400 font-bold text-xs">لا توجد تقارير تقصير أو شكاوى مرفوعة حتى الآن. الوضع مستقر وتحت السيطرة.</p>
              ) : (
                escalatedReports.map((rep) => (
                  <div key={rep.id} className="bg-red-50/60 border border-red-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-red-700">اللجنة المعنية: {rep.targetCommittee}</span>
                      <span className="text-[10px] bg-red-200 text-red-900 font-bold px-2 py-0.5 rounded">بلاغ رسمي</span>
                    </div>
                    <p className="text-xs text-slate-800 font-semibold">السبب والتقصير المرصود: {rep.reason}</p>
                    <div className="text-[10px] text-slate-500 flex justify-between pt-2 border-t border-red-200/50">
                      <span>الرافع: {rep.reporter}</span>
                      <span className="font-bold text-red-800">{rep.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* نافذة إنذار القادة أو التصعيد النهائي للرؤساء */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6 border-2 border-amber-500">
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold text-white ${warningStepType === 'warn-leaders' ? 'bg-amber-500' : 'bg-red-600'}`}>
              {warningStepType === 'warn-leaders' ? '⚠️' : '🚨'}
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                {warningStepType === 'warn-leaders' ? 'إنذار داخلي لقائد وقائدة اللجنة' : 'تصعيد وإحالة البلاغ للرئيس ورئيسة النادي'}
              </h3>
              <p className="text-xs text-slate-500">
                {warningStepType === 'warn-leaders' 
                  ? `توجيه إنذار تحذيري مع مهلة 24 ساعة لـ (${targetCommitteeForWarning})` 
                  : `تصعيد نهائي لعدم التجاوب ضد (${targetCommitteeForWarning})`}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">التفاصيل أو التقصير المرصود:</label>
              <textarea
                rows={3}
                placeholder={warningStepType === 'warn-leaders' ? "اكتب سبب الإنذار ومنحه المهلة..." : "اكتب سبب عدم تجاوبهم للإحالة الفورية للرئيس..."}
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="w-1/2 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteWarningOrEscalation}
                className={`w-1/2 py-3 rounded-2xl text-white font-black text-xs shadow-lg cursor-pointer ${
                  warningStepType === 'warn-leaders' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {warningStepType === 'warn-leaders' ? 'إرسال الإنذار للقادة 📨' : 'تصعيد رسمي للرؤساء ⚖️'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}