'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from './../lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

interface CaseQuestion {
  id: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  title: string;
  scenario: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// بنك شامل ومتنوع للحالات الإكلينيكية التمريضية
const masterCasePool: Omit<CaseQuestion, 'id'>[] = [
  {
    difficulty: 'Easy',
    title: 'Case: Vital Signs Assessment',
    scenario: 'A 45-year-old admitted patient has a body temperature of 38.5°C, HR 110 bpm, and RR 22 breaths/min. What is the most appropriate initial nursing intervention?',
    options: [
      'Administer antipyretic medication immediately without notifying the physician',
      'Notify the physician and document the vital signs accurately in the patient chart',
      'Cover the patient with heavy blankets to induce sweating',
      'Wait for 4 hours and recheck the temperature'
    ],
    correctIndexString: 'Notify the physician and document the vital signs accurately in the patient chart',
    explanation: 'The correct action is to notify the physician and document findings for prompt medical collaboration.'
  } as any,
  {
    difficulty: 'Moderate',
    title: 'Case: IV Fluid Management',
    scenario: 'A nurse notices swelling, coolness, and pain around an intravenous (IV) insertion site. What is the immediate nursing action?',
    options: [
      'Slow down the infusion rate and continue monitoring',
      'Apply a hot compress directly over the site',
      'Stop the infusion immediately, remove the IV catheter, and elevate the limb',
      'Administer an analgesic through the same IV line'
    ],
    correctIndexString: 'Stop the infusion immediately, remove the IV catheter, and elevate the limb',
    explanation: 'These are classic signs of infiltration. The IV must be stopped and removed immediately to prevent tissue damage.'
  } as any,
  {
    difficulty: 'Hard',
    title: 'Case: Advanced Hemodynamic Crisis (Sepsis)',
    scenario: 'A postoperative patient develops a temperature of 39.2°C, blood pressure of 82/50 mmHg, heart rate of 135 bpm, and acute confusion. Serum lactate is 4.2 mmol/L. What is the priority nursing and medical intervention bundle within the first hour?',
    options: [
      'Administer scheduled oral antihypertensives and reassess in 2 hours',
      'Initiate rapid IV fluid resuscitation (crystalloids 30 mL/kg), draw blood cultures, and administer broad-spectrum IV antibiotics immediately',
      'Apply a cooling blanket and restrict fluid intake to prevent pulmonary edema',
      'Prepare the patient for immediate emergency surgery'
    ],
    correctIndexString: 'Initiate rapid IV fluid resuscitation (crystalloids 30 mL/kg), draw blood cultures, and administer broad-spectrum IV antibiotics immediately',
    explanation: 'In septic shock, early goal-directed therapy requires immediate fluid resuscitation, obtaining blood cultures before antibiotics, and administering broad-spectrum IV antibiotics within the 1-hour bundle to prevent multi-organ failure.'
  } as any,
  {
    difficulty: 'Easy',
    title: 'Case: Wound Care Evaluation',
    scenario: 'While changing a surgical dressing, the nurse observes mild erythema and well-approximated wound edges with no drainage. How should this be classified?',
    options: [
      'An infected wound requiring immediate antibiotic therapy',
      'A normal wound in the primary intention healing stage',
      'A dehisced wound requiring surgical re-suturing',
      'A chronic non-healing ulcer'
    ],
    correctIndexString: 'A normal wound in the primary intention healing stage',
    explanation: 'Mild erythema with well-approximated edges is a normal presentation in primary intention healing.'
  } as any,
  {
    difficulty: 'Moderate',
    title: 'Case: Medication Safety',
    scenario: 'The nurse is scheduled to administer an oral medication to a patient, but the patient is found sleeping deeply. What is the correct protocol?',
    options: [
      'Wake the patient forcefully to take the medication',
      'Crush the medication in water and leave it on the bedside table',
      'Hold the medication temporarily and notify the charge nurse or physician',
      'Administer the medication via feeding tube without checking'
    ],
    correctIndexString: 'Hold the medication temporarily and notify the charge nurse or physician',
    explanation: 'Medications should not be given to unresponsive or deeply sleeping patients to prevent aspiration risks.'
  } as any,
  {
    difficulty: 'Hard',
    title: 'Case: Critical Arrhythmia & Cardiac Arrest',
    scenario: 'A telemetry-monitored patient suddenly exhibits ventricular fibrillation (V-Fib) on the monitor. The patient is unresponsive and pulseless. What is the immediate, non-negotiable sequence of actions?',
    options: [
      'Check patient pupillary response, administer IV atropine, and call family members',
      'Begin high-quality CPR immediately, charge and check rhythm for defibrillation as soon as the AED/Defibrillator is available, and establish emergency airway management',
      'Administer sublingual nitroglycerin and check blood pressure',
      'Document the exact time of arrest in the chart and wait for the code team'
    ],
    correctIndexString: 'Begin high-quality CPR immediately, charge and check rhythm for defibrillation as soon as the AED/Defibrillator is available, and establish emergency airway management',
    explanation: 'In cardiac arrest due to V-Fib, immediate high-quality CPR and rapid defibrillation are the primary determinants of survival under ACLS guidelines.'
  } as any,
  {
    difficulty: 'Moderate',
    title: 'Case: Diabetic Ketoacidosis (DKA)',
    scenario: 'A type 1 diabetic patient presents with fruity breath odor, Kussmaul respirations, blood glucose of 480 mg/dL, and pH of 7.21. What is the initial priority fluid order?',
    options: [
      '5% Dextrose in water rapidly',
      'Isotonic Normal Saline (0.9% NaCl) IV infusion for volume expansion',
      'Hypotonic saline (0.45% NaCl) with high insulin bolus',
      'Strict fluid restriction'
    ],
    correctIndexString: 'Isotonic Normal Saline (0.9% NaCl) IV infusion for volume expansion',
    explanation: 'Initial management of DKA focuses on restoring intravascular volume and tissue perfusion with isotonic crystalloids before insulin therapy.'
  } as any,
  {
    difficulty: 'Easy',
    title: 'Case: Oxygen Therapy Safety',
    scenario: 'A patient is receiving oxygen therapy via nasal cannula at 3 L/min. Which safety precaution is most critical for the nurse to enforce?',
    options: [
      'Prohibit smoking and open flames in and around the patient room',
      'Remove the cannula every 30 minutes for 10 minutes of room air',
      'Humidification is strictly required for any flow rate above 1 L/min',
      'Apply petroleum jelly around the nostrils to prevent dryness'
    ],
    correctIndexString: 'Prohibit smoking and open flames in and around the patient room',
    explanation: 'Oxygen supports combustion; hence, strict "No Smoking" and fire hazard precautions are mandatory.'
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

  useEffect(() => {
    // توليد رقم عشوائي ثابت يعتمد على تاريخ اليوم (السنة + اليوم في السنة) ليتغير كل 24 ساعة بدقة لكل المستخدمين
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const seed = now.getFullYear() * 1000 + dayOfYear;

    // دالة شبه عشوائية مبنية على الـ seed لتحديد 3 حالات مختلفة وخاصة بهذا اليوم
    const shuffledPool = [...masterCasePool];
    // خلط البنك بناءً على الـ seed اليومي
    for (let i = shuffledPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.abs(Math.sin(seed + i) * 10000)) % (i + 1);
      [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
    }

    // نختار أول 3 حالات لليوم ونقوم بخلط خياراتها عشوائياً بحيث تتغير أماكن الإجابات الصحيحة يومياً
    const selectedDaily = shuffledPool.slice(0, 3).map((item, index) => {
      const optionsWithOriginalIndex = item.options.map((opt, idx) => ({
        text: opt,
        isCorrect: opt === (item as any).correctIndexString
      }));

      // خلط خيارات هذه الحالة بناءً على seed اليوم ورقم السؤال
      const optionSeed = seed + index;
      for (let i = optionsWithOriginalIndex.length - 1; i > 0; i--) {
        const j = Math.floor(Math.abs(Math.sin(optionSeed + i) * 10000)) % (i + 1);
        [optionsWithOriginalIndex[i], optionsWithOriginalIndex[j]] = [optionsWithOriginalIndex[j], optionsWithOriginalIndex[i]];
      }

      const newOptions = optionsWithOriginalIndex.map(o => o.text);
      const newCorrectIndex = optionsWithOriginalIndex.findIndex(o => o.isCorrect);

      return {
        id: index + 1,
        difficulty: item.difficulty,
        title: `Case ${index + 1}: ${item.title.split(': ')[1] || item.title}`,
        scenario: item.scenario,
        options: newOptions,
        correctIndex: newCorrectIndex,
        explanation: item.explanation
      };
    });

    setActiveCases(selectedDaily);

    // ربط تلقائي ببيانات تسجيل الدخول المخزنة لجلسة الطالب
    const savedName = localStorage.getItem('userName') || localStorage.getItem('fullName');
    const savedPhone = localStorage.getItem('userPhone') || localStorage.getItem('phone');
    
    if (savedName) setStudentName(savedName);
    if (savedPhone) {
      setStudentPhone(savedPhone);
      checkIfAlreadySubmitted(savedPhone);
    }

    const timer = setInterval(() => {
      const currentTime = new Date();
      const hoursLeft = 23 - currentTime.getHours();
      const minsLeft = 59 - currentTime.getMinutes();
      setTimeLeft(`${hoursLeft} hours and ${minsLeft} minutes`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const checkIfAlreadySubmitted = async (phone: string) => {
    try {
      const q = query(collection(db, 'case_study_submissions'), where('phone', '==', phone));
      const snap = await getDocs(q);
      if (!snap.empty) {
        snap.docs.forEach(docSnap => {
          const data = docSnap.data();
          const submissionDate = new Date(data.timestamp).toDateString();
          const todayDate = new Date().toDateString();
          if (submissionDate === todayDate) {
            setHasSubmittedToday(true);
            setShowResults(true);
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

  const calculateScore = () => {
    let score = 0;
    activeCases.forEach(c => {
      if (selectedAnswers[c.id] === c.correctIndex) score++;
    });
    return score;
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
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ النتيجة، تأكد من الاتصال بقاعدة البيانات.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20" dir="ltr">
      <div className="bg-[#630517] text-white py-12 px-6 text-center space-y-3 shadow-md">
        <span className="bg-[#F5D061] text-[#630517] font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider inline-block">
          ⏱️ Daily Advanced Clinical Challenge
        </span>
        <h1 className="text-3xl sm:text-4xl font-black">Nursing Clinical Case Studies</h1>
        <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto">
          Test your advanced knowledge. Next daily rotation in: <span className="text-[#F5D061] font-bold">{timeLeft}</span>
        </p>
        <div className="pt-2">
          <Link href="/" className="text-xs text-[#F5D061] underline font-bold">
            ← Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {activeCases.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2 border-b border-slate-100 pb-4">
              <span className="font-black text-[#630517] text-base">{item.title}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                item.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' : 
                item.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                Level: {item.difficulty}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-medium leading-relaxed text-slate-800">
              {item.scenario}
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 block">Select the correct answer:</span>
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
                      disabled={showResults || hasSubmittedToday}
                      className={`w-full text-left p-4 rounded-2xl border text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
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
                <strong>💡 Clinical Rationale:</strong>
                <p>{item.explanation}</p>
              </div>
            )}
          </div>
        ))}

        {!showResults ? (
          <form onSubmit={handleSubmitAnswers} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-center">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 font-medium">
              🔒 Connected as: <strong className="text-[#630517]">{studentName || 'مستخدم مسجل'}</strong> (Phone: <span dir="ltr">{studentPhone || '---'}</span>)
              <p className="text-[10px] text-slate-400 mt-1">Your submission will be recorded automatically with your profile credentials and timestamp.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#630517] text-[#F5D061] py-4 rounded-2xl font-black text-sm shadow-xl hover:brightness-110 transition-all cursor-pointer"
            >
              {submitting ? 'Submitting...' : 'Submit Answers & Save Score 🎯'}
            </button>
          </form>
        ) : (
          <div className="bg-emerald-50 border-2 border-emerald-300 p-6 rounded-3xl space-y-3 text-center">
            <h3 className="text-xl font-black text-emerald-900">Your Score: {calculateScore()} / {activeCases.length} Correct! 🎉</h3>
            <p className="text-xs text-emerald-700 font-medium">
              Thank you for participating. Your response has been linked to your profile and recorded in the admin dashboard successfully.
            </p>
            <div className="bg-white/80 p-3 rounded-2xl border border-emerald-200 text-xs text-slate-700 font-bold">
              ⏳ Next daily rotation available after: <span className="text-[#630517]">{timeLeft}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}