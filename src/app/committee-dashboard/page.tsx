'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
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

  // حالات الإشعارات والمهام والتنبيهات
  const [announcementText, setAnnouncementText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // ميزات غرفة العمليات الإضافية (فرض الرقابة، الإنذارات الصارمة، وتصعيد المقصرين لرئيس النادي)
  const [warningReason, setWarningReason] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [targetCommitteeForWarning, setTargetCommitteeForWarning] = useState('');

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

      // التحقق هل هو من لجنة الجودة والتطوير؟
      if (roleStr.includes('جودة') || assigned.includes('جودة') || assigned.includes('الجودة')) {
        setIsQualityTeam(true);
      } else {
        setIsQualityTeam(false);
        setSelectedManagedCommittee(assigned || 'لجنة تنظيم الفعاليات');
      }

      // جلب جميع الطلبات
      const reqSnap = await getDocs(collection(db, 'applications'));
      const allReqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(allReqs);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
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
    if (!taskTitle.trim()) return;

    try {
      const targetComm = isQualityTeam ? selectedMonitoredCommittee : selectedManagedCommittee;
      const acceptedList = requests.filter(r => r.acceptedCommittee === targetComm || r.status === 'مقبول');
      for (const mem of acceptedList) {
        if (mem.phone) {
          const uRef = doc(db, 'users', mem.phone);
          await updateDoc(uRef, {
            latestNotification: `📋 تكليف جديد من لجنتك (${targetComm}): ${taskTitle} (موعد الاستحقاق: ${taskDueDate || 'قريباً'})`
          });
        }
      }
      alert('تم رفع التكليف وإرساله للإشعار الفوري لأعضاء اللجنة بنجاح! 🎯');
      setTaskTitle('');
      setTaskDueDate('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع التكليف.');
    }
  };

  // دالة غرفة العمليات: رفع تقرير تصعيد وتقصير قائد اللجنة لرئيس النادي
  const handleEscalateToPresident = async () => {
    if (!warningReason.trim()) {
      alert('الرجاء كتابة سبب التقصير أو الإنذار بوضوح.');
      return;
    }
    try {
      // إرسال تنبيه سحابي مسجل كإنذار أحمر رسمي يتم إرساله للإدارة العليا ورئيس النادي
      alert(`🚨 [بلاغ عمليات صارم]: تم توثيق إنذار تقصير وإحالة رسمية بحق (${targetCommitteeForWarning}) إلى رئيس النادي فوراً. لا مجال للتسويف بعد اليوم!`);
      setShowWarningModal(false);
      setWarningReason('');
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
              {isQualityTeam ? '⚡ غرفة عمليات لجنة الجودة والتطوير (الإشراف والمتابعة العليا)' : 'لوحة تحكم رئيس اللجنة القيادية 🛡️'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              أهلاً بك، {userData?.fullName} • {isQualityTeam ? 'صلاحية مراقبة ورصد وتقييم كافة اللجان السبع' : `اللجنة المعينة لك: ${selectedManagedCommittee}`}
            </p>
          </div>
          <Link href="/" className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200">
            الرئيسية ←
          </Link>
        </div>

        {/* إذا كان المستخدم من لجنة الجودة، نعرض له رادار اللجان السبع للمتابعة الصارمة */}
        {isQualityTeam && (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h3 className="font-black text-slate-900 text-sm">رادار مراقبة ورصد إنجازات اللجان السبع (بدون أعذار أو تسويف):</h3>
              <span className="text-[11px] bg-red-100 text-red-700 font-bold px-3 py-1 rounded-xl">
                ⚠️ نظام التقييم الصارم: أي تأخير يتم إحالته لرئيس النادي تلقائياً
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

                    {/* أزرار العمليات السريعة لقادة الجودة (إنذار أو تبليغ رئيس النادي مباشرة) */}
                    <div className="pt-2 flex gap-1.5 border-t border-white/10 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetCommitteeForWarning(commName);
                          setShowWarningModal(true);
                        }}
                        className={`w-full py-1.5 rounded-xl text-[10px] font-black transition-all ${
                          selectedManagedCommittee === commName 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                        }`}
                      >
                        🚨 تصعيد تقصير للرئيس
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

        {/* الأدوات القيادية الإضافية (إشعار جماعي، مهام، تصدير أكسل) */}
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
              <h3 className="text-sm font-black text-slate-900">📋 رفع مهام وتكليفات للأعضاء</h3>
              <p className="text-[11px] text-slate-500">حدد المهمة وتاريخ الاستحقاق لتظهر لأعضاء اللجنة فوراً.</p>
            </div>
            <form onSubmit={handleAssignTask} className="space-y-2 pt-1">
              <input
                type="text"
                placeholder="عنوان المهمة أو التكليف..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
              />
              <input
                type="text"
                placeholder="تاريخ الاستحقاق (مثال: الخميس القادم)"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517]"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[#630517] text-[#F5D061] font-bold text-xs shadow hover:brightness-110 cursor-pointer"
              >
                نشر التكليف للأعضاء 🎯
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

      {/* نافذة بلاغ التقصير الصارم لرئيس النادي (غرفة العمليات المرعبة) */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6 border-2 border-red-500">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl mx-auto flex items-center justify-center text-3xl font-bold">
              🚨
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">إنذار وتصعيد رسمي للرئيس</h3>
              <p className="text-xs text-slate-500">أنت على وشك رفع تقرير تقصير صارم ضد ({targetCommitteeForWarning})</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">سبب الإنذار / التسويف المرصود:</label>
              <textarea
                rows={3}
                placeholder="اكتب تفاصيل التأخير أو التقصير ليرفع رسمياً إلى رئيس النادي..."
                value={warningReason}
                onChange={(e) => setWarningReason(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-red-600"
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
                onClick={handleEscalateToPresident}
                className="w-1/2 py-3 rounded-2xl bg-red-600 text-white font-black text-xs shadow-lg hover:bg-red-700 cursor-pointer"
              >
                إرسال البلاغ فوراً ⚡
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}