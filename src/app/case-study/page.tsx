'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db } from './../lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { canonicalPhone, phoneVariants } from '../lib/certificatesLookup';
import {
  CASE_STUDY_DISTINGUISHED_COUNT,
  CASE_STUDY_SOLVE_MS,
  aggregateCaseLeaderboard,
  caseSolveTimerKey,
  formatRiyadhCountdown,
  formatSolveClock,
  loadCaseSubmissions,
  persistenceForSubmit,
  personPhone,
  riyadhParts,
  submissionDayKey,
} from '../lib/caseStudy';
import { syncCaseStudyDistinguished } from '../lib/distinguishedMembers';
import { ClubIcon } from '../components/icons';
import WeeklyRaceBoard, { OverallRaceBoard } from '../components/WeeklyRaceExample';
import WeeklyMechanismNotice from '../components/WeeklyMechanismNotice';
import CaseStudyTrialPoll from '../components/CaseStudyTrialPoll';
import {
  aggregateWeeklyBoard,
  decorateOverallBoard,
  type OverallBoardRow,
  type WeeklyBoardRow,
} from '../lib/caseStudyWeekly';

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

function dailySeed(ms = Date.now()) {
  const { ymd } = riyadhParts(ms);
  const [year, month, day] = ymd.split('-').map(Number);
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  const dayOfYear = Math.round((current - start) / 86400000);
  return year * 1000 + dayOfYear;
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

const DIFFICULTY_LABEL: Record<CaseQuestion['difficulty'], string> = {
  Easy: 'أساسي',
  Moderate: 'متوسط',
  Hard: 'صعب جداً',
};

const DAILY_DIFFICULTY_MIXES: Array<[CaseQuestion['difficulty'], CaseQuestion['difficulty'], CaseQuestion['difficulty']]> = [
  ['Hard', 'Hard', 'Easy'],
  ['Easy', 'Easy', 'Hard'],
  ['Hard', 'Moderate', 'Easy'],
  ['Hard', 'Hard', 'Moderate'],
  ['Easy', 'Hard', 'Moderate'],
  ['Moderate', 'Hard', 'Hard'],
  ['Hard', 'Easy', 'Hard'],
];

const masterCasePool: CaseDraft[] = [
  {
    difficulty: 'Easy',
    title: 'Hypoglycemia on the Ward',
    scenario: 'A 54-year-old man with type 2 diabetes is pale, sweaty, and confused. Capillary glucose is 52 mg/dL (2.9 mmol/L) and he can still swallow. What is the priority nursing action?',
    options: [
      'Give 15 g of rapid carbohydrate now, stay at the bedside, and recheck glucose in 15 minutes',
      'Hold oral sugar, give 50% dextrose IV first, and recheck after the next vital-sign round',
      'Give a protein snack first, then juice only if the confusion has not settled in ten minutes',
      'Give 15 g of carbohydrate now, then 4 units of regular insulin to block a rebound high',
    ],
    correctIndex: 0,
    explanation: 'If he can swallow, give 15 g of fast carbohydrate, stay with him, and recheck. IV dextrose is for when he cannot take oral sugar. Insulin or delaying carbohydrate worsens the drop.',
  },
  {
    difficulty: 'Easy',
    title: 'Saturated Postoperative Dressing',
    scenario: 'Two hours after abdominal surgery the dressing is soaked with bright red blood, heart rate is 118, and blood pressure is 92/58 mmHg. What should the nurse do first?',
    options: [
      'Remove the dressing fully to measure the bleed, then call the surgeon with the exact volume',
      'Apply firm pressure, reinforce the dressing, keep him supine, and call the surgical team now',
      'Sit him upright, reinforce the dressing, and give a fluid bolus while waiting for the next review',
      'Apply pressure for five minutes, then walk him back if the stain has not widened further',
    ],
    correctIndex: 1,
    explanation: 'Bright blood with tachycardia and hypotension is hemorrhage. Reinforce, protect circulation, and call the surgeon. Uncovering the wound, sitting him up, or delaying wastes time.',
  },
  {
    difficulty: 'Easy',
    title: 'Fall Risk in a Confused Older Adult',
    scenario: 'An 82-year-old with delirium tries to climb over the bed rails at night. Which action best prevents injury right now?',
    options: [
      'Raise three side rails, dim the lights, and check him every two hours from the nurses’ station',
      'Lower the bed, keep the call bell in reach, stay close, and arrange a sitter or frequent rounding',
      'Apply a vest restraint as a last safety step and review the order at the morning handover',
      'Give an extra night sedative now, leave the bed mid-height, and ask the family to watch from a chair',
    ],
    correctIndex: 1,
    explanation: 'Low bed, a reachable bell, and a person nearby reduce falls. Extra rails, restraints, darkness, and sedation raise injury risk in delirium.',
  },
  {
    difficulty: 'Easy',
    title: 'Anaphylaxis After IV Antibiotic',
    scenario: 'Minutes after IV ceftriaxone starts, the patient has wheeze, facial swelling, and blood pressure 80/50 mmHg. What is the immediate nursing action?',
    options: [
      'Stop the infusion, call for help, protect the airway, and prepare intramuscular epinephrine as ordered',
      'Slow the infusion, give oxygen, and prepare epinephrine only if the wheeze lasts ten minutes',
      'Stop the infusion, give IV hydrocortisone first, and keep epinephrine if the swelling grows',
      'Keep a slow antibiotic drip, give an antihistamine, and call after the next set of vitals',
    ],
    correctIndex: 0,
    explanation: 'Anaphylaxis: stop the drug, support the airway, and give epinephrine. Steroids or antihistamines do not reverse shock, and slowing the infusion wastes time.',
  },
  {
    difficulty: 'Moderate',
    title: 'Chest Pain Suggesting ACS',
    scenario: 'A 61-year-old man on the medical ward has crushing substernal pain to the left arm, sweating, and nausea. Which sequence is the priority?',
    options: [
      'Give antacid and sit him forward first, then obtain an ECG if the pain is still present',
      'Walk him to the ECG room without delay so the tracing is done before the pain fades',
      'Keep him at rest, give oxygen if hypoxic, obtain a 12-lead ECG, and notify the physician now',
      'Start GTN from the ward stock, then call the physician only if the pain score stays above 7',
    ],
    correctIndex: 2,
    explanation: 'Treat this as ACS: rest, ECG, oxygen if needed, and immediate medical review. Antacid first, walking, or unsupervised GTN delays reperfusion.',
  },
  {
    difficulty: 'Moderate',
    title: 'Heart Failure Fluid Overload',
    scenario: 'A patient with chronic heart failure has new orthopnea, 2 kg gain in two days, and crackles at both bases. What is the first nursing action?',
    options: [
      'Encourage oral fluids to thin secretions, sit him upright, and reassess after the next weight',
      'Lay him semi-flat with legs raised, give oxygen, and hold the morning diuretic until review',
      'Sit the patient upright, check oxygen saturation, keep the fluid limit, and report the change',
      'Sit him upright, give a normal saline bolus for the lowish pressure, then report if crackles worsen',
    ],
    correctIndex: 2,
    explanation: 'Sit upright, protect oxygen, keep the fluid limit, and report decompensation. Extra fluid, a flatter position, or holding the diuretic worsen overload.',
  },
  {
    difficulty: 'Moderate',
    title: 'Suicide Safety Statement',
    scenario: 'A 28-year-old admitted with depression says, “Everyone would be better if I went to sleep forever.” What is the immediate priority?',
    options: [
      'Offer a quiet room and television, then return in thirty minutes to see if the mood has settled',
      'Ask directly about suicidal thoughts and a plan, stay with the patient, and start continuous observation',
      'Ask about the plan, then leave him with a roommate while the risk form is completed at the desk',
      'Document the sentence, notify the next shift, and start 15-minute checks after handover',
    ],
    correctIndex: 1,
    explanation: 'Ask about intent and plan, stay, and keep continuous observation. A delayed check, leaving the room, or waiting for handover misses the danger.',
  },
  {
    difficulty: 'Moderate',
    title: 'Blood Transfusion Reaction',
    scenario: 'Ten minutes into packed red cells the patient has chills, back pain, and a temperature rise of 1.5°C. What should the nurse do first?',
    options: [
      'Stop the transfusion, keep the line open with normal saline, and notify the physician and blood bank',
      'Slow the transfusion, give an antipyretic, and continue the same unit if the chills begin to fade',
      'Stop the blood, keep the line open with the remaining packed cells, and call the blood bank',
      'Pause ten minutes, restart at half rate, and send a new crossmatch only if fever rises again',
    ],
    correctIndex: 0,
    explanation: 'Any suspected reaction: stop the blood, keep saline access, and alert the team and blood bank. Continuing the unit or flushing with leftover cells can worsen hemolysis.',
  },
  {
    difficulty: 'Hard',
    title: 'Early Sepsis Recognition',
    scenario: 'A postoperative patient is restless, hypotensive 86/54, tachycardic 124, febrile, and oliguric. Which action is the true priority?',
    options: [
      'Give oxygen, obtain a lactate if ordered, and wait for the next temperature before escalating antibiotics',
      'Recognize possible sepsis, give oxygen as needed, obtain cultures if ordered, and escalate for fluids and antibiotics now',
      'Treat restlessness with a light sedative, give a fluid challenge, and call if the blood pressure stays low',
      'Start oxygen, send blood cultures, and give leftover oral antibiotics until the physician arrives at rounds',
    ],
    correctIndex: 1,
    explanation: 'Fever, hypotension, tachycardia, and oliguria after surgery are sepsis until proven otherwise. Escalate now. Waiting for another temperature, sedation, or leftover oral drugs hide shock.',
  },
  {
    difficulty: 'Hard',
    title: 'Hyperkalemia with ECG Changes',
    scenario: 'A patient with acute kidney injury has potassium 6.8 mEq/L and peaked T waves. What is the critical nursing response?',
    options: [
      'Repeat the potassium first to exclude hemolysis, then start monitoring if the repeat is still high',
      'Start cardiac monitoring, notify the physician now, and prepare ordered calcium or insulin-glucose treatment',
      'Start monitoring, give sodium polystyrene now from stock, and call the physician after the next ECG',
      'Notify the physician, hold the next potassium, and wait for dialysis review before any acute treatment',
    ],
    correctIndex: 1,
    explanation: 'Peaked T waves with K 6.8 is a cardiac emergency. Monitor, call, and prepare membrane stabilization and shifting. Do not wait for a repeat, resin, or dialysis review.',
  },
  {
    difficulty: 'Hard',
    title: 'Magnesium Sulfate Toxicity',
    scenario: 'A woman on magnesium sulfate for preeclampsia has absent deep tendon reflexes, respiratory rate 10/min, and slurred speech. What should the nurse do?',
    options: [
      'Reduce the magnesium rate by half, give oxygen, and call if the respiratory rate falls below 8',
      'Stop the infusion, support the airway, notify the physician, and prepare calcium gluconate as the antidote',
      'Stop the infusion, give calcium gluconate, then restart magnesium at a lower rate to prevent a seizure',
      'Keep the infusion, stimulate the reflexes, and prepare calcium gluconate only if oxygen saturation drops',
    ],
    correctIndex: 1,
    explanation: 'Lost reflexes plus slow breathing is magnesium toxicity. Stop the infusion, protect the airway, and give calcium gluconate as ordered. Do not restart or merely reduce the rate.',
  },
  {
    difficulty: 'Hard',
    title: 'Rising Intracranial Pressure',
    scenario: 'After a head injury the patient becomes drowsy, has a new unequal pupil, and vomits without nausea. What is the safest nursing action?',
    options: [
      'Lay him flat to raise cerebral perfusion, avoid extra stimulation, and report the pupil change at the next round',
      'Keep the head of bed elevated as ordered, avoid clustering painful care, and report rising ICP now',
      'Elevate the head, cluster a full neuro exam with suction now, and call if the pupil remains unequal',
      'Keep the head elevated, give a hypotonic bolus for perfusion, and report after the next GCS check',
    ],
    correctIndex: 1,
    explanation: 'Drowsiness, a new unequal pupil, and projectile vomiting warn of rising ICP. Elevate the head, reduce stimulation, and escalate now. Flat position, clustering, or hypotonic fluid worsen injury.',
  },
];

function buildDailyCases(ms = Date.now()): CaseQuestion[] {
  const seed = dailySeed(ms);
  const mix = DAILY_DIFFICULTY_MIXES[seed % DAILY_DIFFICULTY_MIXES.length];
  const usedTitles = new Set<string>();
  return mix
    .map((level, index) => {
      const levelPool = shuffleInPlace(
        masterCasePool.filter((item) => item.difficulty === level && !usedTitles.has(item.title)),
        mulberry32(seed + hashSeed(level) + 31 + (index * 97))
      );
      const item = levelPool[0] || masterCasePool.find((entry) => !usedTitles.has(entry.title));
      if (!item) return null;
      usedTitles.add(item.title);
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
    })
    .filter((item): item is CaseQuestion => Boolean(item));
}

function answersDraftKey(ymd = riyadhParts().ymd) {
  return `nurs_case_draft_${ymd}`;
}

function readAnswersDraft(): Record<number, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(answersDraftKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: Record<number, number> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      const id = Number(key);
      const idx = Number(value);
      if (Number.isFinite(id) && Number.isFinite(idx)) next[id] = idx;
    });
    return next;
  } catch {
    return {};
  }
}

function writeAnswersDraft(answers: Record<number, number>) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(answersDraftKey(), JSON.stringify(answers));
}

function clearAnswersDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(answersDraftKey());
}

const LOGIN_NEXT_HREF = '/login?next=/case-study';

export default function CaseStudyPage() {
  const [activeCases, setActiveCases] = useState<CaseQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [revealedBonus, setRevealedBonus] = useState<RevealedBonus | null>(null);
  const [persistenceBonus, setPersistenceBonus] = useState(0);
  const [authReady, setAuthReady] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [checkingToday, setCheckingToday] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recordedScore, setRecordedScore] = useState<number | null>(null);
  const [recordedMax, setRecordedMax] = useState<number | null>(null);
  const [solveLeftMs, setSolveLeftMs] = useState(CASE_STUDY_SOLVE_MS);
  const [solveExpired, setSolveExpired] = useState(false);
  const [weekNoticeBlocking, setWeekNoticeBlocking] = useState(true);
  const [trialPollBlocking, setTrialPollBlocking] = useState(true);

  const [leaderboard, setLeaderboard] = useState<OverallBoardRow[]>([]);
  const [weeklyBoard, setWeeklyBoard] = useState<{ weekLabel: string; locked: boolean; live: boolean; rows: WeeklyBoardRow[] }>({
    weekLabel: '',
    locked: false,
    live: false,
    rows: [],
  });
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [boardTab, setBoardTab] = useState<'overall' | 'week'>('overall');
  const myLeaderboardRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveCases(buildDailyCases());
    fetchLeaderboard();

    const savedName = localStorage.getItem('userName') || localStorage.getItem('fullName');
    const savedPhone = localStorage.getItem('userPhone') || localStorage.getItem('phone');

    if (savedName) setStudentName(savedName);
    if (savedPhone) {
      setStudentPhone(savedPhone);
      setCheckingToday(true);
      checkIfAlreadySubmitted(savedPhone);
    } else {
      setSelectedAnswers(readAnswersDraft());
    }
    setAuthReady(true);

    const tick = () => setTimeLeft(formatRiyadhCountdown());
    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (trialPollBlocking || weekNoticeBlocking || hasSubmittedToday || showResults || activeCases.length === 0) return;
    if (typeof window === 'undefined') return;
    const key = caseSolveTimerKey();
    const existing = Number(localStorage.getItem(key) || 0);
    const start = Number.isFinite(existing) && existing > 1_000_000_000_000 ? existing : Date.now();
    if (start !== existing) localStorage.setItem(key, String(start));
    const tick = () => {
      const left = Math.max(0, start + CASE_STUDY_SOLVE_MS - Date.now());
      setSolveLeftMs(left);
      setSolveExpired(left <= 0);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [trialPollBlocking, weekNoticeBlocking, hasSubmittedToday, showResults, activeCases.length]);

  useEffect(() => {
    if (!showLeaderboardModal) return;
    const timer = window.setTimeout(() => {
      myLeaderboardRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [showLeaderboardModal, leaderboard]);

  const fetchLeaderboard = async () => {
    try {
      const submissions = await loadCaseSubmissions(db);
      const rows = aggregateCaseLeaderboard(submissions);

      const myPhone = canonicalPhone(localStorage.getItem('userPhone') || localStorage.getItem('phone') || '');
      const toResolve = rows.filter((row, idx) => idx < 20 || (myPhone && row.phone === myPhone));
      await Promise.all(toResolve.map(async (row) => {
        if (!row.phone) return;
        for (const id of phoneVariants(row.phone)) {
          try {
            const userSnap = await getDoc(doc(db, 'users', id));
            const fullName = String(userSnap.data()?.fullName || '').trim();
            if (fullName) {
              row.studentName = fullName;
              return;
            }
          } catch {
            // keep submission name
          }
        }
      }));

      const names = new Map(rows.map((row) => [row.phone || `name:${row.studentName}`, row.studentName]));
      const weekly = aggregateWeeklyBoard(submissions);
      setWeeklyBoard({
        weekLabel: weekly.weekLabel,
        locked: weekly.locked,
        live: weekly.live,
        rows: weekly.rows.map((row) => ({
          ...row,
          studentName: names.get(row.phone || row.key) || row.studentName,
        })),
      });
      setLeaderboard(decorateOverallBoard(rows, submissions));

      const signedIn = Boolean(localStorage.getItem('userPhone') || localStorage.getItem('phone'));
      if (signedIn) {
        try {
          await syncCaseStudyDistinguished(db, submissions);
        } catch (syncErr) {
          console.error(syncErr);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkIfAlreadySubmitted = async (phone: string) => {
    try {
      const list = await Promise.race([
        loadCaseSubmissions(db),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
      ]);
      if (list) {
        const today = riyadhParts().ymd;
        const key = canonicalPhone(phone);
        const todayRow = list.find((row) => personPhone(row) === key && submissionDayKey(row) === today);
        if (todayRow) {
          applySavedSubmission(todayRow);
          clearAnswersDraft();
          return;
        }
      }
      setSelectedAnswers((prev) => (Object.keys(prev).length ? prev : readAnswersDraft()));
    } catch (err) {
      console.error(err);
      setSelectedAnswers((prev) => (Object.keys(prev).length ? prev : readAnswersDraft()));
    } finally {
      setCheckingToday(false);
    }
  };

  const applySavedSubmission = (row: Record<string, any>) => {
    const persistence = Number(row.persistenceBonus || 0);
    const bonusAmount = Number(row.bonusAmount || 0);
    const totalCases = Number(row.total || 3);
    setHasSubmittedToday(true);
    setShowResults(true);
    setPersistenceBonus(persistence);
    setRecordedScore(Number(row.score || 0));
    setRecordedMax(totalCases + bonusAmount + persistence);
    if (row.bonusQuestionId) {
      setRevealedBonus({ questionId: Number(row.bonusQuestionId), amount: bonusAmount });
    }
    const savedAnswers = row.answers;
    if (savedAnswers && typeof savedAnswers === 'object') {
      const next: Record<number, number> = {};
      Object.entries(savedAnswers).forEach(([key, value]) => {
        next[Number(key)] = Number(value);
      });
      setSelectedAnswers(next);
    }
  };

  const handleSelectOption = (caseId: number, optionIndex: number) => {
    if (showResults || hasSubmittedToday || solveExpired) return;
    setSelectedAnswers((prev) => {
      const next = { ...prev, [caseId]: optionIndex };
      writeAnswersDraft(next);
      return next;
    });
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
      alert('سجّل دخولك أولاً حتى تُحفظ نقاطك.');
      return;
    }

    if (!solveExpired && Object.keys(selectedAnswers).length < activeCases.length) {
      alert('أجب على الحالات الثلاث قبل الإرسال.');
      return;
    }
    if (solveExpired && Object.keys(selectedAnswers).length === 0) {
      alert('انتهى وقت الحل ولم تختر إجابات.');
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
      const already = existing.find((row) => personPhone(row) === phoneKey && submissionDayKey(row) === today);
      if (already) {
        applySavedSubmission(already);
        alert('تم تسجيل حل اليوم مسبقاً. التحدي يتجدد بعد منتصف الليل.');
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
        answers: selectedAnswers,
        timestamp: now,
        createdAt: when.toISOString(),
        dateStr: when.toLocaleDateString('ar-EG', { timeZone: 'Asia/Riyadh' }),
        timeStr: when.toLocaleTimeString('ar-EG', { timeZone: 'Asia/Riyadh' }),
      });

      setRevealedBonus(bonus);
      setPersistenceBonus(persistence.amount);
      setRecordedScore(score);
      setRecordedMax(activeCases.length + (bonus?.amount || 0) + persistence.amount);
      setHasSubmittedToday(true);
      setShowResults(true);
      clearAnswersDraft();
      await fetchLeaderboard();
    } catch (err) {
      console.error(err);
      alert('تعذر حفظ النتيجة. تأكد من الاتصال ثم حاول مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F0E8] text-slate-900 relative" dir="rtl">
      <div className="bg-gradient-to-r from-[#3a020c] via-[#630517] to-[#4A030F] text-white py-12 px-4 sm:px-6 shadow-xl border-b-4 border-[#F5D061]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="space-y-3 text-center sm:text-right">
            <div className="inline-flex items-center gap-2 bg-[#F5D061] text-[#630517] font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
              <span className="inline-flex items-center gap-1.5"><ClubIcon name="zap" size={13} /> Daily Clinical Challenge</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight" dir="ltr">
              Clinical Case Study Challenge
            </h1>
            <div className="bg-black/20 border border-[#F5D061]/30 px-4 py-2 rounded-2xl text-xs sm:text-sm text-amber-50 font-medium inline-block">
              <ClubIcon name="clock" size={14} className="inline-block align-middle" /> <span>يتجدد التحدي بعد: </span>
              <strong suppressHydrationWarning className="text-[#F5D061] font-black px-1">{timeLeft || 'جاري التحديث...'}</strong>
            </div>
            <div>
              <Link href="/" className="text-xs text-[#F5D061] hover:underline font-bold inline-block pt-1">
                العودة للرئيسية
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowLeaderboardModal(true)}
            className="flex items-center gap-2 bg-[#F5D061] text-[#630517] px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0 border border-white/20"
          >
            <ClubIcon name="trophy" size={16} />
            <span>لوحة الصدارة</span>
          </button>
        </div>
      </div>

      <CaseStudyTrialPoll onBlockingChange={setTrialPollBlocking} />
      <WeeklyMechanismNotice paused={trialPollBlocking} onBlockingChange={setWeekNoticeBlocking} />

      {!showResults && !hasSubmittedToday && activeCases.length > 0 && !trialPollBlocking && !weekNoticeBlocking ? (
        <div
          className="sticky top-16 z-40 mx-auto max-w-3xl px-4 pt-4"
          dir="rtl"
        >
          <div className={`rounded-2xl px-4 py-3 flex items-center justify-between gap-3 border-2 shadow-sm ${
            solveExpired
              ? 'bg-rose-700 text-white border-rose-800'
              : solveLeftMs <= 10000
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-white text-[#630517] border-[#F5D061]'
          }`}>
            <p className="text-xs sm:text-sm font-black">
              {solveExpired
                ? 'انتهى وقت الحل. أرسل ما اخترته.'
                : 'وقت الحل: 45 ثانية للحالات الثلاث'}
            </p>
            <strong className="font-mono text-lg font-black tabular-nums" suppressHydrationWarning>
              {formatSolveClock(solveLeftMs)}
            </strong>
          </div>
        </div>
      ) : null}

      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 text-right" dir="rtl">
            <div className="flex justify-between items-center gap-3">
              <div>
                <h3 className="text-xl font-black text-[#630517] flex items-center gap-2">
                  <ClubIcon name="trophy" size={18} /> لوحة الصدارة
                </h3>
                <p className="text-[11px] font-bold text-slate-500 mt-1">
                  {boardTab === 'overall'
                    ? `كل المشاركين: ${leaderboard.length} · أول ${CASE_STUDY_DISTINGUISHED_COUNT} عضو مميز`
                    : `${weeklyBoard.weekLabel} · إجابات صحيحة فقط · البونص في الصدارة العامة`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaderboardModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <Link
              href="/faq#faq-week"
              className="text-[11px] font-black text-[#630517] hover:underline inline-flex items-center gap-1"
            >
              <ClubIcon name="info" size={13} /> آلية الإضافة في الأسئلة الشائعة
            </Link>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
              <button
                type="button"
                onClick={() => setBoardTab('overall')}
                className={`py-2.5 rounded-xl text-[11px] font-black cursor-pointer ${
                  boardTab === 'overall' ? 'bg-[#630517] text-[#F5D061]' : 'text-slate-600'
                }`}
              >
                الصدارة العامة
              </button>
              <button
                type="button"
                onClick={() => setBoardTab('week')}
                className={`py-2.5 rounded-xl text-[11px] font-black cursor-pointer ${
                  boardTab === 'week' ? 'bg-[#630517] text-[#F5D061]' : 'text-slate-600'
                }`}
              >
                متصدر الأسبوع
              </button>
            </div>

            <div className="space-y-2.5 max-h-[62vh] overflow-y-auto pl-1">
              {boardTab === 'week' ? (
                <WeeklyRaceBoard
                  rows={weeklyBoard.rows}
                  weekLabel={weeklyBoard.weekLabel}
                  locked={weeklyBoard.locked}
                  live={weeklyBoard.live}
                  myPhone={canonicalPhone(studentPhone)}
                  myName={studentName.trim()}
                />
              ) : (
                <OverallRaceBoard
                  rows={leaderboard}
                  myPhone={canonicalPhone(studentPhone)}
                  myName={studentName.trim()}
                  myRef={myLeaderboardRowRef}
                />
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
        {authReady && !studentPhone.trim() ? (
          <div className="bg-amber-50 border-2 border-[#F5D061] rounded-3xl p-5 text-center space-y-2" dir="rtl">
            <p className="text-sm font-black text-[#630517]">سجّل دخولك حتى تُحفظ نقاطك في الصدارة.</p>
            <p className="text-[11px] text-slate-500 font-medium">تقدر تختار الإجابات الآن، وبعد الدخول ترجع لنفس الصفحة وإجاباتك محفوظة.</p>
            <Link href={LOGIN_NEXT_HREF} className="inline-flex px-5 py-2.5 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs">
              تسجيل الدخول
            </Link>
          </div>
        ) : null}
        {checkingToday ? (
          <div className="bg-white border border-[#630517]/10 rounded-3xl p-4 text-center text-xs font-bold text-slate-500" dir="rtl">
            جاري التحقق من حل اليوم...
          </div>
        ) : null}
        {activeCases.length === 0 ? (
          [0, 1, 2].map((slot) => (
            <div key={slot} className="bg-white rounded-3xl h-64 border border-[#630517]/10 animate-pulse" />
          ))
        ) : null}
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
                  <ClubIcon name="stethoscope" size={16} /> {item.title}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  item.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' :
                  item.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {DIFFICULTY_LABEL[item.difficulty]}
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
                      if (isCorrect) btnStyle = 'bg-emerald-600 text-white border-emerald-800 font-bold';
                      else if (isSelected && !isCorrect) btnStyle = 'bg-rose-700 text-white border-rose-800 font-bold';
                    } else if (isSelected) {
                      btnStyle = 'bg-[#630517] text-white border-[#630517] font-bold shadow-md';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(item.id, optIdx)}
                        disabled={showResults || hasSubmittedToday || solveExpired}
                        className={`w-full text-left p-4 min-h-[4.75rem] rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between disabled:cursor-default ${showResults || hasSubmittedToday || solveExpired ? '' : 'cursor-pointer'} ${btnStyle}`}
                      >
                        <span className="pr-4 leading-relaxed">{opt}</span>
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
                  <strong className="text-[#630517] inline-flex items-center gap-1.5"><ClubIcon name="lightbulb" size={14} /> Clinical Rationale:</strong>
                  <p className="leading-relaxed">{item.explanation}</p>
                </div>
              )}
            </div>
          );
        })}

        {!showResults && activeCases.length > 0 ? (
          <form onSubmit={handleSubmitAnswers} className="bg-white p-6 rounded-3xl border border-[#630517]/15 shadow-sm space-y-4 text-center" dir="rtl">
            <p className="text-xs font-bold text-slate-500">
              أجبت {Object.keys(selectedAnswers).length} من {activeCases.length}
              {solveExpired ? ' · انتهى الوقت' : ''}
            </p>
            {studentPhone.trim() ? (
              <div className="p-4 bg-[#630517]/5 rounded-2xl border border-[#630517]/10 text-xs text-slate-700 font-medium">
                الحساب: <strong className="text-[#630517]">{studentName || 'مستخدم مسجل'}</strong>
                <span className="text-slate-400"> · </span>
                <span dir="ltr">{studentPhone}</span>
                <p className="text-[10px] text-slate-400 mt-1">تُحفظ إجابتك في لوحة الصدارة مرة واحدة يومياً.</p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-[#F5D061] text-xs text-[#630517] font-bold space-y-2">
                <p>سجّل دخولك أولاً حتى تُحفظ نقاطك في الصدارة.</p>
                <Link href={LOGIN_NEXT_HREF} className="inline-flex px-4 py-2 rounded-xl bg-[#630517] text-[#F5D061] font-black">
                  تسجيل الدخول
                </Link>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || checkingToday || !studentPhone.trim()}
              className="w-full bg-[#630517] text-[#F5D061] py-4 rounded-2xl font-black text-sm shadow-xl hover:brightness-110 active:scale-98 transition-all cursor-pointer border border-white/20 disabled:opacity-50 disabled:cursor-default"
            >
              {submitting ? 'Submitting...' : (
                <span className="inline-flex items-center gap-2">Submit Answers & Save Score <ClubIcon name="stethoscope" size={16} /></span>
              )}
            </button>
          </form>
        ) : showResults ? (
          <div className="bg-amber-50 border-2 border-[#F5D061] p-6 rounded-3xl space-y-3 text-center" dir="rtl">
            <h3 className="text-xl font-black text-[#630517]">نتيجتك: {recordedScore ?? (calculateScore() + persistenceBonus)} / {recordedMax ?? (getMaxPossibleScore() + persistenceBonus)}</h3>
            {persistenceBonus > 0 ? (
              <p className="text-sm text-[#630517] font-black bg-white/80 border border-[#F5D061] rounded-2xl px-4 py-3">
                شكراً لاستمراريتك معنا طول الأسبوع في الحل
              </p>
            ) : null}
            {revealedBonus ? (
              <p className="text-xs text-amber-800 font-bold">ظهر بونص مفاجئ بعد التسليم على الحالة {revealedBonus.questionId}.</p>
            ) : (
              <p className="text-xs text-stone-600 font-medium">ما ظهر بونص إضافي اليوم. نراك في تحدي الغد.</p>
            )}
            <p className="text-xs text-stone-600 font-medium">
              تم تسجيل إجابتك وتحديث نقاطك.
            </p>
            <div className="bg-white/80 p-3 rounded-2xl border border-[#F5D061]/50 text-xs text-slate-700 font-bold">
              <ClubIcon name="clock" size={14} className="inline-block align-middle" /> <span>التحدي القادم بعد: </span>
              <span className="text-[#630517] font-black">{timeLeft}</span>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
