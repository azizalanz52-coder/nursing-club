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
    <section className="py-20 bg-gradient-to-b from-slate-50 to-slate-100 border-t border-slate-200" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xl relative overflow-hidden">
          {/* زخرفة خلفية خفيفة */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#630517]/5 rounded-bl-full pointer-events-none" />

          <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase">
              صندوق الآراء والمقترحات 💡
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              صوتك يهمنا في تطوير نادي التمريض
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              لديك فكرة فعالية، مقترح لتطوير الأنشطة، أو ملاحظة؟ شاركنا بها وسنقوم بالاطلاع عليها مباشرة.
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center text-sm font-bold animate-in fade-in">
              تم إرسال مقترحك بنجاح! شكراً لحرصك على تميز النادي 🌟
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-slate-700">اسمك أو معرفك (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: ممرض مستقبلي / زائر"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#630517] bg-slate-50/50"
              />
            </div>

            <div className="space-y-1.5 text-right">
              <label className="text-xs font-bold text-slate-700">مقترحك أو ملاحظتك <span className="text-red-500">*</span></label>
              <textarea
                rows={4}
                required
                placeholder="اكتب فكرتك أو مقترحك هنا بتفصيل..."
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#630517] bg-slate-50/50 resize-none"
              />
            </div>

            <div className="text-center pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-10 py-3.5 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال المقترح 🚀'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </section>
  );
}