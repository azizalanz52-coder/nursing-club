'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { db } from './../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface CertificateItem {
  id: string;
  studentName: string;
  phone: string;
  eventName: string;
  issueDate: string;
}

export default function CertificatesPortal() {
  const [phoneInput, setPhoneInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [userCertificates, setUserCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearchCertificates = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'club_certificates'), where('phone', '==', phoneInput.trim()));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CertificateItem[];
      setUserCertificates(list);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      
      {/* النافبار */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#630517] text-[#F5D061] flex items-center justify-center font-black text-lg shadow">
            UHB
          </span>
          <span className="font-black text-slate-900 text-sm">نادي كلية التمريض - جامعة حفر الباطن</span>
        </Link>
        <Link href="/" className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all">
          الرئيسية ←
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-10">
        
        <div className="text-center space-y-3">
          <span className="bg-amber-100 text-amber-900 font-bold text-xs px-4 py-1.5 rounded-full">
            بوابة الاعتماد الفخري 📜
          </span>
          <h1 className="text-3xl font-black text-slate-900">استعرض شهاداتك الفخرية والدورات</h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">أدخل رقم جوالك المسجل لتحميل شهاداتك المعتمدة من النادي فوراً بجودة عالية.</p>
        </div>

        <form onSubmit={handleSearchCertificates} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">رقم الجوال المسجل</label>
            <input
              type="text"
              placeholder="مثال: 0553731265"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-mono text-center font-bold text-slate-900 focus:outline-none focus:border-amber-600"
              dir="ltr"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-black text-xs shadow-lg hover:bg-amber-700 transition-all cursor-pointer"
          >
            {loading ? 'جاري البحث...' : 'بحث واستعراض الشهادات 🔍'}
          </button>
        </form>

        {searched && (
          <div className="space-y-8">
            {userCertificates.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-2">
                <p className="text-base font-bold text-slate-700">لا توجد شهادات مسجلة برقم الجوال ({phoneInput}).</p>
                <p className="text-xs text-slate-400">تأكد من إدخال الرقم الصحيح أو تواصل مع إدارة النادي لإصدار شهادتك.</p>
              </div>
            ) : (
              userCertificates.map((cert) => (
                <div key={cert.id} className="bg-gradient-to-br from-amber-50 via-white to-amber-50/50 p-8 sm:p-12 rounded-3xl border-4 border-amber-400 shadow-2xl relative overflow-hidden space-y-8 text-center">
                  
                  {/* زخرفة إطار الشهادة */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/30 rounded-bl-full pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-200/35 rounded-tr-full pointer-events-none"></div>

                  <div className="space-y-2 relative z-10">
                    <span className="w-16 h-16 rounded-2xl bg-amber-600 text-white mx-auto flex items-center justify-center text-3xl shadow-md">
                      🏆
                    </span>
                    <h2 className="text-lg font-black text-amber-900 tracking-wider">جامعة حفر الباطن - كلية التمريض</h2>
                    <p className="text-xs text-slate-500 font-semibold">نادي التمريض الطلابي | وحدة الاعتماد والأنشطة</p>
                  </div>

                  <div className="space-y-4 relative z-10 py-4 border-y border-amber-200/60">
                    <p className="text-xs text-slate-600 font-bold">تشهد إدارة نادي التمريض بأن المتألق /ـة:</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-[#630517] tracking-wide underline decoration-amber-400 decoration-2 underline-offset-8">
                      {cert.studentName}
                    </h3>
                    <p className="text-xs text-slate-600 font-bold">وذلك نظير مشاركته/ها الفعالة وإتمامه/ها بنجاح لـ:</p>
                    <h4 className="text-lg sm:text-xl font-black text-amber-900 bg-white/80 py-2 px-4 rounded-xl border border-amber-200 w-fit mx-auto shadow-inner">
                      {cert.eventName}
                    </h4>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 font-bold relative z-10 px-4">
                    <div>
                      <p>تاريخ الإصدار: <span className="font-mono text-slate-800">{cert.issueDate}</span></p>
                    </div>
                    <div>
                      <p className="font-black text-[#630517]">رئيس نادي التمريض</p>
                      <p className="text-[10px] text-slate-400">معتمد رسمياً سحابياً ✅</p>
                    </div>
                  </div>

                  <div className="pt-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-8 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow-xl hover:brightness-110 transition-all cursor-pointer"
                    >
                      📥 طباعة أو تحميل الشهادة PDF / صورة
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>
        )}

      </div>
    </main>
  );
}