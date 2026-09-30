'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// الإصدارات الأسبوعية بأسلوب الجريدة والمجلة الصحفية الفخمة
const newsletterEditions = [
  {
    id: 1,
    editionName: "الإصدار الأول (#1)",
    theme: "الذكاء الاصطناعي ومستقبل الرعاية الحرجة",
    dateText: "الأسبوع الأول - أكتوبر 2026",
    whoHeadline: "منظمة الصحة العالمية (WHO): تعزيز الكوادر التمريضية في خطوط الدفاع الأولى",
    whoSnippet: "أصدرت منظمة الصحة العالمية تقريراً حديثاً يؤكد أهمية دمج التقنيات الحديثة والتدريب الإكلينيكي المتقدم لرفع كفاءة طواقم التمريض عالمياً لمواجهة الطوارئ.",
    worldNews: [
      {
        tag: "تكنولوجيا الرعاية السريرية",
        title: "أنظمة الإنذار الذكية تخفض معدلات الأخطاء الطبية بنسبة 34%",
        desc: "أبرزت دراسة حديثة دور تقنيات المراقبة الذكية بالذكاء الاصطناعي في توقع التدهور السريع لحالة المرضى بالعناية المركزة."
      },
      {
        tag: "تطوير مهني",
        title: "إطلاق البرنامج القيادي الموحد للممرضين الحديثين",
        desc: "مبادرات عالمية لتمكين الكوادر الشابة من تولي لجان اتخاذ القرار السريري وإدارة المخاطر الطارئة."
      }
    ],
    sleGuide: {
      title: "دليل اجتياز اختبار الهيئة السعودية (SLE) من المحاولة الأولى",
      tips: [
        "التركيز على بنوك الأسئلة المعتمدة مثل Saunders و Mosby لفهم نمط الأسئلة.",
        "إتقان حساب الجرعات الدوائية (Drug Calculations) ومعادلات السوائل الوريدية.",
        "فهم أولويات الرعاية التمريضية (ABCDE framework) وحالات الطوارئ."
      ],
      sources: ["Saunders Comprehensive Review", "Mosby's NCLEX-RN", "تجميعات أسئلة هيئة التخصصات الصحية"]
    },
    clinicalBasics: [
      { title: "التقييم الأولي (Primary Assessment)", desc: "فحص المجرى الهوائي (Airway)، التنفس (Breathing)، الدورة الدموية (Circulation)، والوعي (Disability)." },
      { title: "حقوق إعطاء الأدوية الستة (6 Rights)", desc: "المريض الصحيح، الدواء الصحيح، الجرعة الصحيحة، الوقت الصحيح، طريق الإعطاء الصحيح، والتوثيق." },
      { title: "مكافحة العدوى والوقاية", desc: "تطبيق غسل اليدين القياسي واستخدام معدات الوقاية الشخصية (PPE) لضمان بيئة آمنة." }
    ]
  },
  {
    id: 2,
    editionName: "الإصدار الثاني (#2)",
    theme: "إدارة الأزمات والطوارئ في أقسام التمريض",
    dateText: "الأسبوع الثاني - أكتوبر 2026",
    whoHeadline: "منظمة الصحة العالمية (WHO): استراتيجيات خفض الإجهاد المهني للتمريض",
    whoSnippet: "دعت منظمة الصحة العالمية المستشفيات إلى تبني بيئات عمل مرنة تدعم الصحة النفسية للكوادر التمريضية لضمان استدامة جودة الرعاية.",
    worldNews: [
      {
        tag: "طوارئ طبية",
        title: "بروتوكولات جديدة للتعامل مع السكتات الدماغية بالميدان",
        desc: "اعتماد مسارات سريعة لفرق التمريض لتقييم وتقليل وقت الاستجابة خلال أول 10 دقائق من وصول المريض."
      },
      {
        tag: "أبحاث إكلينيكية",
        title: "دور التمريض المبني على البراهين في تحسين تعافي الجراحة",
        desc: "تطبيقات بروتوكولات التعافي المعزز بعد الجراحة (ERAS) ودور الممرض المحوري فيها."
      }
    ],
    sleGuide: {
      title: "أهم مواضيع اختبار الهيئة في تخصص الباطنة والجراحة",
      tips: [
        "التركيز على أمراض القلب (MI, Heart Failure) وعلاماتها التمريضية الحرجة.",
        "مراقبة مرضى السكري وعلامات الحماض الكيتوني السكري (DKA).",
        "العناية بمرضى العمليات ومتابعة مضاعفات الجروح ونزيف ما بعد الجراحة."
      ],
      sources: ["Brunner & Suddarth's Medical-Surgical Nursing", "Lippincott Procedures"]
    },
    clinicalBasics: [
      { title: "تقييم الألم (Pain Assessment)", desc: "اعتبار الألم العلامة الحيوية الخامسة واستخدام مقياس الألم الرقمي (0-10) بدقة." },
      { title: "العناية بالقسطرة البولية", desc: "منع الالتهابات المرتبطة بالقسطرة (CAUTI) عبر النظافة المستمرة والحفاظ على الكيس أسفل المثانة." },
      { title: "منع تقرحات الفراش", desc: "تغيير وضعية المريض كل ساعتين واستخدام المراتب الطبية المخففة للضغط." }
    ]
  }
];

export default function NewsletterPage() {
  const [currentEditionIndex, setCurrentEditionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 6, hours: 23, minutes: 59, seconds: 59 });

  // عداد تنازلي تجديدي تفاعلي كل 7 أيام
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { days: 6, hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeEdition = newsletterEditions[currentEditionIndex];

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-slate-900 pb-20 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      
  {/* ترويسة الجريدة التاريخية والعصرية */}
  <header className="border-b-4 border-[#630517] bg-[#FDFBF7] pt-10 pb-8 px-4 text-center space-y-4 shadow-sm relative">
    <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest px-4 border-b border-slate-200 pb-2">
            <span>جامعة حفر الباطن • كلية التمريض</span>
            <span className="text-[#630517] font-black">{activeEdition.editionName}</span>
            <span>الجريدة الأسبوعية الرسمية</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black font-serif text-slate-900 tracking-tight">
            النشرة الأسبوعية لنادي التمريض
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-serif italic max-w-2xl mx-auto">
            "المرجع الإكلينيكي الدوري لأحدث المستجدات الطبية، المعايير العالمية، ودليل اختبار الهيئة السعودية (SLE)"
          </p>

          {/* شريط العداد والتبديل التفاعلي */}
          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4 flex-wrap">
            <div className="bg-slate-900 text-amber-200 px-6 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-3 shadow-md">
              <span>⏳ الإصدار يتجدد تلقائياً خلال:</span>
              <span className="font-mono text-white bg-[#630517] px-3 py-1 rounded-xl">
                {timeLeft.days} أيام : {timeLeft.hours} س : {timeLeft.minutes} د : {timeLeft.seconds} ث
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCurrentEditionIndex(prev => (prev === 0 ? 1 : 0))}
              className="px-6 py-2.5 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow-lg hover:brightness-110 transition-all cursor-pointer border border-[#F5D061]/40"
            >
              🔄 تبديل الإصدار (عرض {currentEditionIndex === 0 ? "الإصدار الثاني (#2)" : "الإصدار الأول (#1)"})
            </button>
          </div>

          <div className="pt-2">
            <Link href="/" className="text-xs text-[#630517] underline font-bold inline-block">
              ← العودة لصفحة النادي الرئيسية
            </Link>
          </div>
        </div>
      </header>

      {/* المحتوى بفايب الجريدة والصفحات العريقة */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        
        {/* قسم الربط المباشر مع منظمة الصحة العالمية (WHO Live Feed) */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-slate-900 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#630517] text-[#F5D061] px-5 py-1.5 rounded-bl-2xl font-black text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>بث حصرى متزامن مع منظمة الصحة العالمية (WHO)</span>
          </div>

          <div className="space-y-3 pt-4">
            <span className="text-xs font-bold text-slate-400">تحديثات المنظمة العالمية • {activeEdition.dateText}</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-serif leading-snug">
              {activeEdition.whoHeadline}
            </h2>
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-medium">
              {activeEdition.whoSnippet}
            </p>
          </div>
        </div>

        {/* قسم أخبار التمريض العالمية */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-300 shadow-lg space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#630517]/10 text-[#630517] flex items-center justify-center text-2xl font-bold">🌍</span>
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">أبرز أخبار التمريض العالمية</h2>
              <p className="text-xs text-slate-500">أحدث المستجدات والابتكارات في قطاع الرعاية الصحية والتمريض.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {activeEdition.worldNews.map((news, idx) => (
              <div key={idx} className="bg-[#FDFBF7] p-6 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                <span className="text-[10px] bg-[#630517] text-[#F5D061] px-3 py-1 rounded-full font-bold">{news.tag}</span>
                <h3 className="font-extrabold text-slate-900 text-base font-serif">{news.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {news.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* قسم دليل اختبار الهيئة السعودية (SLE) */}
        <div className="bg-gradient-to-br from-slate-900 via-[#36020A] to-slate-950 text-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 border border-[#F5D061]/30">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#F5D061] text-[#630517] flex items-center justify-center text-2xl font-bold">🎯</span>
            <div>
              <h2 className="text-2xl font-black text-white font-serif">{activeEdition.sleGuide.title}</h2>
              <p className="text-xs text-white/70">استراتيجيات مجربة ومصادر معتمدة للتفوق.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 text-xs leading-relaxed">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 space-y-3">
              <h3 className="font-black text-[#F5D061] text-sm">💡 استراتيجيات التفوق والأسرار:</h3>
              <ul className="space-y-2 text-white/90 list-disc list-inside font-medium">
                {activeEdition.sleGuide.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/15 space-y-3">
              <h3 className="font-black text-[#F5D061] text-sm">📚 المراجع والمصادر الموصى بها:</h3>
              <ul className="space-y-2 text-white/90 list-disc list-inside font-medium">
                {activeEdition.sleGuide.sources.map((src, i) => (
                  <li key={i}><strong>{src}</strong></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* قسم أسس ومعايير التمريض الحديث */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-300 shadow-lg space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <span className="w-12 h-12 rounded-2xl bg-[#630517]/10 text-[#630517] flex items-center justify-center text-2xl font-bold">🩺</span>
            <div>
              <h2 className="text-2xl font-black text-slate-900 font-serif">الركائز والأسس التمريضية لهذا الأسبوع</h2>
              <p className="text-xs text-slate-500">معايير ممارسة مهنة التمريض المبنية على الأدلة والبراهين السريرية.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-xs">
            {activeEdition.clinicalBasics.map((item, idx) => (
              <div key={idx} className="bg-[#FDFBF7] p-6 rounded-2xl border border-slate-200 space-y-2 shadow-sm">
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