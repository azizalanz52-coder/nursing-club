'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const COMMITTEES = [
  'لجنة التصميم',
  'لجنة الإعلام',
  'لجنة العلاقات العامة',
  'لجنة المحتوى العلمي',
  'لجنة الجودة والتطوير',
  'لجنة الموارد البشرية',
  'لجنة تنظيم الفعاليات',
];

const ACADEMIC_LEVELS = [
  'المستوى الأول',
  'المستوى الثاني',
  'المستوى الثالث',
  'المستوى الرابع',
  'المستوى الخامس',
  'المستوى السادس',
  'المستوى السابع',
  'المستوى الثامن',
];

export default function JoinPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    universityId: '',
    academicLevel: 'المستوى الأول',
    phone: '',
    firstChoice: 'لجنة التصميم',
    secondChoice: 'لجنة الإعلام',
    thirdChoice: 'لجنة العلاقات العامة',
    portfolioUrl: '',
    experience: '',
  });

  const [isRegistrationClosed, setIsRegistrationClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // جلب حالة الإغلاق/الفتح سحابياً من لوحة الأدمن لتتزامن مع النافبار والزر
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const settingsRef = doc(db, 'site_settings', 'general');
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.isRegistrationClosed === 'boolean') {
            setIsRegistrationClosed(data.isRegistrationClosed);
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    checkSettings();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (
      formData.firstChoice === formData.secondChoice ||
      formData.firstChoice === formData.thirdChoice ||
      formData.secondChoice === formData.thirdChoice
    ) {
      setError('يرجى اختيار رغبات مختلفة للجان وعدم تكرار نفس اللجنة.');
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, 'applications'), {
        ...formData,
        status: 'معلق',
        submittedAt: new Date().toLocaleString('ar-SA'),
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      setFormData({
        fullName: '',
        universityId: '',
        academicLevel: 'المستوى الأول',
        phone: '',
        firstChoice: 'لجنة التصميم',
        secondChoice: 'لجنة الإعلام',
        thirdChoice: 'لجنة العلاقات العامة',
        portfolioUrl: '',
        experience: '',
      });
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('حدث خطأ أثناء إرسال الطلب، يرجى التأكد من الاتصال بالموقع والمحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  // إذا تم إغلاق النموذج من لوحة التحكم، تظهر صفحة القفل فوراً
  if (isRegistrationClosed) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-xl text-center space-y-6 border border-slate-200">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-inner">
            🔒
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">عذراً، نموذج الانضمام مغلق حالياً</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              تم إغلاق فترة استقبال طلبات الانضمام للجان نادي التمريض مؤقتاً من قبل الإدارة. ننتظركم في الفترات القادمة!
            </p>
          </div>
          <Link
            href="/"
            className="block w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-bold text-xs shadow hover:brightness-110 transition-all"
          >
            العودة للصفحة الرئيسية ←
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans text-black" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-300 shadow-md">
        
        <div className="text-center mb-8">
          <span className="text-xs font-black text-rose-950 bg-rose-100 px-3 py-1.5 rounded-full border border-rose-200 inline-block mb-2">
            الانضمام لنادي التمريض
          </span>
          <h1 className="text-3xl font-black text-black tracking-tight">
            نموذج التقديم للأنشطة واللجان
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            انضم إلى فريق العمل وساهم في تطوير أنشطة نادي التمريض بجامعة حفر الباطن
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-6 rounded-xl text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-200 text-emerald-900 rounded-full flex items-center justify-center mx-auto text-xl font-black">
              ✓
            </div>
            <h3 className="font-black text-lg text-emerald-950">تم إرسال طلبك بنجاح!</h3>
            <p className="text-sm font-semibold text-emerald-900">
              شكرًا لاهتمامك بالانضمام لنادي التمريض. سيتم مراجعة طلبك والتواصل معك قريبًا.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setSubmitted(false)}
                className="bg-emerald-700 text-white text-xs font-black px-5 py-2.5 rounded-xl hover:bg-emerald-800 transition-all shadow-sm cursor-pointer"
              >
                تقديم طلب آخر
              </button>
              <Link
                href="/check-status"
                className="bg-slate-800 text-white text-xs font-black px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-all shadow-sm"
              >
                استعلام عن القبول 🔍
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 text-black" autoComplete="off">
            
            {error && (
              <div className="bg-rose-100 text-rose-950 font-bold p-3.5 rounded-xl text-sm border border-rose-300 text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-black text-black mb-1.5">الاسم الرباعي</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="مثال: محمد بن أحمد العنزي"
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-black font-medium focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm placeholder:text-slate-400 bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-black mb-1.5">الرقم الجامعي</label>
                <input
                  type="text"
                  name="universityId"
                  required
                  value={formData.universityId}
                  onChange={handleChange}
                  placeholder="مثال: 2200001234"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-black font-medium focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm placeholder:text-slate-400 bg-white font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1.5">المستوى الدراسي</label>
                <select
                  name="academicLevel"
                  value={formData.academicLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-black focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm bg-white"
                >
                  {ACADEMIC_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div>
                <label className="block text-sm font-black text-black mb-1.5">رقم الجوال (واتساب)</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0500000000"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-black font-medium focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm placeholder:text-slate-400 bg-white font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="border-t border-b border-slate-200 py-4 space-y-4">
              <h3 className="text-base font-black text-black mb-2">تحديد الرغبات (حسب الأولوية)</h3>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">الرغبة الأولى (الأساسية)</label>
                <select
                  name="firstChoice"
                  value={formData.firstChoice}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-black focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm bg-white"
                >
                  {COMMITTEES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">الرغبة الثانية</label>
                <select
                  name="secondChoice"
                  value={formData.secondChoice}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-black focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm bg-white"
                >
                  {COMMITTEES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">الرغبة الثالثة</label>
                <select
                  name="thirdChoice"
                  value={formData.thirdChoice}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-black focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm bg-white"
                >
                  {COMMITTEES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-black text-black">
                  رابط معرض الأعمال / Portfolio <span className="text-xs font-normal text-slate-500">(اختياري)</span>
                </label>
              </div>
              <input
                type="url"
                name="portfolioUrl"
                value={formData.portfolioUrl}
                onChange={handleChange}
                placeholder="https://drive.google.com/... أو رابط Behance"
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-black font-medium focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm placeholder:text-slate-400 bg-white"
                dir="ltr"
              />
              <p className="mt-1 text-xs text-slate-500 font-medium">
                * يُفضل للمتقدمين للجان التصميم والإعلام إرفاق رابط يحتوي على نماذج الأعمال أو ملف PDF عبر Drive.
              </p>
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-1.5">نبذة عن خبراتك أو مهاراتك</label>
              <textarea
                name="experience"
                rows={4}
                value={formData.experience}
                onChange={handleChange}
                placeholder="اذكر أهم المهارات أو البرامج التي تجيدها..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-black font-medium focus:ring-2 focus:ring-rose-900 focus:outline-none text-sm placeholder:text-slate-400 bg-white"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-rose-900 hover:bg-rose-950 text-white font-black rounded-xl shadow-md transition-all text-sm disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'جاري إرسال الطلب...' : 'إرسال طلب الانضمام'}
            </button>

          </form>
        )}

      </div>
    </main>
  );
}