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

      // لو كان المشرف الأساسي، نوجهه للوحة الشاملة الرئيسية
      if (phone === '0553731265' || uData.role === 'System Admin') {
        router.push('/admin');
        return;
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-600">جاري تحميل لوحة تحكم اللجنة...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-10" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">لوحة تحكم رئيس اللجنة 🛡️</h1>
            <p className="text-xs text-slate-500 mt-1">أهلاً بك، {userData?.fullName} ({userData?.role})</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200">
            الرئيسية ←
          </Link>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-black text-slate-900">طلبات المتقدمين الذين اختاروا لجان الكلية</h3>
          <p className="text-xs text-slate-500">هنا يمكنك متابعة المتقدمين الذين لديهم اهتمام بلجان النادي وقبولهم.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="pb-3 pr-2">اسم المتقدم</th>
                  <th className="pb-3">الرقم الجامعي</th>
                  <th className="pb-3">الرغبات</th>
                  <th className="pb-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-2 font-bold text-slate-900">{req.fullName} <div className="text-[10px] text-slate-400">{req.phone}</div></td>
                    <td className="py-3 text-slate-600 font-mono">{req.universityId || '-'}</td>
                    <td className="py-3 text-slate-600 text-[11px]">
                      <p>1: {req.firstChoice}</p>
                      <p>2: {req.secondChoice}</p>
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${req.status === 'مقبول' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {req.status || 'معلق'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}