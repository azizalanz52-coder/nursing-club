'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CaseQuestion {
  id: number;
  difficulty: 'سهل' | 'متوسط';
  title: string;
  scenario: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function CaseStudyPage() {
  // مجموعتان من الحالات تتغير تلقائياً بناءً على تاريخ اليوم (كل 24 ساعة)
  const casePool: CaseQuestion[][] = [
    [
      {
        id: 1,
        difficulty: 'سهل',
        title: 'الحالة الأولى: تقييم العلامات الحيوية',
        scenario: 'مريض عمره 45 سنة منوم في قسم الباطنية، عند قياس العلامات الحيوية وجدنا: حرارة الجسم 38.5°C، نبض القلب 110 نبضة/دقيقة، والتنفس 22 مرة/دقيقة. ما هو الإجراء التمريضي الأولي الأنسب؟',
        options: [
          'إعطاء خافض حرارة فوري دون الرجوع للطبيب',
          'إبلاغ الطبيب المعجستري وتسجيل قراءات العلامات الحيوية في الملف',
          'تغطية المريض بأغطية ثقيلة لزيادة التعرق',
          'الانتظار لمدة 4 ساعات وإعادة القياس'
        ],
        correctIndex: 1,
        explanation: 'الصحيح هو إبلاغ الطبيب وتسجيل القراءات بدقة لتدخل الفريق الطبي السريع.'
      },
      {
        id: 2,
        difficulty: 'متوسط',
        title: 'الحالة الثانية: إدارة السوائل الوريدية',
        scenario: 'مريضة تستقبل محلول وريدي (IV Fluids) ولاحظت الممرضة وجود تورم، ألم، وبرودة حول مكان تركيب الكانيولا (IV site). ما هو الإجراء الفوري الواجب اتخاذه؟',
        options: [
          'إبطاء سرعة المحلول والاستمرار بالعمل',
          'وضع كمادات ساخنة فوق المكان مباشرة',
          'إيقاف المحلول فوراً، إزالة الكانيولا، ورفع الطرف المصاب',
          'إعطاء مسكن ألم وريدي في نفس الكانيولا'
        ],
        correctIndex: 2,
        explanation: 'هذه أعراض تسرب السوائل (Infiltration)، ويجب إيقاف المحلول وإزالة الكانيولا فوراَ لمنع تلف الأنسجة.'
      }
    ],
    // مجموعة بديلة لليوم التالي
    [
      {
        id: 1,
        difficulty: 'سهل',
        title: 'الحالة الأولى: العناية بالجروح',
        scenario: 'أثناء تغيير غيار الججرح الجراحي لمريض، لاحظت الممرضة وجود احمرار خفيف وحواف نظيفة بدون إفرازات صديدية. كيف تصنف حالة الجرح؟',
        options: [
          'جرح ملتهب يحتاج مضاد حيوي فوري',
          'جرح طبيعي في مرحلة التئام أولية (Healing by primary intention)',
          'جرح منفتح يحتاج إعادة خياطة',
          'جرح مزمن'
        ],
        correctIndex: 1,
        explanation: 'الاحمرار البسيط مع التئام الحواف يعتبر مؤشراً طبيعياً لمرحلة التئام الجروح.'
      },
      {
        id: 2,
        difficulty: 'متوسط',
        title: 'الحالة الثانية: سلامة الأدوية',
        scenario: 'أرادت الممرضة إعطاء دواء للمريض عن طريق الفم، لكن المريض كان نائماً بعمق. ما التصرف الصحيح؟',
        options: [
          'إيقاظ المريض بالقوة لتناول الدواء',
          'طحن الدواء وإضافته لكوب ماء ووضعه بجانب السرير',
          'تأجيل إعطاء الدواء وإبلاغ مشرف الصيدلية أو الطبيب حسب البروتوكول',
          'إعطاء الدواء عبر أنبوب التغذية إن وجد دون استشارة'
        ],
        correctIndex: 2,
        explanation: 'لا يُعطى الدواء لمريض غير واعي أو نائماً بعمق تفادياً لخطر الشنقة (Aspiration).'
      }
    ]
  ];

  const [activeCases, setActiveCases] = useState<CaseQuestion[]>(casePool[0]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    // اختيار مجموعة الحالات بناءً على اليوم الحالي لكي تتجدد كل 24 ساعة تلقائياً
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % casePool.length;
    setActiveCases(casePool[dayIndex]);

    // عداد زمني وهمي لـ 24 ساعة القادمة
    const timer = setInterval(() => {
      const now = new Date();
      const hoursLeft = 23 - now.getHours();
      const minsLeft = 59 - now.getMinutes();
      setTimeLeft(`${hoursLeft} ساعة و ${minsLeft} دقيقة لتجديد الحالات القادمة`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSelectOption = (caseId: number, optionIndex: number) => {
    if (showResults) return; // منع التعديل بعد إظهار النتيجة
    setSelectedAnswers(prev => ({
      ...prev,
      [caseId]: optionIndex
    }));
  };

  const calculateScore = () => {
    let score = 0;
    activeCases.forEach(c => {
      if (selectedAnswers[c.id] === c.correctIndex) {
        score++;
      }
    });
    return score;
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20" dir="rtl">
      {/* هيدر الصفحة */}
      <div className="bg-[#630517] text-white py-10 px-6 text-center space-y-3 shadow-md">
        <span className="bg-[#F5D061] text-[#630517] font-black text-xs px-4 py-1.5 rounded-full inline-block">
          ⏱️ تحدي دراسة الحالة اليومي (تتجدد كل 24 ساعة)
        </span>
        <h1 className="text-3xl sm:text-4xl font-black">حالات إكلينيكية تمريضية</h1>
        <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto">
          اختبر مهاراتك التمريضية في مستويات الصعوبة من (سهل إلى متوسط). الوقت الباقي للتجديد: <span className="text-[#F5D061] font-bold">{timeLeft}</span>
        </p>
        <div className="pt-2">
          <Link href="/" className="text-xs text-[#F5D061] underline font-bold">
            ← العودة للرئيسية
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {activeCases.map((item, index) => (
          <div key={item.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-4">
              <span className="font-black text-[#630517] text-base">{item.title}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.difficulty === 'سهل' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                المستوى: {item.difficulty}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-medium leading-relaxed text-slate-800">
              {item.scenario}
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 block">اختر الإجابة الصحيحة (خيارات متعددة):</span>
              <div className="grid grid-cols-1 gap-2.5">
                {item.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[item.id] === optIdx;
                  const isCorrect = optIdx === item.correctIndex;

                  let btnStyle = 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800';
                  if (showResults) {
                    if (isCorrect) btnStyle = 'bg-emerald-500 text-white border-emerald-600 font-bold';
                    else if (isSelected && !isCorrect) btnStyle = 'bg-red-500 text-white border-red-600 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'bg-[#630517] text-white border-[#630517] font-bold shadow-sm';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(item.id, optIdx)}
                      className={`w-full text-right p-4 rounded-2xl border text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold">
                        {optIdx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showResults && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <strong>💡 التفسير الإكلينيكي:</strong>
                <p>{item.explanation}</p>
              </div>
            )}
          </div>
        ))}

        <div className="text-center pt-4">
          {!showResults ? (
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="bg-[#630517] text-[#F5D061] px-10 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              إرسال وعرض النتيجة النهائية 🎯
            </button>
          ) : (
            <div className="bg-emerald-50 border-2 border-emerald-300 p-6 rounded-3xl space-y-2">
              <h3 className="text-xl font-black text-emerald-900">نتيجة التحدي: {calculateScore()} من {activeCases.length} إجابات صحيحة! 🎉</h3>
              <p className="text-xs text-emerald-700">شكراً لمشاركتك اليوم. انتظر الحالات الجديدة بعد مرور 24 ساعة.</p>
              <button
                type="button"
                onClick={() => { setShowResults(false); setSelectedAnswers({}); }}
                className="mt-2 bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}