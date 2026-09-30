'use client';

import React from 'react';
import Link from 'next/link';

export default function NewsletterPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 pb-20" dir="rtl">
      
      {/* ترويسة النشرة */}
      <div className="bg-gradient-to-r from-[#630517] to-[#80071D] text-white py-16 px-4 text-center space-y-4 shadow-xl">
        <span className="inline-block px-4 py-1.5 rounded-full bg-[#F5D061] text-[#630517] text-xs font-black uppercase tracking-wider">
          📖 الإصدار الأسبوعي الشامل
        </span>
        <h1 className="text-3xl sm:text-5xl font-black">النشرة الأسبوعية لنادي التمريض</h1>
        <p className="text-white/90 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
          مرجعك المتكامل: أحدث أخبار التمريض العالمية والمحلية، مقالات ومقومات مهنة التمريض، ودليل مذاكرة اختبار الهيئة السعودية (SLE).
        </p>
        <div className="pt-2">
          <Link href="/" className="text-xs text-[#F5D061] underline font-bold">
            ← العودة للرئيسية
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        
        {/* القسم الأول: أخبار التمريض العالمية والمحلية */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#630517]/10 text-[#630517] flex items-center justify-center text-2xl font-bold">🌍</span>
            <div>
              <h2 className="text-2xl font-black text-slate-900">أخبار التمريض حول العالم</h2>
              <p className="text-xs text-slate-500">أحدث المستجدات والتوجهات العالمية في قطاع الرعاية الصحية والتمريض.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] bg-[#630517] text-[#F5D061] px-3 py-1 rounded-full font-bold">تكنولوجيا الرعاية</span>
              <h3 className="font-extrabold text-slate-900 text-base">دور الذكاء الاصطناعي في دعم التمريض السريري</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                تتجه المستشفيات الكبرى عالمياً لدمج الأنظمة الذكية لمتابعة المؤشرات الحيوية للمرضى، مما يقلل الأخطاء الطبية ويسرع التدخلات التمريضية الحرجة.
              </p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[10px] bg-[#630517] text-[#F5D061] px-3 py-1 rounded-full font-bold">تطوير مهني</span>
              <h3 className="font-extrabold text-slate-900 text-base">البرنامج العالمي الجديد للقيادات التمريضية الشابة</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                إطلاق مبادرات عالمية لتمكين الممرضين والممرضات حديثي التخرج من تولي مناصب قيادية في إدارة الأقسام والسياسات الصحية.
              </p>
            </div>
          </div>
        </div>

        {/* القسم الثاني: فوائد اختبار الهيئة السعودية (SLE) ومصادر مذاكرته */}
        <div className="bg-gradient-to-br from-slate-900 to-[#36020A] text-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#F5D061] text-[#630517] flex items-center justify-center text-2xl font-bold">🎯</span>
            <div>
              <h2 className="text-2xl font-black text-white">دليل اختبار الهيئة السعودية (SLE)</h2>
              <p className="text-xs text-white/70">كل ما تحتاج معرفته عن فوائد الاختبار، مصادر المذاكرة المعتمدة، وأهم النصائح.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 space-y-3">
              <h3 className="font-black text-[#F5D061] text-sm">💡 فوائد اجتياز اختبار الهيئة (SLE):</h3>
              <ul className="space-y-2 text-white/90 list-disc list-inside">
                <li>الحصول على ترخيص مزاولة المهنة الرسمي والمعتمد في المملكة.</li>
                <li>تأكيد الكفاءة الإكلينيكية والقدرة على التعامل مع الحالات الحرجة.</li>
                <li>فتح آفاق التوظيف الواسع في القطاعين الحكومي والخاص.</li>
                <li>فرصة القبول المباشر في برامج التخصصات العليا والدراسات العليا.</li>
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 space-y-3">
              <h3 className="font-black text-[#F5D061] text-sm">📚 مصادر المذاكرة الموصى بها:</h3>
              <ul className="space-y-2 text-white/90 list-disc list-inside">
                <li><strong>Saunders Comprehensive Review:</strong> المرجع الأقوى والأشمل لأساسيات التمريض.</li>
                <li><strong>Mosby's Review for the NCLEX-RN:</strong> بنك أسئلة وتدريبات عملية ممتازة.</li>
                <li><strong>ملخصات نادي التمريض UHB:</strong> تجميعات أسئلة السنوات السابقة وأهم الحالات الإكلينيكية.</li>
                <li><strong>منصات البودكاست والمراجعات السريعة:</strong> للمراجعة السمعية أثناء التنقل.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* القسم الثالث: أهم المعلومات والأسس للتمريض */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#630517]/10 text-[#630517] flex items-center justify-center text-2xl font-bold">🩺</span>
            <div>
              <h2 className="text-2xl font-black text-slate-900">أسس ومعايير التمريض الحديث</h2>
              <p className="text-xs text-slate-500">الركائز الأساسية التي تضمن تقديم رعاية صحية عالية الجودة وآمنة للمرضى.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-xs">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-extrabold text-[#630517] text-sm">1. عملية التمريض (Nursing Process)</h4>
              <p className="text-slate-600">التقييم (Assessment)، التشخيص (Diagnosis)، التخطيط (Planning)، التنفيذ (Implementation)، والتقييم (Evaluation).</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-extrabold text-[#630517] text-sm">2. سلامة المريض أولاً (Patient Safety)</h4>
              <p className="text-slate-600">تطبيق معايير مكافحة العدوى، إعطاء الأدوية ببروتوكول الحقوق الستة، والوقاية من السقوط.</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <h4 className="font-extrabold text-[#630517] text-sm">3. الأخلاقيات المهنية (Ethics)</h4>
              <p className="text-slate-600">حفظ سرية المريض، احترام استقلاليته في اتخاذ القرار، والإنسانية العالية في التعامل.</p>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}