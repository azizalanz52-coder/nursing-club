'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  phone: string;
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
    title: 'Hypoglycemia on the Ward',
    scenario: 'A 54-year-old man with type 2 diabetes is pale, sweaty, and confused. Capillary blood glucose is 52 mg/dL (2.9 mmol/L) and he can still swallow. What is the priority nursing action?',
    options: [
      'Give 15 g of fast-acting carbohydrate now, recheck glucose in 15 minutes, and stay with him',
      'Leave him to sleep it off because night-time low readings are expected on insulin',
      'Give a long-acting insulin dose to stabilize the blood sugar',
      'Start a high-protein meal first and delay glucose until after breakfast'
    ],
    correctIndex: 0,
    explanation: 'Conscious hypoglycemia is treated with a rapid carbohydrate source, then reassessment. Insulin would worsen the drop. The nurse stays with the patient until the glucose rises and he is safe.'
  },
  {
    difficulty: 'Easy',
    title: 'Saturated Postoperative Dressing',
    scenario: 'Two hours after abdominal surgery the dressing is soaked with bright red blood, the patient’s heart rate is 118, and blood pressure is 92/58 mmHg. What should the nurse do first?',
    options: [
      'Remove the dressing completely to inspect the whole wound in the corridor',
      'Apply firm pressure, reinforce the dressing, keep the patient supine, and call the surgical team now',
      'Walk the patient to the bathroom so gravity reduces bleeding',
      'Wait for the next scheduled vital-sign round before reporting'
    ],
    correctIndex: 1,
    explanation: 'Fresh bleeding with tachycardia and hypotension is hemorrhage until proven otherwise. Reinforce, protect circulation, and notify the surgeon. Do not delay or fully uncover an actively bleeding wound without help.'
  },
  {
    difficulty: 'Easy',
    title: 'Fall Risk in a Confused Older Adult',
    scenario: 'An 82-year-old with delirium tries to climb over the bed rails at night. Which nursing action best prevents injury?',
    options: [
      'Raise all four side rails and leave him alone so he learns to stay in bed',
      'Place the bed in the lowest position, keep the call bell in reach, stay close, and use a sitter or frequent rounding',
      'Tie his wrists loosely to the bed frame until morning',
      'Turn off the room light completely so he sleeps more deeply'
    ],
    correctIndex: 1,
    explanation: 'Low bed, supervision, and a clear call system reduce falls. All four rails and restraints increase injury and are not first-line. Darkness worsens confusion.'
  },
  {
    difficulty: 'Easy',
    title: 'Anaphylaxis After IV Antibiotic',
    scenario: 'Minutes after starting IV ceftriaxone a patient develops wheeze, facial swelling, and blood pressure 80/50 mmHg. What is the immediate nursing action?',
    options: [
      'Stop the infusion, call for help, maintain the airway, and prepare intramuscular epinephrine as ordered',
      'Slow the infusion rate and watch for 30 minutes before calling anyone',
      'Give an oral antihistamine only and continue the antibiotic',
      'Sit the patient upright and send a family member to the pharmacy'
    ],
    correctIndex: 0,
    explanation: 'Anaphylaxis needs the drug stopped at once, airway support, and epinephrine. Slowing the infusion or relying on an antihistamine alone is unsafe.'
  },
  {
    difficulty: 'Moderate',
    title: 'Chest Pain Suggesting ACS',
    scenario: 'A 61-year-old man has crushing substernal pain radiating to the left arm, diaphoresis, and nausea. He is on the medical ward. What is the priority nursing sequence?',
    options: [
      'Give a large meal first because indigestion is the most likely cause',
      'Let him walk to radiology without a wheelchair to save time',
      'Keep him at rest, apply oxygen if hypoxic, obtain a 12-lead ECG, and notify the physician immediately',
      'Start a vigorous chest-wall massage to relieve muscle spasm'
    ],
    correctIndex: 2,
    explanation: 'Suspected acute coronary syndrome: rest, ECG, oxygen if needed, and rapid medical review. Walking or assuming indigestion delays reperfusion.'
  },
  {
    difficulty: 'Moderate',
    title: 'Heart Failure Fluid Overload',
    scenario: 'A patient with chronic heart failure has new orthopnea, 2 kg gain in two days, and crackles in both bases. Which nursing action is most appropriate first?',
    options: [
      'Encourage extra oral fluids to thin pulmonary secretions',
      'Lay the patient flat to improve venous return',
      'Sit the patient upright, monitor oxygen saturation, restrict fluids as ordered, and report the change',
      'Stop the prescribed diuretic until the crackles disappear'
    ],
    correctIndex: 2,
    explanation: 'Upright position, oxygenation, fluid restriction, and prompt reporting are standard for decompensated heart failure. Flat position and extra fluids worsen overload.'
  },
  {
    difficulty: 'Moderate',
    title: 'Suicide Safety Statement',
    scenario: 'A 28-year-old admitted with depression says, “Everyone would be better if I went to sleep forever.” What is the immediate priority nursing action?',
    options: [
      'Change the subject to lift the mood and leave the room',
      'Ask directly about suicidal thoughts and plan, stay with the patient, and start continuous observation',
      'Tell the patient not to say things like that because it upsets the staff',
      'Document the sentence and reassess only on the next shift'
    ],
    correctIndex: 1,
    explanation: 'Direct suicide inquiry and 1-to-1 safety are mandatory after a statement of hopelessness with possible intent. Delay or argument increases risk.'
  },
  {
    difficulty: 'Moderate',
    title: 'Blood Transfusion Reaction',
    scenario: 'Ten minutes into a packed red-cell transfusion the patient has chills, back pain, and a temperature rise of 1.5°C. What should the nurse do first?',
    options: [
      'Stop the transfusion, keep the IV line open with normal saline, and notify the physician and blood bank',
      'Slow the rate and cover the patient with extra blankets',
      'Add another unit of blood to finish faster',
      'Give the remaining blood because mild chills are expected'
    ],
    correctIndex: 0,
    explanation: 'Any suspected transfusion reaction: stop the blood, maintain IV access with saline, and alert the team and blood bank. Continuing the unit can worsen hemolysis.'
  },
  {
    difficulty: 'Hard',
    title: 'Early Sepsis Recognition',
    scenario: 'A postoperative patient is restless, hypotensive (86/54), tachycardic (124), febrile, and has decreased urine output. What is the priority nursing action?',
    options: [
      'Encourage ambulation in the corridor to raise the blood pressure',
      'Recognize possible sepsis, give oxygen as needed, obtain cultures if ordered, and escalate for rapid fluids and antibiotics',
      'Wait for the next routine lab draw tomorrow morning',
      'Give a sedative so the restlessness settles before calling the physician'
    ],
    correctIndex: 1,
    explanation: 'Hypotension, tachycardia, fever, and oliguria after surgery suggest sepsis. Early escalation, cultures, fluids, and antibiotics save lives. Sedation or delay hides shock.'
  },
  {
    difficulty: 'Hard',
    title: 'Hyperkalemia with ECG Changes',
    scenario: 'A patient with acute kidney injury has potassium 6.8 mEq/L and peaked T waves. What is the critical nursing response?',
    options: [
      'Give a banana smoothie to replace electrolytes',
      'Place on cardiac monitoring, notify the physician immediately, and prepare ordered emergency treatments such as calcium or insulin-glucose',
      'Send the patient for an unsupervised walk to lower potassium through exercise',
      'Hold all monitoring because lab error is more likely than true hyperkalemia'
    ],
    correctIndex: 1,
    explanation: 'Severe hyperkalemia with ECG changes is a cardiac emergency. Monitor, call the team, and prepare membrane-stabilizing and shifting therapy. Do not add potassium.'
  },
  {
    difficulty: 'Hard',
    title: 'Magnesium Sulfate Toxicity',
    scenario: 'A woman on magnesium sulfate for preeclampsia has absent deep tendon reflexes, respiratory rate 10/min, and slurred speech. What should the nurse do?',
    options: [
      'Increase the magnesium infusion to prevent a seizure',
      'Stop the infusion, support the airway, notify the physician, and prepare calcium gluconate as the antidote',
      'Encourage her to walk to the bathroom unassisted',
      'Give an extra oral magnesium tablet'
    ],
    correctIndex: 1,
    explanation: 'Loss of reflexes and respiratory depression mean magnesium toxicity. Stop the drug, protect breathing, and give calcium gluconate as ordered.'
  },
  {
    difficulty: 'Hard',
    title: 'Rising Intracranial Pressure',
    scenario: 'After a head injury a patient becomes drowsy, has a new unequal pupil, and vomits without nausea. What is the safest nursing action?',
    options: [
      'Sit him forward and let him sleep without observation',
      'Keep the head of bed elevated as ordered, avoid clustering painful care, and report possible rising ICP immediately',
      'Give a large hypotonic fluid bolus to improve cerebral perfusion',
      'Ask the family to shake him until he answers questions'
    ],
    correctIndex: 1,
    explanation: 'Decreasing consciousness, pupillary change, and projectile vomiting are ICP warning signs. Elevate the head, reduce stimulation, and escalate. Hypotonic fluids and shaking worsen injury.'
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
  const myLeaderboardRowRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!showLeaderboardModal) return;
    const timer = window.setTimeout(() => {
      myLeaderboardRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [showLeaderboardModal, leaderboard]);

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
        phone: canonicalPhone(row.phone),
      }));

      list.sort((a, b) => b.totalScore - a.totalScore);
      setLeaderboard(list);
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
    const myPhone = canonicalPhone(studentPhone);
    const rank = leaderboard.findIndex((item) => (
      (myPhone && item.phone === myPhone) || item.studentName === studentName.trim()
    )) + 1;
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
    <main className="min-h-screen bg-[#F6F0E8] text-slate-900 pb-20 relative" dir="ltr">
      <div className="bg-gradient-to-r from-[#3a020c] via-[#630517] to-[#4A030F] text-white py-12 px-4 sm:px-6 shadow-xl border-b-4 border-[#F5D061]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 bg-[#F5D061] text-[#630517] font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              <span>⚡ Daily Clinical Challenge</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Clinical Case Study Challenge
            </h1>
            <div className="bg-black/20 border border-[#F5D061]/30 px-4 py-2 rounded-2xl text-xs sm:text-sm text-amber-50 font-medium inline-block" dir="rtl">
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
            className="flex items-center gap-2 bg-[#F5D061] text-[#630517] px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 border border-white/20"
          >
            <span className="text-lg">🏆</span>
            <span>لوحة الصدارة</span>
          </button>
        </div>
      </div>

      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-200 text-right" dir="rtl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 gap-3">
              <div>
                <h3 className="text-xl font-black text-[#630517] flex items-center gap-2">
                  <span>🏆</span> لوحة صدارة دراسة الحالة
                </h3>
                <p className="text-[11px] font-bold text-slate-500 mt-1">كل المشاركين: {leaderboard.length}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pl-1">
              {leaderboard.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8 font-medium">لا توجد سجلات صدارة حتى الآن، كن أول المشاركين!</p>
              ) : (
                leaderboard.map((item, idx) => {
                  const myPhone = canonicalPhone(studentPhone);
                  const isMe = Boolean(
                    (myPhone && item.phone === myPhone) ||
                    (!myPhone && studentName.trim() && item.studentName === studentName.trim())
                  );
                  return (
                    <div
                      key={item.phone || `${item.studentName}-${idx}`}
                      ref={isMe ? myLeaderboardRowRef : undefined}
                      className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold ${
                        isMe
                          ? 'bg-[#630517] text-white border-2 border-[#F5D061] shadow-md'
                          : 'bg-[#630517]/5 border border-[#630517]/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                          isMe ? 'bg-[#F5D061] text-[#630517]' :
                          idx === 0 ? 'bg-amber-400 text-slate-900 shadow-sm' :
                          idx === 1 ? 'bg-slate-300 text-slate-800' :
                          idx === 2 ? 'bg-amber-700 text-white' : 'bg-[#F5D061]/40 text-[#630517]'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className={isMe ? 'text-white' : 'text-slate-800 truncate'}>{item.studentName}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
                        isMe ? 'bg-[#F5D061] text-[#630517]' : 'bg-[#630517] text-[#F5D061]'
                      }`}>
                        ⭐ {item.totalScore} نقطة
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowLeaderboardModal(false)}
              className="w-full py-3 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-xs shadow-md cursor-pointer hover:brightness-110"
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
            <div key={item.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#630517]/15 shadow-sm space-y-6 relative overflow-hidden">
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
                <span className="font-black text-[#630517] text-base flex items-center gap-2">
                  <span>🩺</span> {item.title}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  item.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                  item.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  Level: {item.difficulty}
                </span>
              </div>

              <div className="bg-[#630517]/5 p-4 rounded-2xl border border-[#630517]/10 text-sm font-medium leading-relaxed text-slate-800">
                {item.scenario}
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 block">Select the correct evidence-based nursing action:</span>
                <div className="grid grid-cols-1 gap-2.5">
                  {item.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[item.id] === optIdx;
                    const isCorrect = optIdx === item.correctIndex;

                    let btnStyle = 'bg-white border-slate-200 hover:bg-amber-50 text-slate-800';
                    if (showResults) {
                      if (isCorrect) btnStyle = 'bg-[#630517] text-[#F5D061] border-[#4A030F] font-bold';
                      else if (isSelected && !isCorrect) btnStyle = 'bg-rose-700 text-white border-rose-800 font-bold';
                    } else if (isSelected) {
                      btnStyle = 'bg-[#630517] text-white border-[#630517] font-bold shadow-md';
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
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-stone-800 space-y-1">
                  <strong className="text-[#630517]">💡 Clinical Rationale:</strong>
                  <p className="leading-relaxed">{item.explanation}</p>
                </div>
              )}
            </div>
          );
        })}

        {!showResults ? (
          <form onSubmit={handleSubmitAnswers} className="bg-white p-6 rounded-3xl border border-[#630517]/15 shadow-sm space-y-4 text-center">
            <div className="p-4 bg-[#630517]/5 rounded-2xl border border-[#630517]/10 text-xs text-slate-700 font-medium">
              🔒 Connected Profile: <strong className="text-[#630517]">{studentName || 'مستخدم مسجل'}</strong> (Phone: <span dir="ltr">{studentPhone || '---'}</span>)
              <p className="text-[10px] text-slate-400 mt-1">Your response will be recorded on the clinical case-study leaderboard.</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#630517] text-[#F5D061] py-4 rounded-2xl font-black text-sm shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer border border-white/20"
            >
              {submitting ? 'Submitting...' : 'Submit Answers & Save Score 🩺'}
            </button>
          </form>
        ) : (
          <div className="bg-amber-50 border-2 border-[#F5D061] p-6 rounded-3xl space-y-3 text-center">
            <h3 className="text-xl font-black text-[#630517]">Your Score: {calculateScore() + persistenceBonus} / {getMaxPossibleScore() + persistenceBonus} Points! 🎉</h3>
            {persistenceBonus > 0 ? (
              <p className="text-sm text-[#630517] font-black bg-white/80 border border-[#F5D061] rounded-2xl px-4 py-3">
                🌸 شكراً لاستمراريتك معنا طول الأسبوع في الحل
              </p>
            ) : null}
            {revealedBonus ? (
              <p className="text-xs text-amber-800 font-bold">ظهر بونص مفاجئ بعد التسليم على الحالة {revealedBonus.questionId}.</p>
            ) : (
              <p className="text-xs text-stone-600 font-medium">ما ظهر بونص اليوم على نتيجتك. المنافسة تشتد في التحديات القادمة.</p>
            )}
            <p className="text-xs text-stone-600 font-medium">
              شكراً لمشاركتك في دراسة الحالة. تم تسجيل إجابتك وتحديث نقاطك بنجاح.
            </p>
            <div className="bg-white/80 p-3 rounded-2xl border border-[#F5D061]/50 text-xs text-slate-700 font-bold" dir="rtl">
              ⏱️ <span>التحدي اليومي القادم متاح بعد: </span>
              <span className="text-[#630517] font-black">{timeLeft}</span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
