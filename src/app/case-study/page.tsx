'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from './../lib/firebase';
import { collection, addDoc, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { canonicalPhone, phoneVariants } from '../lib/certificatesLookup';
import { loadCaseSubmissions, persistenceForSubmit, personPhone, riyadhParts, submissionDayKey } from '../lib/caseStudy';

interface CaseQuestion {
  id: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  title: string;
  scenario: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface CaseDraft {
  difficulty: CaseQuestion['difficulty'];
  title: string;
  scenario: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

interface LeaderboardItem {
  studentName: string;
  totalScore: number;
}

interface RevealedBonus {
  questionId: number;
  amount: number;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], rng: () => number) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function dailySeed(now = new Date()) {
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  return now.getFullYear() * 1000 + dayOfYear;
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function bonusAmountForRank(rank: number, rng: () => number) {
  if (rank > 0 && rank <= 3) {
    return rng() < 0.16 ? 1 : 0;
  }
  if (rank > 0 && rank <= 10) {
    return rng() < 0.34 ? 1 : 0;
  }
  const roll = rng();
  if (roll < 0.28) return 2;
  if (roll < 0.62) return 1;
  return 0;
}

const masterCasePool: CaseDraft[] = [
  {
    difficulty: 'Easy',
    title: 'New Breast Lump at a Pink October Booth',
    scenario: 'A 34-year-old woman reports a painless, hard lump in the upper outer quadrant of her left breast for two weeks. She feels well and has no family history of cancer. What is the priority nursing action?',
    options: [
      'Reassure her that painless lumps in young women are usually harmless and need no follow-up',
      'Advise clinical breast assessment and referral for diagnostic imaging without waiting for the lump to vanish',
      'Ask her to massage the lump daily and return only if it becomes painful',
      'Start oral antibiotics for presumed mastitis because she is young and otherwise healthy'
    ],
    correctIndex: 1,
    explanation: 'A new, painless, hard breast lump is a warning sign at any age. The nurse must not delay assessment. Clinical exam and imaging (ultrasound or mammography as indicated) are the first evidence-based steps.'
  },
  {
    difficulty: 'Easy',
    title: 'Breast Awareness Health Teaching',
    scenario: 'During a student campaign, a woman with regular cycles asks when and how she should check her breasts. What is the most accurate nursing teaching?',
    options: [
      'Examine the breasts only once a year on her birthday, even if a new change appears earlier',
      'Squeeze breast tissue firmly every morning because aggressive self-exam finds cancer sooner',
      'Know how her breasts normally look and feel, and report any new change; a few days after menses is often easiest',
      'Skip breast awareness until age 50 because screening is not useful in younger women'
    ],
    correctIndex: 2,
    explanation: 'Guidance emphasizes breast awareness, not harsh daily squeezing. Knowing the baseline and reporting new changes (lump, dimpling, nipple discharge, inversion) is key. After menses, swelling is lower, so changes are easier to notice.'
  },
  {
    difficulty: 'Easy',
    title: 'Inflammatory Breast Changes vs Infection',
    scenario: 'A 46-year-old woman has rapidly worsening redness, warmth, and peau d’orange swelling of the whole breast, with little pain and no fever. A week of antibiotics did not help. What should the nurse do first?',
    options: [
      'Continue the same antibiotic for another two weeks because cellulitis can be slow to clear',
      'Teach warm compresses and tight bras until the redness fades on its own',
      'Reassure her that peau d’orange is a normal skin reaction to humidity',
      'Flag possible inflammatory breast cancer, stop assuming simple infection, and urge urgent specialist review'
    ],
    correctIndex: 3,
    explanation: 'Rapid whole-breast redness, peau d’orange, and failure of antibiotics raise concern for inflammatory breast cancer. The nurse should not keep treating this as routine mastitis. Urgent clinical and oncologic assessment is required.'
  },
  {
    difficulty: 'Moderate',
    title: 'Post-Mastectomy Lymphedema Precautions',
    scenario: 'A woman is 48 hours after left modified radical mastectomy with axillary lymph node dissection. Which discharge instruction best reduces lymphedema risk?',
    options: [
      'Avoid blood pressure cuffs, injections, and tight jewelry on the affected arm; elevate it and start prescribed gentle range-of-motion',
      'Measure blood pressure and draw blood from the operative arm because it is closer to the dressing',
      'Keep the affected arm hanging down at all times so fluid drains toward the fingers',
      'Wrap ice packs tightly around the axilla for 24 hours to prevent any arm movement'
    ],
    correctIndex: 0,
    explanation: 'After axillary dissection the affected arm is at high lymphedema risk. Protect it from constriction and trauma, elevate it, and use prescribed early mobility. Venipuncture or BP on that arm is avoided when possible.'
  },
  {
    difficulty: 'Moderate',
    title: 'Chemotherapy Neutropenia and Fever',
    scenario: 'A patient on doxorubicin-based chemotherapy for breast cancer has an absolute neutrophil count of 800/mm³ and a temperature of 38.4°C. What is the priority nursing action?',
    options: [
      'Encourage a large family gathering to lift her mood while she waits for the next clinic slot',
      'Give an antipyretic only and send her home because low-grade fever is expected after chemotherapy',
      'Treat this as a possible oncologic emergency: limit infection exposure, notify the physician, and prepare for cultures and prompt antibiotics',
      'Start high-dose iron tablets to raise the neutrophil count before calling the team'
    ],
    correctIndex: 2,
    explanation: 'Neutropenic fever is an emergency. Rapid assessment, protective isolation, cultures, and timely antibiotics reduce sepsis risk. Crowds, delay, or treating fever as “normal” after chemo are unsafe.'
  },
  {
    difficulty: 'Moderate',
    title: 'Mammography Counseling After Pink October Screening',
    scenario: 'A 52-year-old woman is anxious after a screening mammogram recall. The nurse explains the next step. Which statement is most accurate?',
    options: [
      'A recall always means cancer, so she should book mastectomy counseling today',
      'She should ignore the letter if she has no symptoms, because screening recalls are usually computer errors',
      'She must stop all breast self-awareness until the repeat images are done',
      'A recall is common and needs extra views or ultrasound; it is not a diagnosis, and keeping the appointment is the right next step'
    ],
    correctIndex: 3,
    explanation: 'Many women are recalled for extra images. That is not a cancer diagnosis. The nurse reduces panic, explains the process, and stresses attending the follow-up rather than assuming the worst or ignoring the letter.'
  },
  {
    difficulty: 'Hard',
    title: 'Tamoxifen and Thromboembolic Warning',
    scenario: 'A premenopausal woman with estrogen-receptor-positive breast cancer is on tamoxifen. She reports sudden left-calf pain, swelling, and mild shortness of breath. What is the critical nursing response?',
    options: [
      'Tell her to walk more because tamoxifen-related leg pain is always a muscle strain',
      'Recognize possible DVT or pulmonary embolism: send her for emergency care now and hold tamoxifen until she is evaluated',
      'Advise her to double tonight’s dose to reduce inflammation in the calf',
      'Apply a heating pad and book a routine review in two weeks if the swelling remains'
    ],
    correctIndex: 1,
    explanation: 'Tamoxifen raises venous thromboembolism risk. Sudden unilateral calf pain with dyspnea needs emergency evaluation for DVT/PE. Do not delay care or continue the drug until a physician assesses her.'
  },
  {
    difficulty: 'Hard',
    title: 'Trastuzumab and Cardiac Warning Signs',
    scenario: 'A woman receiving trastuzumab for HER2-positive breast cancer reports new exertional dyspnea, ankle swelling, and needing two pillows to sleep. What should the nurse do?',
    options: [
      'Hold further trastuzumab until the team reviews her, report possible cardiac toxicity, and arrange urgent assessment',
      'Reassure her that ankle swelling is expected after every infusion and send her home',
      'Give an extra diuretic from a previous prescription and continue today’s infusion as usual',
      'Increase IV fluid rate to improve circulation before the next dose'
    ],
    correctIndex: 0,
    explanation: 'Trastuzumab can cause left ventricular dysfunction. New dyspnea, edema, and orthopnea are red flags. The nurse holds the dose, notifies the team, and seeks cardiac review rather than treating this as routine infusion discomfort.'
  },
  {
    difficulty: 'Hard',
    title: 'Psychosocial Support After Mastectomy',
    scenario: 'A newly diagnosed patient refuses to look at her surgical site, says “I am no longer a woman,” and withdraws from her family. Which nursing approach is most therapeutic?',
    options: [
      'Tell her she should feel lucky because many women die from delayed diagnosis',
      'Require her to view the incision immediately so acceptance happens faster',
      'Sit with her, acknowledge grief and body-image loss, screen for depression, and offer counseling without rushing her',
      'Leave her without nursing contact for several days so she can adjust in isolation'
    ],
    correctIndex: 2,
    explanation: 'Grief and body-image disturbance are expected after mastectomy. Presence, validation, depression screening, and referral to psycho-oncology or a support group are evidence-based. Forcing confrontation or minimizing feelings harms trust.'
  },
  {
    difficulty: 'Hard',
    title: 'Paclitaxel Neuropathy During Treatment',
    scenario: 'A woman on weekly paclitaxel says her fingertips are numb, she drops cups, and night pain in her feet is worse. What is the safest nursing action?',
    options: [
      'Tell her to ignore the symptoms because neuropathy always disappears after the last cycle',
      'Advise buying tighter shoes so her feet feel more stable when she walks',
      'Give two extra tablet doses of acetaminophen and proceed with today’s full infusion unchanged',
      'Report new functional neuropathy before the infusion, hold the dose if the protocol requires it, and ask the team about dose review'
    ],
    correctIndex: 3,
    explanation: 'Progressive paclitaxel neuropathy with functional loss needs prompt reporting. Continuing a full dose without review can worsen damage. The nurse documents the change, follows hold parameters, and involves the prescriber.'
  }
];

export default function CaseStudyPage() {
  const [activeCases, setActiveCases] = useState<CaseQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [revealedBonus, setRevealedBonus] = useState<RevealedBonus | null>(null);
  const [persistenceBonus, setPersistenceBonus] = useState(0);

  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  useEffect(() => {
    const seed = dailySeed();
    const rng = mulberry32(seed);
    const pool = shuffleInPlace([...masterCasePool], rng).slice(0, 3);

    const selectedDaily = pool.map((item, index) => {
      const optionRng = mulberry32(seed + ((index + 1) * 9176));
      const optionEntries = item.options.map((text, optionIndex) => ({
        text,
        isCorrect: optionIndex === item.correctIndex,
      }));
      shuffleInPlace(optionEntries, optionRng);

      return {
        id: index + 1,
        difficulty: item.difficulty,
        title: `Case ${index + 1}: ${item.title}`,
        scenario: item.scenario,
        options: optionEntries.map((entry) => entry.text),
        correctIndex: optionEntries.findIndex((entry) => entry.isCorrect),
        explanation: item.explanation,
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

    const timer = setInterval(() => {
      const currentTime = new Date();
      const hoursLeft = 23 - currentTime.getHours();
      const minsLeft = 59 - currentTime.getMinutes();
      setTimeLeft(`${hoursLeft} ساعة و ${minsLeft} دقيقة`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'case_study_submissions')));
      const byKey: Record<string, { score: number; latestTs: number; name: string; phone: string }> = {};

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const phone = String(data.phone || data.phoneNumber || '').trim();
        const key = canonicalPhone(phone) || `name:${String(data.studentName || 'مشارك').trim()}`;
        const name = String(data.studentName || 'مشارك').trim();
        const ts = Number(data.timestamp || 0);
        if (!byKey[key]) {
          byKey[key] = { score: 0, latestTs: 0, name, phone };
        }
        byKey[key].score += Number(data.score) || 0;
        if (ts >= byKey[key].latestTs) {
          byKey[key].latestTs = ts;
          byKey[key].name = name;
          if (phone) byKey[key].phone = phone;
        }
      });

      await Promise.all(Object.values(byKey).map(async (row) => {
        if (!row.phone) return;
        for (const id of phoneVariants(row.phone)) {
          try {
            const userSnap = await getDoc(doc(db, 'users', id));
            const fullName = String(userSnap.data()?.fullName || '').trim();
            if (fullName) {
              row.name = fullName;
              return;
            }
          } catch {
            // keep submission name
          }
        }
      }));

      const list: LeaderboardItem[] = Object.values(byKey).map((row) => ({
        studentName: row.name,
        totalScore: row.score,
      }));

      list.sort((a, b) => b.totalScore - a.totalScore);
      setLeaderboard(list.slice(0, 30));
    } catch (err) {
      console.error(err);
    }
  };

  const checkIfAlreadySubmitted = async (phone: string) => {
    try {
      const list = await loadCaseSubmissions(db);
      const today = riyadhParts().ymd;
      const key = canonicalPhone(phone);
      const todayRow = list.find((row) => personPhone(row) === key && submissionDayKey(row) === today);
      if (todayRow) {
        setHasSubmittedToday(true);
        setShowResults(true);
        setPersistenceBonus(Number(todayRow.persistenceBonus || 0));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectOption = (caseId: number, optionIndex: number) => {
    if (showResults || hasSubmittedToday) return;
    setSelectedAnswers((prev) => ({ ...prev, [caseId]: optionIndex }));
  };

  const calculateScore = (bonus = revealedBonus, answers = selectedAnswers) => {
    let score = 0;
    activeCases.forEach((item) => {
      if (answers[item.id] !== item.correctIndex) return;
      score += 1;
      if (bonus && bonus.questionId === item.id) score += bonus.amount;
    });
    return score;
  };

  const getMaxPossibleScore = () => 3 + (revealedBonus?.amount || 0);

  const decideBonus = (answers: Record<number, number>) => {
    const rank = leaderboard.findIndex((item) => item.studentName === studentName.trim()) + 1;
    const rng = mulberry32(dailySeed() ^ hashSeed(`${studentPhone}|${studentName}|bonus`));
    const amount = bonusAmountForRank(rank, rng);
    if (amount <= 0) return null;

    const correctIds = activeCases
      .filter((item) => answers[item.id] === item.correctIndex)
      .map((item) => item.id);
    if (correctIds.length === 0) return null;

    const questionId = correctIds[Math.floor(rng() * correctIds.length)];
    return { questionId, amount };
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
      const bonus = decideBonus(selectedAnswers);
      const solveScore = calculateScore(bonus, selectedAnswers);
      const now = Date.now();
      const existing = await loadCaseSubmissions(db);
      const phoneKey = canonicalPhone(studentPhone) || studentPhone.trim();
      const today = riyadhParts(now).ymd;
      if (existing.some((row) => personPhone(row) === phoneKey && submissionDayKey(row) === today)) {
        setHasSubmittedToday(true);
        setShowResults(true);
        alert('تم تسجيل حل اليوم مسبقاً. الانتظار حتى يتجدد التحدي.');
        return;
      }
      const persistence = persistenceForSubmit(existing, phoneKey, now);
      const score = solveScore + persistence.amount;
      const when = new Date(now);

      await addDoc(collection(db, 'case_study_submissions'), {
        studentName: studentName.trim(),
        phone: canonicalPhone(studentPhone) || studentPhone.trim(),
        score,
        solveScore,
        total: activeCases.length,
        bonusQuestionId: bonus?.questionId || null,
        bonusAmount: bonus?.amount || 0,
        persistenceBonus: persistence.amount,
        persistenceWeek: persistence.weekKey || null,
        timestamp: now,
        createdAt: when.toISOString(),
        dateStr: when.toLocaleDateString('ar-EG', { timeZone: 'Asia/Riyadh' }),
        timeStr: when.toLocaleTimeString('ar-EG', { timeZone: 'Asia/Riyadh' }),
      });

      setRevealedBonus(bonus);
      setPersistenceBonus(persistence.amount);
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

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8" dir="ltr">
        {activeCases.map((item) => {
          const surpriseBonus = showResults && revealedBonus?.questionId === item.id ? revealedBonus : null;
          const earnedBonus = Boolean(surpriseBonus && selectedAnswers[item.id] === item.correctIndex);

          return (
            <div key={item.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-pink-100 shadow-sm space-y-6 relative overflow-hidden">
              {earnedBonus ? (
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-3 rounded-2xl shadow-md flex items-center justify-between font-extrabold text-xs" dir="rtl">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎉</span>
                    <span>بونص مفاجئ ظهر بعد تسليم إجاباتك على هذا السؤال</span>
                  </div>
                  <span className="bg-white text-amber-900 px-3 py-1 rounded-xl shadow-sm">
                    +{surpriseBonus?.amount} {surpriseBonus?.amount === 1 ? 'نقطة إضافية' : 'نقاط إضافية'}
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
          );
        })}

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
            <h3 className="text-xl font-black text-pink-900">Your Score: {calculateScore() + persistenceBonus} / {getMaxPossibleScore() + persistenceBonus} Points! 🎉</h3>
            {persistenceBonus > 0 ? (
              <p className="text-sm text-pink-900 font-black bg-white/80 border border-pink-200 rounded-2xl px-4 py-3">
                🌸 شكراً لاستمراريتك معنا طول الأسبوع في الحل
              </p>
            ) : null}
            {revealedBonus ? (
              <p className="text-xs text-amber-800 font-bold">ظهر بونص مفاجئ بعد التسليم على الحالة {revealedBonus.questionId}.</p>
            ) : (
              <p className="text-xs text-pink-800 font-medium">ما ظهر بونص اليوم على نتيجتك. المنافسة تشتد في التحديات القادمة.</p>
            )}
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
