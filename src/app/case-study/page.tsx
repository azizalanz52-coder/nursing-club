'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from './../lib/firebase';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';

interface CaseQuestion {
  id: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  title: string;
  scenario: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  bonusPoints?: number; // بونص إضافي 1 أو 2 لسؤال واحد فقط
}

interface LeaderboardItem {
  studentName: string;
  totalScore: number;
}

// بنك الحالات الإكلينيكية الخاص بأسبوع الصحة النفسية (Mental Health Nursing Cases)
const masterCasePool: Omit<CaseQuestion, 'id'>[] = [
  {
    difficulty: 'Easy',
    title: 'Case 1: Major Depressive Disorder & Suicide Safety Assessment',
    scenario: 'A 28-year-old admitted patient with Major Depressive Disorder states: "I feel like a burden to everyone, and things would be better if I just went to sleep forever." What is the immediate priority nursing action?',
    options: [
      'Encourage the patient to join a group therapy session immediately to distract their thoughts',
      'Ask the patient directly: "Are you thinking about suicide or harming yourself right now?" and initiate 1-to-1 observation',
      'Reassure the patient that everything will get better soon and leave them alone to rest',
      'Document the statement and re-evaluate the patient during the next shift round'
    ],
    correctIndexString: 'Ask the patient directly: "Are you thinking about suicide or harming yourself right now?" and initiate 1-to-1 observation',
    explanation: 'Directly assessing for suicidal ideation and intent is the gold standard in psychiatric nursing safety. Immediate continuous suicide precautions (1-to-1 observation) are mandatory to protect patient life.'
  } as any,
  {
    difficulty: 'Easy',
    title: 'Case 2: Acute Panic Attack & Hyperventilation Crisis',
    scenario: 'A nursing student presents to the student clinic experiencing a severe panic attack with hyperventilation, chest tightness, rapid heart rate, and an overwhelming feeling of impending doom. What is the priority nursing intervention?',
    options: [
      'Instruct the student to sit down, speak in short, calm sentences, and guide them to practice slow, deep diaphragmatic breathing',
      'Leave the student alone in a quiet dark room so they can calm down without pressure',
      'Administer high-flow oxygen via non-rebreather mask immediately',
      'Provide detailed health teaching regarding the pathophysiology of panic disorders'
    ],
    correctIndexString: 'Instruct the student to sit down, speak in short, calm sentences, and guide them to practice slow, deep diaphragmatic breathing',
    explanation: 'During an acute panic attack, the nurse must remain calm, minimize environmental stimuli, use clear, simple sentences, and guide slow breathing to reduce hyperventilation and acute respiratory alkalosis.'
  } as any,
  {
    difficulty: 'Moderate',
    title: 'Case 3: Acute Bipolar Mania & Environmental Management',
    scenario: 'A patient with Bipolar I Disorder in an acute manic phase is hyperactive, pacing continuously, talking rapidly with grandiosity, and refusing to sit for meals. Which nursing strategy is most effective for maintaining adequate nutrition and safety?',
    options: [
      'Force the patient to sit quietly at the dining table until they finish a full 3-course meal',
      'Provide high-calorie, high-protein finger foods and drinks that the patient can eat while moving',
      'Restrict all physical movement by applying soft wrist restraints until calm',
      'Hold all nutritional intake until the patient’s mood stabilizes with mood stabilizers'
    ],
    correctIndexString: 'Provide high-calorie, high-protein finger foods and drinks that the patient can eat while moving',
    explanation: 'Manic patients have extreme energy expenditure and short attention spans. High-calorie, portable "finger foods" (e.g., sandwiches, smoothies, protein bars) ensure adequate nutritional intake without conflict.'
  } as any,
  {
    difficulty: 'Moderate',
    title: 'Case 4: Schizophrenia & Command Hallucinations',
    scenario: 'A patient diagnosed with Schizophrenia looks terrified, stares at the corner of the unit, and whispers: "The voices are telling me to jump out of the window." What is the therapeutic response by the nurse?',
    options: [
      'Argue with the patient and state: "There are no voices here, you are imagining things."',
      'Acknowledge the fear, validate feelings without reinforcing the hallucination: "I know the voices feel real to you, but you are safe here, and I do not hear them."',
      'Validate the hallucination by asking: "What do the voices look like and what else do they say?"',
      'Ignore the statement and immediately escort the patient to the television room'
    ],
    correctIndexString: 'Acknowledge the fear, validate feelings without reinforcing the hallucination: "I know the voices feel real to you, but you are safe here, and I do not hear them."',
    explanation: 'Command hallucinations present a critical safety risk. The nurse must validate the patient’s feelings (fear/distress) while presenting reality clearly without arguing or agreeing with the hallucination.'
  } as any,
  {
    difficulty: 'Hard',
    title: 'Case 5: Severe Alcohol Withdrawal & Delirium Tremens (DTs)',
    scenario: 'On day 3 of hospitalization, a patient with a history of chronic severe alcohol use disorder develops coarse hand tremors, severe agitation, diaphoresis, visual hallucinations, blood pressure 180/110 mmHg, and heart rate 130 bpm. What is the priority medication category prescribed under CIWA protocol?',
    options: [
      'Administer IV Benzodiazepines (e.g., Lorazepam or Diazepam) titrated according to CIWA score',
      'Administer IV Antihypertensives to lower blood pressure and delay psychiatric treatment',
      'Administer high-dose antipsychotics (e.g., Haloperidol) as first-line monotherapy',
      'Administer oral antidepressant SSRIs to manage agitation'
    ],
    correctIndexString: 'Administer IV Benzodiazepines (e.g., Lorazepam or Diazepam) titrated according to CIWA score',
    explanation: 'Delirium Tremens (DTs) is a medical emergency with high mortality. Benzodiazepines are the cornerstone treatment to enhance GABA activity, prevent alcohol withdrawal seizures, and control autonomic hyperarousal.'
  } as any,
  {
    difficulty: 'Hard',
    title: 'Case 6: Lithium Toxicity & Psychopharmacology Monitoring',
    scenario: 'A patient receiving Lithium Carbonate for Bipolar Disorder presents with severe nausea, persistent vomiting, coarse hand tremors, blurred vision, ataxia, and confusion. Laboratory results reveal a serum lithium level of 2.2 mEq/L. What is the critical nursing action?',
    options: [
      'Continue the morning lithium dose as scheduled and reassess in 24 hours',
      'Withhold the lithium dose immediately, notify the physician, and prepare for hydration and toxicity protocols',
      'Increase oral fluid restriction to prevent hyponatremia',
      'Administer an extra dose of lithium to stabilize mood swings'
    ],
    correctIndexString: 'Withhold the lithium dose immediately, notify the physician, and prepare for hydration and toxicity protocols',
    explanation: 'Therapeutic Lithium level is 0.6 - 1.2 mEq/L. Levels above 2.0 mEq/L cause severe toxicity manifested by coarse tremors, ataxia, vomiting, and confusion. Lithium must be withheld immediately and medical intervention initiated.'
  } as any
];

export default function CaseStudyPage() {
  const [activeCases, setActiveCases] = useState<CaseQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  useEffect(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const seed = now.getFullYear() * 1000 + dayOfYear;

    const shuffledPool = [...masterCasePool];
    for (let i = shuffledPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.abs(Math.sin(seed + i) * 10000)) % (i + 1);
      [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
    }

    // --- منطق البونص السري لليوم (سؤال واحد فقط بحد أقصى) ---
    // فحص هل يوجد بونص اليوم أم لا (احتمالية 50%)
    const hasBonusToday = Math.abs(Math.sin(seed * 11)) > 0.5;
    // تحديد السؤال الذي سيحصل على البونص (0 أو 1 أو 2)
    const bonusTargetIndex = Math.floor(Math.abs(Math.sin(seed * 17)) * 3);
    // تحديد قيمة البونص (1 أو 2 نقطة حسب الحظ)
    const bonusAmount = Math.abs(Math.sin(seed * 23)) > 0.5 ? 2 : 1;

    const selectedDaily = shuffledPool.slice(0, 3).map((item, index) => {
      const optionsWithOriginalIndex = item.options.map((opt) => ({
        text: opt,
        isCorrect: opt === (item as any).correctIndexString
      }));

      const optionSeed = seed + index;
      for (let i = optionsWithOriginalIndex.length - 1; i > 0; i--) {
        const j = Math.floor(Math.abs(Math.sin(optionSeed + i) * 10000)) % (i + 1);
        [optionsWithOriginalIndex[i], optionsWithOriginalIndex[j]] = [optionsWithOriginalIndex[j], optionsWithOriginalIndex[i]];
      }

      // يمنح البونص فقط للسؤال المختار تحديداً
      const isThisBonusQuestion = hasBonusToday && index === bonusTargetIndex;

      return {
        id: index + 1,
        difficulty: item.difficulty,
        title: `Case ${index + 1}: ${item.title.split(': ')[1] || item.title}`,
        scenario: item.scenario,
        options: optionsWithOriginalIndex.map(o => o.text),
        correctIndex: optionsWithOriginalIndex.findIndex(o => o.isCorrect),
        explanation: item.explanation,
        bonusPoints: isThisBonusQuestion ? bonusAmount : 0
      };
    });

    setActiveCases(selectedDaily);
    fetchLeaderboard();

    const savedName = localStorage.getItem('userName') || localStorage.getItem('fullName');
    const savedPhone = localStorage.getItem('userPhone') || localStorage.getItem('phone');
    
    if (savedName) setStudentName(savedName);
    if (savedPhone) {
      setStudentPhone(savedPhone);
      checkIfAlreadySubmitted(savedPhone);
    }

    // العداد التنازلي بصيغة عربية متناسقة
    const timer = setInterval(() => {
      const currentTime = new Date();
      const hoursLeft = 23 - currentTime.getHours();
      const minsLeft = 59 - currentTime.getMinutes();
      setTimeLeft(`${hoursLeft} ساعة و ${minsLeft} دقيقة`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // دالة جلب لوحة الصدارة
  const fetchLeaderboard = async () => {
    try {
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const userNamesMap: Record<string, string> = {};
      usersSnap.forEach(userDoc => {
        const phoneKey = userDoc.id.trim();
        const userData = userDoc.data();
        if (userData.fullName) {
          userNamesMap[phoneKey] = userData.fullName.trim();
        }
      });

      userNamesMap['0553731265'] = 'عبدالعزيز سليمان العنزي (المشرف العام)';

      const snap = await getDocs(query(collection(db, 'case_study_submissions')));
      const scoreMap: Record<string, number> = {};

      snap.forEach(docSnap => {
        const data = docSnap.data();
        const phoneKey = (data.phone || data.phoneNumber || '').trim();
        const fallbackName = (data.studentName || 'مشارك').trim();
        
        const finalName = (phoneKey && userNamesMap[phoneKey]) ? userNamesMap[phoneKey] : fallbackName;
        const score = Number(data.score) || 0;
        
        if (scoreMap[finalName]) {
          scoreMap[finalName] += score;
        } else {
          scoreMap[finalName] = score;
        }
      });

      const list: LeaderboardItem[] = Object.keys(scoreMap).map(name => ({
        studentName: name,
        totalScore: scoreMap[name]
      }));

      list.sort((a, b) => b.totalScore - a.totalScore);
      setLeaderboard(list.slice(0, 30));
    } catch (err) {
      console.error(err);
    }
  };

  const checkIfAlreadySubmitted = async (phone: string) => {
    try {
      const q = query(collection(db, 'case_study_submissions'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.phone === phone) {
            const submissionDate = new Date(data.timestamp).toDateString();
            const todayDate = new Date().toDateString();
            if (submissionDate === todayDate) {
              setHasSubmittedToday(true);
              setShowResults(true);
            }
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectOption = (caseId: number, optionIndex: number) => {
    if (showResults || hasSubmittedToday) return;
    setSelectedAnswers(prev => ({ ...prev, [caseId]: optionIndex }));
  };

  // دالة حساب مجموع النقاط الفعلية (تضيف البونص فقط إذا كانت إجابة السؤال الصحيحة مختارة)
  const calculateScore = () => {
    let score = 0;
    activeCases.forEach(c => {
      if (selectedAnswers[c.id] === c.correctIndex) {
        score += 1 + (c.bonusPoints || 0);
      }
    });
    return score;
  };

  // دالة حساب المجموع الأقصى الممكن للنقاط اليومية
  const getMaxPossibleScore = () => {
    return activeCases.reduce((acc, c) => acc + 1 + (c.bonusPoints || 0), 0);
  };

  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentPhone.trim()) {
      alert('الرجاء التأكد من تسجيل الدخول أولاً ليتم توثيق اسمك ورقمك تلقائياً!');
      return;
    }

    if (Object.keys(selectedAnswers).length < activeCases.length) {
      alert('الرجاء الإجابة على جميع الحالات الإكلينيكية قبل الإرسال!');
      return;
    }

    setSubmitting(true);
    try {
      const score = calculateScore();
      const now = new Date();
      
      await addDoc(collection(db, 'case_study_submissions'), {
        studentName: studentName.trim(),
        phone: studentPhone.trim(),
        score: score,
        total: activeCases.length,
        timestamp: Date.now(),
        dateStr: now.toLocaleDateString('ar-SA'),
        timeStr: now.toLocaleTimeString('ar-SA')
      });

      setHasSubmittedToday(true);
      setShowResults(true);
      fetchLeaderboard();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ النتيجة، تأكد من الاتصال بقاعدة البيانات.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative" dir="ltr">
      
      {/* هيدر التحدي اليومي بهوية اليوم العالمي للصحة النفسية */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0d9488] text-white py-12 px-4 sm:px-6 shadow-xl border-b-4 border-[#F5D061]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 bg-[#F5D061] text-[#064e3b] font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              <span>💚 🧠 World Mental Health Day Special</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Psychiatric & Mental Health Nursing Challenge
            </h1>
            
            {/* فقرة الوقت المنسقة */}
            <div className="bg-emerald-950/40 border border-emerald-400/30 px-4 py-2 rounded-2xl text-xs sm:text-sm text-emerald-100 font-medium inline-block" dir="rtl">
              ⏱️ <span>يتجدد التحدي اليومي بعد: </span>
              <strong className="text-[#F5D061] font-black px-1">{timeLeft || 'جاري التحديث...'}</strong>
            </div>

            <div>
              <Link href="/" className="text-xs text-[#F5D061] hover:underline font-bold inline-block pt-1">
                ← Back to Home | العودة للرئيسية
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLeaderboardModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#F5D061] to-[#E2B739] text-[#064e3b] px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 border border-white/30"
          >
            <span className="text-lg">🏆</span>
            <span>لوحة الصدارة</span>
          </button>
        </div>
      </div>

      {/* نافذة لوحة الصدارة المنبثقة */}
      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-[#047857] flex items-center gap-2">
                <span>🏆</span> لوحة صدارة أسبوع الصحة النفسية
              </h3>
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pl-1">
              {leaderboard.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8 font-medium">لا توجد سجلات صدارة حتى الآن، كن أول المشاركين!</p>
              ) : (
                leaderboard.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs font-bold">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                        idx === 0 ? 'bg-amber-400 text-slate-900 shadow-sm' :
                        idx === 1 ? 'bg-slate-300 text-slate-800' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-emerald-200 text-emerald-800'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-slate-800">{item.studentName}</span>
                    </div>
                    <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-mono font-bold">
                      ⭐ {item.totalScore} نقطة
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowLeaderboardModal(false)}
              className="w-full py-3 rounded-2xl bg-[#047857] text-[#F5D061] font-black text-xs shadow-md cursor-pointer hover:brightness-110"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* قائمة الأسماء والحالات الإكلينيكية */}
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8" dir="ltr">
        {activeCases.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-100 shadow-sm space-y-6 relative overflow-hidden">
            
            {/* يظهر البونص فقط للسؤال الوحيد الذي وقع عليه الاختيار اليوم */}
            {item.bonusPoints && item.bonusPoints > 0 ? (
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-3 rounded-2xl shadow-md flex items-center justify-between font-extrabold text-xs" dir="rtl">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎉</span>
                  <span>مبروك! وصلك بونص سري على هذا السؤال</span>
                </div>
                <span className="bg-white text-amber-900 px-3 py-1 rounded-xl shadow-sm">
                  +{item.bonusPoints} {item.bonusPoints === 1 ? 'نقطة إضافية' : 'نقاط إضافية'}
                </span>
              </div>
            ) : null}

            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-4">
              <span className="font-black text-[#047857] text-base flex items-center gap-2">
                <span>🧠</span> {item.title}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                item.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' : 
                item.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                Level: {item.difficulty}
              </span>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/80 text-sm font-medium leading-relaxed text-slate-800">
              {item.scenario}
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 block">Select the correct evidence-based nursing action:</span>
              <div className="grid grid-cols-1 gap-2.5">
                {item.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[item.id] === optIdx;
                  const isCorrect = optIdx === item.correctIndex;

                  let btnStyle = 'bg-white border-slate-200 hover:bg-emerald-50/30 text-slate-800';
                  if (showResults) {
                    if (isCorrect) btnStyle = 'bg-emerald-600 text-white border-emerald-700 font-bold';
                    else if (isSelected && !isCorrect) btnStyle = 'bg-rose-600 text-white border-rose-700 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'bg-[#047857] text-white border-[#047857] font-bold shadow-md';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(item.id, optIdx)}
                      disabled={showResults || hasSubmittedToday}
                      className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                    >
                      <span className="pr-4">{opt}</span>
                      <span className="w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0">
                        {optIdx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showResults && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
                <strong className="text-[#047857]">💡 Mental Health Clinical Rationale:</strong>
                <p className="leading-relaxed">{item.explanation}</p>
              </div>
            )}
          </div>
        ))}

        {!showResults ? (
          <form onSubmit={handleSubmitAnswers} className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4 text-center">
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-slate-700 font-medium">
              🔒 Connected Profile: <strong className="text-[#047857]">{studentName || 'مستخدم مسجل'}</strong> (Phone: <span dir="ltr">{studentPhone || '---'}</span>)
              <p className="text-[10px] text-slate-400 mt-1">Your response will be recorded for Mental Health Week Clinical Leaderboard.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#064e3b] to-[#047857] text-[#F5D061] py-4 rounded-2xl font-black text-sm shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer border border-white/20"
            >
              {submitting ? 'Submitting...' : 'Submit Answers & Save Mental Health Score 🧠🎯'}
            </button>
          </form>
        ) : (
          <div className="bg-emerald-50 border-2 border-emerald-300 p-6 rounded-3xl space-y-3 text-center">
            <h3 className="text-xl font-black text-emerald-900">Your Score: {calculateScore()} / {getMaxPossibleScore()} Points! 🎉</h3>
            <p className="text-xs text-emerald-800 font-medium">
              شكراً لمشاركتك في أسبوع التوعية بالصحة النفسية. تم تسجيل إجابتك وتحديث نقاطك بنجاح.
            </p>
            <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200 text-xs text-slate-700 font-bold" dir="rtl">
              ⏱️ <span>التحدي اليومي القادم متاح بعد: </span>
              <span className="text-[#047857] font-black">{timeLeft}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}