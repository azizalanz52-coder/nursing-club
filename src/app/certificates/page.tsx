'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { db } from './../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface CertificateItem {
  id: string;
  recipientName: string;
  phone: string;
  password?: string;
  certTitle: string;
  category: string;
  image: string;
  issueDate: string;
  description: string;
}

export default function CertificatesPortal() {
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [userCertificates, setUserCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearchCertificates = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setLoading(true);
    try {
      // البحث في مجموعة site_certificates المعتمدة في لوحة التحكم
      const q = query(collection(db, 'site_certificates'), where('phone', '==', phoneInput.trim()));
      const snap = await getDocs(q);
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CertificateItem[];

      // التحقق من كلمة المرور إذا كانت مسجلة للشهادة
      if (passwordInput.trim()) {
        list = list.filter(c => !c.password || c.password === passwordInput.trim());
      }

      setUserCertificates(list);
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = (cert: CertificateItem) => {
    // استخدام الطباعة النظامية للمتصفح لحفظ الشهادة بدعم كامل 100% للغة العربية وبدون أي رموز
    window.print();
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      
      {/* النافبار */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-sm print:hidden">
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
        
        <div className="text-center space-y-3 print:hidden">
          <span className="bg-amber-100 text-amber-900 font-bold text-xs px-4 py-1.5 rounded-full">
            بوابة الاعتماد الفخري 📜
          </span>
          <h1 className="text-3xl font-black text-slate-900">استعرض جميع شهاداتك الفخرية والدورات</h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">أدخل رقم جوالك المسجل وكلمة المرور لاستعراض وتحميل كافة شهاداتك المعتمدة من النادي فوراً.</p>
        </div>

        <form onSubmit={handleSearchCertificates} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4 print:hidden">
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
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">كلمة المرور</label>
            <input
              type="password"
              placeholder="كلمة المرور الخاصة بك..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-center font-bold text-slate-900 focus:outline-none focus:border-amber-600"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-black text-xs shadow-lg hover:bg-amber-700 transition-all cursor-pointer"
          >
            {loading ? 'جاري البحث...' : 'بحث واستعراض جميع الشهادات 🔍'}
          </button>
        </form>

        {searched && (
          <div className="space-y-8">
            {userCertificates.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-2 print:hidden">
                <p className="text-base font-bold text-slate-700">لا توجد شهادات مسجلة برقم الجوال ({phoneInput}) أو كلمة المرور غير صحيحة.</p>
                <p className="text-xs text-slate-400">تأكد من إدخال البيانات الصحيحة أو تواصل مع إدارة النادي لإصدار شهادتك.</p>
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
                    <p className="text-xs text-slate-600 font-bold">تشهد إدارة نادي التمريض بأن المكرم /ـة:</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-[#630517] tracking-wide underline decoration-amber-400 decoration-2 underline-offset-8">
                      {cert.recipientName}
                    </h3>
                    <p className="text-xs text-slate-600 font-bold">وذلك نظير مشاركته/ها الفعالة وإتمامه/ها بنجاح لـ:</p>
                    <h4 className="text-lg sm:text-xl font-black text-amber-900 bg-white/80 py-2 px-4 rounded-xl border border-amber-200 w-fit mx-auto shadow-inner">
                      {cert.certTitle}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
                      {cert.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 font-bold relative z-10 px-4">
                    <div>
                      <p>تاريخ الإصدار: <span className="font-mono text-slate-800">{new Date(cert.issueDate).toLocaleDateString('ar-SA')}</span></p>
                    </div>
                    <div>
                      <p className="font-black text-[#630517]">رئيس نادي التمريض</p>
                      <p className="text-[10px] text-slate-400">معتمد رسمياً سحابياً ✅</p>
                    </div>
                  </div>

                  {cert.image && (
                    <div className="relative z-10 pt-4 border-t border-amber-200">
                      <p className="text-xs font-bold text-slate-700 mb-2">تصميم الشهادة المعتمد:</p>
                      <img 
                        src={cert.image} 
                        alt="Certificate" 
                        className="max-h-96 mx-auto rounded-2xl shadow-md border border-amber-300 object-contain"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex justify-center gap-4 relative z-10 flex-wrap print:hidden">
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(cert)}
                      className="px-8 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow-xl hover:brightness-110 transition-all cursor-pointer"
                    >
                      🖨️ طباعة أو حفظ الشهادة PDF رسمي
                    </button>
                    {cert.image && (
                      <a
                        href={cert.image}
                        download="certificate-image.jpg"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 rounded-xl bg-amber-600 text-white font-black text-xs shadow hover:bg-amber-700 transition-all"
                      >
                        🖼️ عرض وتحميل صورة الشهادة
                      </a>
                    )}
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