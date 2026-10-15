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

const masterCasePool: Omit<CaseQuestion, 'id'>[] = [
  {
    difficulty: 'Easy',
    title: 'Case 1: Breast Cancer Warning Signs & Early Detection',
    scenario: 'A 34-year-old woman attends a Pink October booth and says she noticed a painless, hard lump in the upper outer quadrant of her left breast two weeks ago. She has no family history of cancer and feels well. What is the priority nursing action?',
    options: [
      'Reassure her that painless lumps in young women are almost always benign and need no follow-up',
      'Advise urgent clinical breast assessment and referral for diagnostic imaging rather than waiting for the lump to disappear',
      'Teach her to squeeze the lump daily to see if it reduces in size',
      'Start her on antibiotics for presumed mastitis without examination'
    ],
    correctIndexString: 'Advise urgent clinical breast assessment and referral for diagnostic imaging rather than waiting for the lump to disappear',
    explanation: 'A new, painless, hard breast lump is a classic warning sign. Nurses must never delay assessment. Early referral for clinical exam and imaging (ultrasound/mammography as indicated) is the evidence-based first step in Pink October screening.'
  } as any,
  {
    difficulty: 'Easy',
    title: 'Case 2: Breast Self-Awareness Health Teaching',
    scenario: 'During a student awareness campaign, a participant asks when and how she should check her breasts. She has regular menstrual cycles. What is the most accurate nursing teaching?',
    options: [
      'Examine the breasts only once a year on her birthday',
      'Become familiar with how her breasts normally look and feel, and report any new change promptly; the best time is a few days after menstruation ends',
      'Perform vigorous daily squeezing of breast tissue to detect cancer earlier',
      'Breast awareness is unnecessary before the age of 50'
    ],
    correctIndexString: 'Become familiar with how her breasts normally look and feel, and report any new change promptly; the best time is a few days after menstruation ends',
    explanation: 'Modern guidance emphasizes breast awareness, not aggressive daily self-exam. Knowing baseline appearance and reporting new changes (lump, skin dimpling, nipple discharge, inversion) is key. After menses, hormonal swelling is lowest, so changes are easier to notice.'
  } as any,
  {
    difficulty: 'Moderate',
    title: 'Case 3: Post-Mastectomy Lymphedema Precautions',
    scenario: 'A woman is 48 hours after left modified radical mastectomy with axillary lymph node dissection. The nurse prepares discharge teaching. Which instruction is essential to reduce lymphedema risk?',
    options: [
      'Measure blood pressure and perform venipuncture on the left (operative) arm because it is closer to the wound',
      'Avoid blood pressure cuffs, injections, and tight jewelry on the affected arm; elevate the arm and start gentle range-of-motion as prescribed',
      'Keep the affected arm in a dependent position at all times to improve drainage',
      'Apply ice packs tightly around the axilla for 24 hours to prevent swelling'
    ],
    correctIndexString: 'Avoid blood pressure cuffs, injections, and tight jewelry on the affected arm; elevate the arm and start gentle range-of-motion as prescribed',
    explanation: 'After axillary dissection, the affected arm is at high risk of lymphedema. Nursing care protects that arm from constriction and trauma, elevates it, and encourages prescribed early mobility without strain.'
  } as any,
  {
    difficulty: 'Moderate',
    title: 'Case 4: Chemotherapy Neutropenia & Infection Prevention',
    scenario: 'A patient receiving doxorubicin-based chemotherapy for breast cancer has an absolute neutrophil count of 800/mm³ and a temperature of 38.4°C. What is the priority nursing action?',
    options: [
      'Encourage large gatherings of visitors to improve her mood',
      'Treat this as a potential oncologic emergency: isolate from infection sources, notify the physician, obtain cultures as ordered, and prepare for prompt antibiotics',
      'Give an antipyretic only and discharge her because low-grade fever is expected',
      'Start high-dose iron supplements to raise the neutrophil count'
    ],
    correctIndexString: 'Treat this as a potential oncologic emergency: isolate from infection sources, notify the physician, obtain cultures as ordered, and prepare for prompt antibiotics',
    explanation: 'Neutropenic fever in a chemotherapy patient is an emergency. Rapid assessment, protective isolation, cultures, and timely antibiotics reduce sepsis risk. Social crowding is contraindicated.'
  } as any,
  {
    difficulty: 'Hard',
    title: 'Case 5: Tamoxifen Education & Thromboembolic Warning',
    scenario: 'A premenopausal woman with estrogen-receptor-positive breast cancer is started on tamoxifen. She calls the clinic reporting sudden left-calf pain, swelling, and mild shortness of breath. What is the critical nursing response?',
    options: [
      'Tell her to walk more because tamoxifen-related leg pain is always musculoskeletal',
      'Advise her to double the next tamoxifen dose to reduce inflammation',
      'Recognize possible deep-vein thrombosis/pulmonary embolism: instruct her to seek emergency care immediately and hold tamoxifen until evaluated',
      'Apply a heating pad and schedule a routine follow-up in two weeks'
    ],
    correctIndexString: 'Recognize possible deep-vein thrombosis/pulmonary embolism: instruct her to seek emergency care immediately and hold tamoxifen until evaluated',
    explanation: 'Tamoxifen increases venous thromboembolism risk. Sudden unilateral calf pain plus dyspnea requires emergency evaluation for DVT/PE. The nurse must not delay care or continue the drug until a physician assesses her.'
  } as any,
  {
    difficulty: 'Hard',
    title: 'Case 6: Psychosocial Support After Breast Cancer Diagnosis',
    scenario: 'A newly diagnosed patient refuses to look at her surgical site, says "I am no longer a woman," and withdraws from her family. Which nursing approach is most therapeutic?',
    options: [
      'Tell her she should feel lucky because many women die from delayed diagnosis',
      'Force her to view the incision immediately to speed acceptance',
      'Sit with her, acknowledge grief and body-image loss, assess for depression, and offer counseling/support-group referral without rushing her',
      'Leave her alone for several days so she can adjust without nursing presence'
    ],
    correctIndexString: 'Sit with her, acknowledge grief and body-image loss, assess for depression, and offer counseling/support-group referral without rushing her',
    explanation: 'Body-image disturbance and grief are expected after mastectomy. Therapeutic nursing presence, validation, suicide/depression screening, and referral to psycho-oncology or support groups are evidence-based. Forcing confrontation or minimizing feelings harms trust.'
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
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-slate-50 text-slate-900 pb-20 relative" dir="ltr">
      
      <div className="bg-gradient-to-r from-[#9d174d] via-[#be185d] to-[#f472b6] text-white py-12 px-4 sm:px-6 shadow-xl border-b-4 border-pink-200">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 bg-white text-[#9d174d] font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              <span>🎀 Pink October • Breast Cancer Awareness</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Breast Cancer Nursing Challenge
            </h1>
            <div className="bg-pink-950/30 border border-white/25 px-4 py-2 rounded-2xl text-xs sm:text-sm text-pink-50 font-medium inline-block" dir="rtl">
              ⏱️ <span>يتجدد التحدي اليومي بعد: </span>
              <strong className="text-white font-black px-1">{timeLeft || 'جاري التحديث...'}</strong>
            </div>
            <div>
              <Link href="/" className="text-xs text-pink-100 hover:underline font-bold inline-block pt-1">
                ← Back to Home | العودة للرئيسية
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLeaderboardModal(true)}
            className="flex items-center gap-2 bg-white text-[#9d174d] px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 border border-pink-100"
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
              <h3 className="text-xl font-black text-[#9d174d] flex items-center gap-2">
                <span>🏆</span> لوحة صدارة أسبوع سرطان الثدي
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
                  <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-pink-50/70 border border-pink-100 text-xs font-bold">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                        idx === 0 ? 'bg-amber-400 text-slate-900 shadow-sm' :
                        idx === 1 ? 'bg-slate-300 text-slate-800' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-pink-200 text-pink-900'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-slate-800">{item.studentName}</span>
                    </div>
                    <span className="bg-[#be185d] text-white px-3 py-1 rounded-full text-xs font-mono font-bold">
                      ⭐ {item.totalScore} نقطة
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowLeaderboardModal(false)}
              className="w-full py-3 rounded-2xl bg-[#9d174d] text-white font-black text-xs shadow-md cursor-pointer hover:brightness-110"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* قائمة الأسماء والحالات الإكلينيكية */}
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8" dir="ltr">
        {activeCases.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100 shadow-sm space-y-6 relative overflow-hidden">
            
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
              <span className="font-black text-[#9d174d] text-base flex items-center gap-2">
                <span>🎀</span> {item.title}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                item.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' : 
                item.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                Level: {item.difficulty}
              </span>
            </div>

            <div className="bg-pink-50/70 p-4 rounded-2xl border border-pink-100 text-sm font-medium leading-relaxed text-slate-800">
              {item.scenario}
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 block">Select the correct evidence-based nursing action:</span>
              <div className="grid grid-cols-1 gap-2.5">
                {item.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[item.id] === optIdx;
                  const isCorrect = optIdx === item.correctIndex;

                  let btnStyle = 'bg-white border-slate-200 hover:bg-pink-50 text-slate-800';
                  if (showResults) {
                    if (isCorrect) btnStyle = 'bg-pink-600 text-white border-pink-700 font-bold';
                    else if (isSelected && !isCorrect) btnStyle = 'bg-rose-700 text-white border-rose-800 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'bg-[#9d174d] text-white border-[#9d174d] font-bold shadow-md';
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
              <div className="p-4 rounded-2xl bg-pink-50 border border-pink-200 text-xs text-pink-950 space-y-1">
                <strong className="text-[#9d174d]">💡 Breast Cancer Clinical Rationale:</strong>
                <p className="leading-relaxed">{item.explanation}</p>
              </div>
            )}
          </div>
        ))}

        {!showResults ? (
          <form onSubmit={handleSubmitAnswers} className="bg-white p-6 rounded-3xl border border-pink-100 shadow-sm space-y-4 text-center">
            <div className="p-4 bg-pink-50/70 rounded-2xl border border-pink-100 text-xs text-slate-700 font-medium">
              🔒 Connected Profile: <strong className="text-[#9d174d]">{studentName || 'مستخدم مسجل'}</strong> (Phone: <span dir="ltr">{studentPhone || '---'}</span>)
              <p className="text-[10px] text-slate-400 mt-1">Your response will be recorded for Pink October Breast Cancer Leaderboard.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#9d174d] to-[#f472b6] text-white py-4 rounded-2xl font-black text-sm shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer border border-white/20"
            >
              {submitting ? 'Submitting...' : 'Submit Answers & Save Pink October Score 🎀'}
            </button>
          </form>
        ) : (
          <div className="bg-pink-50 border-2 border-pink-300 p-6 rounded-3xl space-y-3 text-center">
            <h3 className="text-xl font-black text-pink-900">Your Score: {calculateScore()} / {getMaxPossibleScore()} Points! 🎉</h3>
            <p className="text-xs text-pink-800 font-medium">
              شكراً لمشاركتك في أسبوع التوعية بسرطان الثدي. تم تسجيل إجابتك وتحديث نقاطك بنجاح.
            </p>
            <div className="bg-white/80 p-3 rounded-2xl border border-pink-200 text-xs text-slate-700 font-bold" dir="rtl">
              ⏱️ <span>التحدي اليومي القادم متاح بعد: </span>
              <span className="text-[#9d174d] font-black">{timeLeft}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}