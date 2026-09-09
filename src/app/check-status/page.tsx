'use client';

import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function CheckStatusPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      alert('الرجاء إدخال رقم الجوال.');
      return;
    }

    setLoading(true);
    setSearched(false);
    setResult(null);

    try {
      const q = query(collection(db, 'applications'), where('phone', '==', phone.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        setResult(docData);
      } else {
        setResult(null);
      }
      setSearched(true);
    } catch (err) {
      console.error('Error checking status:', err);
      alert('حدث خطأ أثناء البحث. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-slate-900">🔍 استعلام عن حالة القبول</h1>
          <p className="text-xs text-slate-500">أدخل رقم الجوال المسجل في طلب الانضمام لمعرفة حالتك ولجنتك فوراً</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">رقم الجوال</label>
              <input
                type="text"
                placeholder="05xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#630517] text-[#F5D061] font-black text-sm shadow hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'جاري البحث...' : 'استعلام الآن'}
            </button>
          </form>

          {searched && (
            <div className="pt-4 border-t border-slate-100">
              {result ? (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 text-center">
                  
                  {/* حالة القبول: مقبول */}
                  {result.status === 'مقبول' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-xl font-bold">
                        ✓
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{result.fullName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">الرقم الجامعي: {result.universityId || 'غير متوفر'}</p>
                      </div>

                      <div className="py-2 px-4 rounded-xl bg-white border border-slate-200/80 inline-block">
                        <span className="text-xs text-slate-500 font-bold">الحالة: </span>
                        <span className="text-xs font-black text-emerald-600">مقبول</span>
                      </div>

                      {result.acceptedCommittee && (
                        <div className="space-y-2 bg-[#630517]/5 p-4 rounded-xl border border-[#630517]/10">
                          <p className="text-xs font-bold text-[#630517]">مبروك! تم قبولك في:</p>
                          <p className="text-sm font-black text-slate-900">{result.acceptedCommittee}</p>
                          
                          {result.whatsappLink && (
                            <a
                              href={result.whatsappLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow hover:bg-emerald-700 transition-colors mt-2"
                            >
                              💬 الانضمام لقروب الواتساب الخاص باللجنة
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* حالة القبول: مرفوض */}
                  {result.status === 'مرفوض' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
                        ✕
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{result.fullName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">الرقم الجامعي: {result.universityId || 'غير متوفر'}</p>
                      </div>

                      <div className="py-2 px-4 rounded-xl bg-white border border-slate-200/80 inline-block">
                        <span className="text-xs text-slate-500 font-bold">الحالة: </span>
                        <span className="text-xs font-black text-red-600">مرفوض</span>
                      </div>

                      <div className="space-y-2 bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-xs font-bold text-red-800">عذراً، نأسف لإبلاغك بأنه لم يتم قبول طلبك في النادي لهذا العام. نتمنى لك التوفيق دائماً!</p>
                      </div>
                    </>
                  )}

                  {/* حالة القبول: معلق أو غير ذلك */}
                  {result.status !== 'مقبول' && result.status !== 'مرفوض' && (
                    <>
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl font-bold">
                        ⏳
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base">{result.fullName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">الرقم الجامعي: {result.universityId || 'غير متوفر'}</p>
                      </div>

                      <div className="py-2 px-4 rounded-xl bg-white border border-slate-200/80 inline-block">
                        <span className="text-xs text-slate-500 font-bold">الحالة: </span>
                        <span className="text-xs font-black text-amber-600">قيد المراجعة (معلق)</span>
                      </div>

                      <p className="text-xs text-slate-500">طلبك قيد الدراسة من قِبل لجان القبول، تابعنا باستمرار!</p>
                    </>
                  )}

                </div>
              ) : (
                <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-center text-xs font-bold border border-red-100">
                  لم يتم العثور على أي طلب مسجل بهذا الرقم. تأكد من صحة الرقم المُدخل.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}