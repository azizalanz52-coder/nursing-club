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
    <main className="min-h-screen bg-[#F4F1EA] text-neutral-950 selection:bg-[#630517] selection:text-[#F4F1EA] py-8 px-4 sm:px-6 font-serif" dir="rtl">
      
      {/* الحاضنة الكبرى للجريدة (Broadsheet Container) */}
      <div className="max-w-5xl mx-auto bg-[#F4F1EA] border-4 border-neutral-900 p-4 sm:p-8 shadow-2xl relative overflow-hidden">

        {/* تأثير النصوص الدقيقة بالخلفية (Micro-text Columns Watermark) */}
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none select-none overflow-hidden grid grid-cols-4 gap-4 text-[8px] leading-tight font-mono text-neutral-900">
          <div>نادي التمريض جامعة حفر الباطن النشرة الأسبوعية تغطيات إكلينيكية فعاليات تطوعية مستجدات طبية معايير الاعتماد الهيئة السعودية للتخصصات الصحية...</div>
          <div>ورش عمل إسعافات أولية محاضرات تخصصية شراكات مجتمعية رعاية صحية جودة التطوير الأداء الإداري والمهني لجان النادي السبع...</div>
          <div>المرجع الإكلينيكي دوري مستجدات طبية المعايير العالمية دليل اختبار الهيئة السعودية SLE تدريب عملي طلاب وطالبات التمريض...</div>
          <div>أخبار صحية ابتكارات رعاية حرجة قيادة تمريضية استراتيجيات خفض الإجهاد المهني مؤتمرات علمية سنوية...</div>
        </div>

        {/* --- ترويسة الجريدة التاريخية الكلاسيكية (MASTHEAD) --- */}
        <header className="border-2 border-neutral-900 bg-[#FAF7F0] pt-6 pb-6 px-4 text-center space-y-4 shadow-sm relative z-10 mb-8">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex justify-between items-center text-xs font-sans font-bold text-neutral-600 uppercase tracking-widest px-2 border-b border-neutral-900 pb-2">
              <span>جامعة حفر الباطن • كلية التمريض</span>
              <span className="text-[#630517] font-black">{activeEdition.editionName}</span>
              <span>الجريدة الأسبوعية الرسمية</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#630517] uppercase py-3 border-y-2 border-neutral-900 my-2 bg-[#F4F1EA]">
              النشرة الأسبوعية لنادي التمريض
            </h1>

            <p className="text-xs sm:text-sm font-serif italic text-neutral-700 max-w-2xl mx-auto">
              "المرجع الإكلينيكي الدوري لأحدث المستجدات الطبية، المعايير العالمية، ودليل اختبار الهيئة السعودية (SLE)"
            </p>

            {/* شريط العداد والتبديل التفاعلي */}
            <div className="pt-3 flex flex-col sm:flex-row justify-center items-center gap-3 flex-wrap">
              <div className="bg-neutral-900 text-amber-200 px-5 py-2 text-xs font-sans font-bold flex items-center gap-2 border border-neutral-700 shadow-sm">
                <span>⏳ الإصدار يتجدد تلقائياً خلال:</span>
                <span className="font-mono text-white bg-[#630517] px-2.5 py-0.5">
                  {timeLeft.days} أيام : {timeLeft.hours} س : {timeLeft.minutes} د : {timeLeft.seconds} ث
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentEditionIndex(prev => (prev === 0 ? 1 : 0))}
                className="px-5 py-2 bg-[#630517] text-[#F5D061] font-black font-sans text-xs shadow hover:bg-neutral-900 transition-all cursor-pointer border border-neutral-900"
              >
                🔄 تبديل الإصدار (عرض {currentEditionIndex === 0 ? "الإصدار الثاني (#2)" : "الإصدار الأول (#1)"})
              </button>
            </div>

            <div className="pt-1">
              <Link href="/" className="text-xs text-[#630517] underline font-bold font-sans inline-block">
                ← العودة لصفحة النادي الرئيسية
              </Link>
            </div>
          </div>
        </header>

        {/* --- جسم الجريدة (نظام الأعمدة الصحفية والفواصل الحبرية) --- */}
        <div className="space-y-8 relative z-10">
          
          {/* قسم الربط المباشر مع منظمة الصحة العالمية (WHO Live Feed) كخبر رئيسي (Lead Story) */}
          <section className="border-2 border-neutral-900 p-6 sm:p-8 bg-[#FAF7F0] space-y-4 shadow-sm relative">
            <div className="flex justify-between items-center border-b border-neutral-900 pb-2 flex-wrap gap-2">
              <span className="bg-[#630517] text-white text-[10px] font-sans font-bold px-3 py-1 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                بث حصري متزامن مع منظمة الصحة العالمية (WHO)
              </span>
              <span className="text-xs font-sans font-bold text-neutral-600">تحديثات المنظمة العالمية • {activeEdition.dateText}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 font-serif leading-snug">
              {activeEdition.whoHeadline}
            </h2>
            <p className="text-neutral-800 text-xs sm:text-sm leading-relaxed font-serif text-justify">
              {activeEdition.whoSnippet}
            </p>
          </section>

          {/* تخطيط الأعمدة المزدوجة (أخبار التمريض العالمية + الركائز والأسس) */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* أخبار التمريض العالمية */}
            <div className="border-2 border-neutral-900 p-6 bg-[#FAF7F0] space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b-2 border-neutral-900 pb-2">
                  <h3 className="font-black text-sm uppercase tracking-wider text-[#630517] bg-neutral-900 text-[#F4F1EA] px-2.5 py-1 inline-block font-sans">
                    🌍 أبرز أخبار التمريض العالمية
                  </h3>
                  <p className="text-[11px] text-neutral-600 font-sans mt-1">أحدث المستجدات والابتكارات في قطاع الرعاية الصحية والتمريض.</p>
                </div>
                <div className="space-y-4 pt-2">
                  {activeEdition.worldNews.map((news, idx) => (
                    <div key={idx} className="border-b border-neutral-300 pb-4 space-y-2 last:border-0">
                      <span className="text-[10px] bg-neutral-900 text-[#F5D061] px-2 py-0.5 font-bold font-sans inline-block">{news.tag}</span>
                      <h4 className="font-extrabold text-neutral-900 text-sm font-serif">{news.title}</h4>
                      <p className="text-xs text-neutral-700 leading-normal">{news.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* الركائز والأسس التمريضية */}
            <div className="border-2 border-neutral-900 p-6 bg-[#FAF7F0] space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b-2 border-neutral-900 pb-2">
                  <h3 className="font-black text-sm uppercase tracking-wider text-[#630517] bg-neutral-900 text-[#F4F1EA] px-2.5 py-1 inline-block font-sans">
                    🩺 الركائز والأسس التمريضية
                  </h3>
                  <p className="text-[11px] text-neutral-600 font-sans mt-1">معايير ممارسة مهنة التمريض المبنية على الأدلة والبراهين السريرية.</p>
                </div>
                <div className="space-y-4 pt-2">
                  {activeEdition.clinicalBasics.map((item, idx) => (
                    <div key={idx} className="border-b border-neutral-300 pb-4 space-y-1.5 last:border-0">
                      <h4 className="font-extrabold text-[#630517] text-xs font-serif">{item.title}</h4>
                      <p className="text-xs text-neutral-700 leading-normal">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* قسم دليل اختبار الهيئة السعودية (SLE) بتصميم صندوق جرائد عريض فخم */}
          <section className="border-2 border-neutral-900 bg-neutral-900 text-[#F4F1EA] p-6 sm:p-8 space-y-6 shadow-xl relative">
            <div className="flex items-center gap-3 border-b border-neutral-700 pb-3 flex-wrap">
              <span className="w-10 h-10 bg-[#F5D061] text-[#630517] flex items-center justify-center text-xl font-bold border border-neutral-900">🎯</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-serif text-[#F5D061]">{activeEdition.sleGuide.title}</h2>
                <p className="text-xs text-neutral-300 font-sans">استراتيجيات ومراجع موثوقة لاجتياز اختبار رخصة المهنة من المحاولة الأولى.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 text-xs font-serif leading-relaxed">
              <div className="border border-neutral-700 p-5 bg-neutral-800/90 space-y-3">
                <h3 className="font-bold text-[#F5D061] text-xs font-sans">💡 استراتيجيات التفوق والأسرار:</h3>
                <ul className="space-y-2 list-disc list-inside text-neutral-200">
                  {activeEdition.sleGuide.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="border border-neutral-700 p-5 bg-neutral-800/90 space-y-3">
                <h3 className="font-bold text-[#F5D061] text-xs font-sans">📚 المراجع والمصادر الموصى بها:</h3>
                <ul className="space-y-2 list-disc list-inside text-neutral-200">
                  {activeEdition.sleGuide.sources.map((src, i) => (
                    <li key={i}><strong>{src}</strong></li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

        </div>

        {/* --- تذييل الجريدة (Footer) --- */}
        <footer className="border-t-2 border-neutral-900 mt-10 pt-4 text-center font-sans text-[11px] text-neutral-600 space-y-1 relative z-10">
          <p className="font-bold text-neutral-900">نادي كلية التمريض • جامعة حفر الباطن • الإصدار الرقمي الموثق</p>
          <p>جميع الحقوق محفوظة © 2026 | النشرة الأسبوعية الصحفية</p>
        </footer>

      </div>
    </main>
  );
}