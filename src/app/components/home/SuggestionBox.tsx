'use client';

import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function SuggestionBox() {
  const [senderName, setSenderName] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;

    setIsSubmitting(true);
    try {
      const suggestionId = `sug_${Date.now()}`;
      await setDoc(doc(db, 'suggestions', suggestionId), {
        name: senderName.trim() || 'زائر كريم',
        content: suggestionText.trim(),
        createdAt: new Date().toISOString(),
        status: 'جديد'
      });

      setSenderName('');
      setSuggestionText('');
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 5000);
    } catch (err) {
      console.error('Error saving suggestion:', err);
      alert('حدث خطأ أثناء إرسال المقترح، يحاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-br from-[#36020A] via-[#630517] to-[#4A030F] border-t border-[#F5D061]/20 overflow-hidden" dir="rtl">
      
      {/* هالأت الإضاءة المتوهجة الخلفية */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#F5D061]/15 rounded-full blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[250px] h-[250px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* صندوق النموذج بتصميم زجاجي متطور وفاخر */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-[2.55rem] p-8 sm:p-14 border-2 border-[#F5D061]/40 shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          
          {/* إطار ليزري متوهج خفيف */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#F5D061] via-amber-300 to-[#630517] rounded-[2.6rem] blur-sm opacity-25 group-hover:opacity-50 transition duration-1000 pointer-events-none" />
          
          <div className="relative z-10">
            {/* زخرفة خلفية خفيفة */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#630517]/10 to-transparent rounded-bl-full pointer-events-none" />

            <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#630517]/10 border border-[#630517]/30 text-[#630517] text-xs font-black tracking-widest uppercase shadow-sm">
                <span>💡 صندوق الآراء والمقترحات</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                صوتك يهمنا في تطوير نادي التمريض
              </h2>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                لديك فكرة فعالية، مقترح لتطوير الأنشطة، أو ملاحظة؟ شاركنا بها وسنقوم بالاطلاع عليها مباشرة.
              </p>
            </div>

            {successMessage && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-800 text-center text-sm font-bold animate-in fade-in shadow-md">
                تم إرسال مقترحك بنجاح! شكراً لحرصك على تميز النادي 🌟
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-right">
                <label className="text-xs font-bold text-slate-700 block">اسمك أو معرفك (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: ممرض مستقبلي / زائر"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#630517] focus:ring-4 focus:ring-[#630517]/10 bg-slate-50 transition-all font-medium"
                />
              </div>

              <div className="space-y-2 text-right">
                <label className="text-xs font-bold text-slate-700 block">مقترحك أو ملاحظتك <span className="text-red-500">*</span></label>
                <textarea
                  rows={4}
                  required
                  placeholder="اكتب فكرتك أو مقترحك هنا بتفصيل..."
                  value={suggestionText}
                  onChange={(e) => setSuggestionText(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#630517] focus:ring-4 focus:ring-[#630517]/10 bg-slate-50 transition-all resize-none font-medium"
                />
              </div>

              <div className="text-center pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="relative group overflow-hidden w-full sm:w-auto px-12 py-4 rounded-2xl bg-gradient-to-r from-[#630517] via-[#850E24] to-[#630517] text-[#F5D061] font-black text-sm shadow-[0_10px_30px_rgba(99,5,23,0.4)] hover:shadow-[0_15px_40px_rgba(99,5,23,0.6)] hover:brightness-110 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 border border-[#F5D061]/30"
                >
                  <span className="absolute inset-0 w-full h-full bg-white/15 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال المقترح'}</span>
                    <span>🚀</span>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </section>
  );
}