'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

export default function CommitteeLeaderDashboard() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [whatsappLink, setWhatsappLink] = useState('');

  const [selectedManagedCommittee, setSelectedManagedCommittee] = useState<string>('لجنة تنظيم الفعاليات');
  const [preferenceFilterTab, setPreferenceFilterTab] = useState<'pref-1' | 'pref-2' | 'pref-3'>('pref-1');

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

      // التوجيه الشامل للآدمن أو رئيس النادي بناءً على الصلاحيات الظاهرة في حسابك
      if (
        phone === '0553731265' || 
        uData.role === 'System Admin' || 
        uData.role === 'General Supervisor' || 
        uData.role === 'رئيس النادي' || 
        uData.role === 'رئيسة النادي' ||
        uData.fullName?.includes('محمد أحمد ناصر')
      ) {
        router.push('/admin');
        return;
      }

      if (uData.assignedCommittee) {
        setSelectedManagedCommittee(uData.assignedCommittee);
      } else if (uData.committee) {
        setSelectedManagedCommittee(uData.committee);
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

  // تصفية الطلبات بناءً على الرغبة المحددة بدقة (الأولى، الثانية، أو الثالثة) لمنع تداخل الأعداد
  const filteredRequests = (requests || []).filter(req => {
    const targetKey = preferenceFilterTab === 'pref-1' ? 'firstChoice' : preferenceFilterTab === 'pref-2' ? 'secondChoice' : 'thirdChoice';
    const choiceValue = req[targetKey] || '';
    
    return matchesTargetCommittee(choiceValue, selectedManagedCommittee) || req.acceptedCommittee === selectedManagedCommittee;
  });

  const handleAcceptSubmit = async () => {
    if (!selectedReqId) return;
    try {
      const docRef = doc(db, 'applications', selectedReqId);
      await updateDoc(docRef, {
        status: 'مقبول',
        acceptedCommittee: selectedManagedCommittee,
        whatsappLink: whatsappLink
      });

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600 bg-slate-50">جاري تحميل لوحة تحكم اللجنة...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">لوحة تحكم رئيس اللجنة المعين 🛡️</h1>
            <p className="text-xs text-slate-500 mt-1">
              أهلاً بك، {userData?.fullName} • اللجنة المعينة لك: <strong className="text-[#630517]">{selectedManagedCommittee}</strong>
            </p>
          </div>
          <Link href="/" className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200">
            الرئيسية ←
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">المتقدمين({selectedManagedCommittee})</h3>
              <p className="text-xs text-slate-500">اختر الرغبة لعرض المتقدمين بدقة دون تداخل الأرقام:</p>
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

      {showAcceptModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-3">تأكيد القبول في {selectedManagedCommittee}</h3>
            <div className="space-y-4">
              <p className="text-xs text-slate-600">سيتم قبول الطالب رسمياً في هذه اللجنة وربطه برابط قروب الواتساب الخاص بها.</p>
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
    </main>
  );
}