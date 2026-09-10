'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';

interface CommitteeMember {
  name: string;
  role: string;
  status: string;
  phone?: string;
}

export default function CommitteeLeaderDashboard() {
  const router = useRouter();
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [whatsappLink, setWhatsappLink] = useState('');

  // اللجنة المحددة والمخصصة لهذا القائد (يتم جلبها من حسابه الذي عينته أنت له)
  const [selectedManagedCommittee, setSelectedManagedCommittee] = useState<string>('لجنة الاعلام');

  // Modal القبول
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

      // إذا كان المشرف الأساسي، نوجهه للوحة الشاملة الرئيسية
      if (phone === '0553731265' || uData.role === 'System Admin') {
        router.push('/admin');
        return;
      }

      // تحديد اللجنة المعينة له من قبلك تلقائياً بناءً على ملفه في قاعدة البيانات
      if (uData.assignedCommittee) {
        setSelectedManagedCommittee(uData.assignedCommittee);
      } else if (uData.committee) {
        setSelectedManagedCommittee(uData.committee);
      }

      // جلب طلبات الانضمام والأعضاء
      const reqSnap = await getDocs(collection(db, 'applications'));
      const allReqs = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(allReqs);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // دالة مطابقة دقيقة للجنة المعينة
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

  // تصفية الطلبات الخاصة باللجنة المعينة له حصرياً
  const filteredRequests = requests.filter(req => {
    const f1 = req.firstChoice || '';
    const f2 = req.secondChoice || '';
    const f3 = req.thirdChoice || '';
    
    return matchesTargetCommittee(f1, selectedManagedCommittee) || 
           matchesTargetCommittee(f2, selectedManagedCommittee) || 
           matchesTargetCommittee(f3, selectedManagedCommittee) ||
           req.acceptedCommittee === selectedManagedCommittee;
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

      setRequests(requests.map(r => r.id === selectedReqId ? { ...r, status: 'مقبول', acceptedCommittee: selectedManagedCommittee, whatsappLink } : r));
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
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'مرفوض' } : r));
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600">جاري تحميل لوحة تحكم اللجنة...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">لوحة تحكم رئيس اللجنة المعين 🛡️</h1>
            <p className="text-xs text-slate-500 mt-1">
              أهلاً بك، {userData?.fullName} ({userData?.role}) • اللجنة المعينة لك: <strong className="text-[#630517]">{selectedManagedCommittee}</strong>
            </p>
          </div>
          <Link href="/" className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200">
            الرئيسية ←
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-black text-slate-900">متقدمو وقبولو ({selectedManagedCommittee})</h3>
              <p className="text-xs text-slate-500">هنا تظهر لك الطلبات الموجهة إلى لجنتك التي عينك المشرف عليها لتدرسها وتقبلها.</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#630517]/10 text-[#630517] font-bold text-xs">
              النتائج المطابقة: {filteredRequests.length}
            </span>
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
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">لا توجد طلبات متقدمين مطابقة لـ "{selectedManagedCommittee}" حالياً.</td>
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
                      <td className="py-3 text-left pl-2 flex gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReqId(req.id);
                            setShowAcceptModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer text-xs"
                        >
                          قبول في اللجنة ✅
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

      {/* Modal Accept */}
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