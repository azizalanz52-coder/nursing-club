'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// مصفوفة إصدارات أسبوعية تتجدد تلقائياً أو يتم التبديل بينها تفاعلياً
const newsletterEditions = [
  {
    weekNum: "الإصدار رقم #15",
    theme: "الذكاء الاصطناعي ومستقبل الرعاية الحرجة",
    dateRange: "أكتوبر 2026",
    worldNews: [
      {
        tag: "تكنولوجيا الرعاية السريرية",
        title: "أنظمة الإنذار الذكية تخفض معدلات الأخطاء الطبية بنسبة 34%",
        desc: "أبرزت دراسة حديثة نشرت في المجلات الطبية العالمية دور تقنيات المراقبة الذكية بالذكاء الاصطناعي في توقع التدهور السريع لحالة المرضى بالعناية المركزة قبل وقوعه."
      },
      {
        tag: "التمريض العالمي",
        title: "منظمة الصحة العالمية تطلق معايير جديدة للقيادة التمريضية بالمستشفيات",
        desc: "تركيز عالمي مكثف على تمكين الكوادر التمريضية الشابة من تولي لجان اتخاذ القرار السريري وإدارة المخاطر الطارئة."
      }
    ],
    sleGuide: {
      title: "أسرار اجتياز اختبار الهيئة السعودية (SLE) من المحاولة الأولى",
      tips: [
        "التركيز على بنوك الأسئلة المعتمدة مثل Saunders و Mosby لفهم نمط الأسئلة السريرية.",
        "إتقان حساب الجرعات الدوائية (Drug Calculations) ومعادلات السوائل الوريدية.",
        "فهم أولويات الرعاية التمريضية (ABCDE framework) وحالات الطوارئ."
      ],
      sources: ["Saunders Comprehensive Review", "Mosby's NCLEX-RN", "تجميعات أسئلة هيئة التخصصات الصحية السعودية"]
    },
    clinicalBasics: [
      { title: "التقييم الأولي (Primary Assessment)", desc: "فحص المجرى الهوائي (Airway)، التنفس (Breathing)، الدورة الدموية (Circulation)، والوعي (Disability)." },
      { title: "حقوق إعطاء الأدوية السستة (6 Rights)", desc: "المريض الصحيح، الدواء الصحيح، الجرعة الصحيحة، الوقت الصحيح، طريق الإعطاء الصحيح، والتوثيق الصحيح." },
      { title: "مكافحة العدوى والوقاية", desc: "تطبيق غسل اليدين القياسي واستخدام معدات الوقاية الشخصية (PPE) لضمان بيئة آمنة." }
    ]
  },
  {
    weekNum: "الإصدار رقم #16",
    theme: "إدارة الأزمات والطوارئ في أقسام التمريض",
    dateRange: "أكتوبر 2026",
    worldNews: [
      {
        tag: "تطوير طوارئ",
        title: "بروتوكولات جديدة للتعامل مع السكتات الدماغية الحادة بالميدان",
        desc: "اعتماد مسارات سريعة لفرق التمريض لتقييم السكتة الدماغية خلال أول 10 دقائق من وصول المريض للمستشفى."
      },
      {
        tag: "صحة نفسية",
        title: "دعم الاحتراق الوظيفي للكوادر التمريضية: استراتيجيات عالمية حديثة",
        desc: "تفعيل برامج مرنة لتقليل ضغوط العمل وتحسين البيئة النفسية والمؤسسية للممرضين."
      }
    ],
    sleGuide: {
      title: "أهم مواضيع اختبار الهيئة في قسم الباطنة والجراحة (Medical-Surgical)",
      tips: [
        "التركيز على أمراض القلب الشهيرة (MI, Heart Failure) وعلاماتها التمريضية.",
        "مراقبة مرضى السكري وعلامات نقص أو فرط السكر الحاد (DKA & HHS).",
        "العناية بمرضى العمليات الجراحية ومتابعة مضاعفات الجروح ونزيف ما بعد الجراحة."
      ],
      sources: ["Brunner & Suddarth's Textbook of Medical-Surgical Nursing", "Lippincott Nursing Procedures"]
    },
    clinicalBasics: [
      { title: "تقييم الألم (Pain Assessment)", desc: "اعتبار الألم العلامة الحيوية الخامسة واستخدام مقياس الألم الرقمي (0-10) بدقة." },
      { title: "العناية بالقسطرة البولية (Catheter Care)", desc: "منع الالتهابات المرتبطة بالقسطرة (CAUTI) عبر النظافة المستمرة والحفاظ على الكيس أسفل المثانة." },
      { title: "منع تقرحات الفراش (Pressure Injuries)", desc: "تغيير وضعية المريض كل ساعتين واستخدام المراتب الطبية المخففة للضغط." }
    ]
  }
];

export default function NewsletterPage() {
  const [currentEditionIndex, setCurrentEditionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 6, hours: 23, minutes: 59, seconds: 59 });

  // عداد تنازلي تفاعلي لإعطاء حماس للزوار
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { days: 6, hours: 23, minutes: 59, seconds: 59 }; // إعادة ضبط كل أسبوع
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeEdition = newsletterEditions[currentEditionIndex];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 pb-20" dir="rtl">
      
      {/* ترويسة النشرة التفاعلية الفخمة */}
      <div className="bg-gradient-to-br from-[#36020A] via-[#630517] to-[#4A030F] text-white py-16 px-4 text-center space-y-6 shadow-2xl relative overflow-hidden border-b-4 border-[#F5D061]">
        <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#F5D061]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#F5D061] text-[#630517] px-5 py-2 rounded-full font-black text-xs shadow-lg uppercase tracking-wider">
            <span>⚡ النشرة الأسبوعية المتجددة</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
          </div>

          <h1 className="text-3xl sm:text-6xl font-black tracking-tight font-serif">
            نبض التمريض الإكلينيكي
          </h1>
          <p className="text-amber-50/90 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            منصتك التفاعلية المتكاملة: أحدث أخبار التمريض العالمية، أسرار اجتياز اختبار الهيئة السعودية (SLE)، وأحدث المقالات والأسس التمريضية.
          </p>

          {/* عداد تجديد النشرة والتبديل بين الإصدارات */}
          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4 flex-wrap">
            <div className="bg-black/30 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-xs text-amber-200 font-bold flex items-center gap-3">
              <span>⏳ التحديث القادم للإصدار خلال:</span>
              <span className="font-mono text-white bg-[#630517] px-3 py-1 rounded-xl">
                {timeLeft.days} أيام : {timeLeft.hours} س : {timeLeft.minutes} د : {timeLeft.seconds} ث
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCurrentEditionIndex(prev => (prev === 0 ? 1 : 0))}
              className="px-6 py-3 rounded-2xl bg-[#F5D061] text-[#630517] font-black text-xs shadow-lg hover:scale-105 transition-all cursor-pointer"
            >
              🔄 تبديل الإصدار الأسبوعي ({activeEdition.weekNum})
            </button>
          </div>

          <div className="pt-2">
            <Link href="/" className="text-xs text-[#F5D061] underline font-bold inline-block">
              ← العودة لصفحة النادي الرئيسية
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        
        {/* شارة الإصدار الحالي */}
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 bg-[#630517] text-[#F5D061] rounded-2xl flex items-center justify-center font-black text-xl shadow">
              📌
            </span>
            <div>
              <span className="text-[10px] text-[#630517] font-extrabold bg-[#630517]/10 px-3 py-0.5 rounded-full">{activeEdition.weekNum}</span>
              <h3 className="text-xl font-black text-slate-900 mt-1">{activeEdition.theme}</h3>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-xl">
            📅 فترة الإصدار: {activeEdition.dateRange}
          </span>
        </div>

        {/* القسم الأول: أخبار التمريض العالمية والمحلية */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#630517]/10 text-[#630517] flex items-center justify-center text-2xl font-bold">🌍</span>
            <div>
              <h2 className="text-2xl font-black text-slate-900">أخبار التمريض حول العالم</h2>
              <p className="text-xs text-slate-500">أحدث المستجدات والابتكارات في قطاع الرعاية الصحية والتمريض العالمي.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {activeEdition.worldNews.map((news, idx) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 hover:border-[#630517]/50 transition-all">
                <span className="text-[10px] bg-[#630517] text-[#F5D061] px-3 py-1 rounded-full font-bold">{news.tag}</span>
                <h3 className="font-extrabold text-slate-900 text-base">{news.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {news.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* القسم الثاني: دليل اختبار الهيئة السعودية (SLE) */}
        <div className="bg-gradient-to-br from-slate-900 via-[#36020A] to-slate-950 text-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#F5D061] text-[#630517] flex items-center justify-center text-2xl font-bold">🎯</span>
            <div>
              <h2 className="text-2xl font-black text-white">{activeEdition.sleGuide.title}</h2>
              <p className="text-xs text-white/70">استراتيجيات مجربة، مصادر معتمدة، وأهم أسرار التفوق بالاختبار.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 space-y-3">
              <h3 className="font-black text-[#F5D061] text-sm">💡 استراتيجيات التفوق والأسرار:</h3>
              <ul className="space-y-2 text-white/90 list-disc list-inside">
                {activeEdition.sleGuide.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 space-y-3">
              <h3 className="font-black text-[#F5D061] text-sm">📚 المراجع والمصادر الموصى بها:</h3>
              <ul className="space-y-2 text-white/90 list-disc list-inside">
                {activeEdition.sleGuide.sources.map((src, i) => (
                  <li key={i}><strong>{src}</strong></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* القسم الثالث: أسس ومعايير التمريض الحديث */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#630517]/10 text-[#630517] flex items-center justify-center text-2xl font-bold">🩺</span>
            <div>
              <h2 className="text-2xl font-black text-slate-900">الركائز والأسس التمريضية لهذا الأسبوع</h2>
              <p className="text-xs text-slate-500">معايير ممارسة مهنة التمريض المبنية على الأدلة والبراهين السريرية.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-xs">
            {activeEdition.clinicalBasics.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-2 hover:shadow-md transition-all">
                <h4 className="font-extrabold text-[#630517] text-sm">{item.title}</h4>
                <p className="text-slate-600 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}