'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface CaseQuestion {
  id: number;
  difficulty: 'Easy' | 'Moderate';
  title: string;
  scenario: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function CaseStudyPage() {
  const casePool: CaseQuestion[][] = [
    [
      {
        id: 1,
        difficulty: 'Easy',
        title: 'Case 1: Vital Signs Assessment',
        scenario: 'A 45-year-old admitted patient has a body temperature of 38.5°C, HR 110 bpm, and RR 22 breaths/min. What is the most appropriate initial nursing intervention?',
        options: [
          'Administer antipyretic medication immediately without notifying the physician',
          'Notify the physician and document the vital signs accurately in the patient chart',
          'Cover the patient with heavy blankets to induce sweating',
          'Wait for 4 hours and recheck the temperature'
        ],
        correctIndex: 1,
        explanation: 'The correct action is to notify the physician and document findings for prompt medical collaboration.'
      },
      {
        id: 2,
        difficulty: 'Moderate',
        title: 'Case 2: IV Fluid Management',
        scenario: 'A nurse notices swelling, coolness, and pain around an intravenous (IV) insertion site. What is the immediate nursing action?',
        options: [
          'Slow down the infusion rate and continue monitoring',
          'Apply a hot compress directly over the site',
          'Stop the infusion immediately, remove the IV catheter, and elevate the limb',
          'Administer an analgesic through the same IV line'
        ],
        correctIndex: 2,
        explanation: 'These are classic signs of infiltration. The IV must be stopped and removed immediately to prevent tissue damage.'
      }
    ],
    [
      {
        id: 1,
        difficulty: 'Easy',
        title: 'Case 1: Wound Care Evaluation',
        scenario: 'While changing a surgical dressing, the nurse observes mild erythema and well-approximated wound edges with no drainage. How should this be classified?',
        options: [
          'An infected wound requiring immediate antibiotic therapy',
          'A normal wound in the primary intention healing stage',
          'A dehisced wound requiring surgical re-suturing',
          'A chronic non-healing ulcer'
        ],
        correctIndex: 1,
        explanation: 'Mild erythema with well-approximated edges is a normal presentation in primary intention healing.'
      },
      {
        id: 2,
        difficulty: 'Moderate',
        title: 'Case 2: Medication Safety',
        scenario: 'The nurse is scheduled to administer an oral medication to a patient, but the patient is found sleeping deeply. What is the correct protocol?',
        options: [
          'Wake the patient forcefully to take the medication',
          'Crush the medication in water and leave it on the bedside table',
          'Hold the medication temporarily and notify the charge nurse or physician',
          'Administer the medication via feeding tube without checking'
        ],
        correctIndex: 2,
        explanation: 'Medications should not be given to unresponsive or deeply sleeping patients to prevent aspiration risks.'
      }
    ]
  ];

  const [activeCases, setActiveCases] = useState<CaseQuestion[]>(casePool[0]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % casePool.length;
    setActiveCases(casePool[dayIndex]);

    const timer = setInterval(() => {
      const now = new Date();
      const hoursLeft = 23 - now.getHours();
      const minsLeft = 59 - now.getMinutes();
      setTimeLeft(`${hoursLeft}h ${minsLeft}m until next refresh`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSelectOption = (caseId: number, optionIndex: number) => {
    if (showResults) return;
    setSelectedAnswers(prev => ({ ...prev, [caseId]: optionIndex }));
  };

  const calculateScore = () => {
    let score = 0;
    activeCases.forEach(c => {
      if (selectedAnswers[c.id] === c.correctIndex) score++;
    });
    return score;
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20" dir="ltr">
      <div className="bg-[#630517] text-white py-12 px-6 text-center space-y-3 shadow-md">
        <span className="bg-[#F5D061] text-[#630517] font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-wider inline-block">
          ⏱️ Daily Clinical Challenge (Refreshes every 24h)
        </span>
        <h1 className="text-3xl sm:text-4xl font-black">Nursing Clinical Case Studies</h1>
        <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto">
          Test your knowledge with realistic clinical scenarios. <span className="text-[#F5D061] font-bold">{timeLeft}</span>
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
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
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

        <div className="text-center pt-4">
          {!showResults ? (
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="bg-[#630517] text-[#F5D061] px-10 py-4 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-all cursor-pointer"
            >
              Submit & View Results 🎯
            </button>
          ) : (
            <div className="bg-emerald-50 border-2 border-emerald-300 p-6 rounded-3xl space-y-2">
              <h3 className="text-xl font-black text-emerald-900">Your Score: {calculateScore()} / {activeCases.length} Correct! 🎉</h3>
              <p className="text-xs text-emerald-700">Thank you for participating. New cases will appear after 24 hours.</p>
              <button
                type="button"
                onClick={() => { setShowResults(false); setSelectedAnswers({}); }}
                className="mt-2 bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}