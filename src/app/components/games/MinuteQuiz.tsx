'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ClubIcon } from '../icons';
import { msUntilNextWord, riyadhDateKey } from '../../lib/dailyWord';
import { dailyQuizQuestions } from '../../lib/quizBank';
import { answerQuiz, loadMyPlay, recordGamePlay } from '../../lib/gameActivity';
import { quizShareText } from '../../lib/shareResult';
import ShareResultButton from './ShareResultButton';

function resultCopy(score: number, total: number) {
  if (score === total) return 'اخترت الأصح في الأسئلة الأربعة. هذا هو المطلوب في الدقيقة الأولى.';
  if (score >= 2) return 'الخيارات كانت متقاربة. راجع التوضيح، فالأصح ليس أول إجراء يخطر.';
  return 'الخيارات كلها تبدو مقبولة، والأصح واحد. اقرأ التوضيح قبل محاولة الغد.';
}

function quizKey(phone: string) {
  return `nurs-quiz-${phone}-${riyadhDateKey()}`;
}

export default function MinuteQuiz({ phone, name, onPlayed }: { phone: string; name: string; onPlayed?: () => void }) {
  const questions = useMemo(() => dailyQuizQuestions(), []);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [durationMs, setDurationMs] = useState<number | undefined>();
  const [left, setLeft] = useState(0);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const key = quizKey(phone);
    const saved = window.localStorage.getItem(key) || window.localStorage.getItem(`nurs-quiz-${riyadhDateKey()}`);
    void loadMyPlay('quiz', phone).then(async (gate) => {
      if (cancelled) return;
      if (!gate.ok) {
        setBlocked(true);
        setReady(true);
        return;
      }
      if (gate.play?.status === 'finished') {
        setScore(gate.play.score || 0);
        setDone(true);
        if (gate.play.durationMs) setDurationMs(gate.play.durationMs);
        window.localStorage.setItem(key, JSON.stringify({ done: true, score: gate.play.score || 0, durationMs: gate.play.durationMs }));
        setReady(true);
        return;
      }
      if (gate.play?.status === 'playing') {
        setStep(Math.min(gate.play.step || 0, questions.length));
        setScore(gate.play.score || 0);
        if (gate.play.startedAt) startedAt.current = gate.play.startedAt;
        setReady(true);
        return;
      }
      if (saved) {
        try {
          const row = JSON.parse(saved) as { done?: boolean; score?: number; durationMs?: number };
          if (row.done) {
            await recordGamePlay({
              game: 'quiz',
              phone,
              name,
              status: 'finished',
              attempts: questions.length,
              score: Number(row.score) || 0,
              durationMs: Number(row.durationMs) || undefined,
            });
            if (cancelled) return;
            setScore(Number(row.score) || 0);
            setDone(true);
            if (row.durationMs) setDurationMs(row.durationMs);
            onPlayed?.();
          }
        } catch (err) {
          console.error(err);
        }
      }
      if (!cancelled) setReady(true);
    }).catch((err) => {
      console.error(err);
      if (!cancelled) {
        setBlocked(true);
        setReady(true);
      }
    });
    const tick = () => setLeft(msUntilNextWord());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [phone, name]);

  const question = questions[step];
  const revealed = picked !== null;

  const choose = (index: number) => {
    if (!question || revealed || done || saving || blocked) return;
    setSaving(true);
    void answerQuiz({
      phone,
      name,
      step,
      correct: index === question.answer,
      total: questions.length,
    }).then((result) => {
      if (!result.ok) {
        setBlocked(true);
        return;
      }
      const play = result.play;
      setScore(play.score || 0);
      if (play.durationMs) setDurationMs(play.durationMs);
      if (play.startedAt) startedAt.current = play.startedAt;
      if (!play.applied) {
        if (play.status === 'finished') {
          setDone(true);
          window.localStorage.setItem(quizKey(phone), JSON.stringify({ done: true, score: play.score || 0, durationMs: play.durationMs }));
          onPlayed?.();
          return;
        }
        setStep(Math.min(play.step || 0, questions.length - 1));
        setPicked(null);
        return;
      }
      setPicked(index);
      if (play.status === 'finished') {
        window.localStorage.setItem(quizKey(phone), JSON.stringify({ done: true, score: play.score || 0, durationMs: play.durationMs }));
      }
    }).catch((err) => {
      console.error(err);
      setBlocked(true);
    }).finally(() => setSaving(false));
  };

  const next = () => {
    if (step >= questions.length - 1) {
      setDone(true);
      onPlayed?.();
      return;
    }
    setStep((value) => value + 1);
    setPicked(null);
  };

  const hours = Math.floor(Math.max(0, left) / 3_600_000);
  const minutes = Math.floor((Math.max(0, left) % 3_600_000) / 60_000);

  if (!ready) {
    return <p className="text-center text-sm font-bold text-[#630517]">نتحقق من محاولتك...</p>;
  }
  if (blocked) {
    return <p className="text-center text-sm font-bold text-[#630517]">ما انربطت المحاولة بالحساب. حدّث الصفحة وأنت داخل.</p>;
  }

  return (
    <div dir="rtl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#630517] px-3 py-1 text-[11px] font-black text-[#F5D061]">
            <ClubIcon name="zap" size={13} />
            إسعاف الدقيقة الأولى
          </span>
          <span className="text-xs font-bold text-[#630517]/70">
            {done ? 'النتيجة' : `${step + 1} من ${questions.length}`}
          </span>
        </div>

        {done ? (
          <div className="space-y-5 text-center">
            <p className="text-5xl font-black text-[#630517]">{score}/{questions.length}</p>
            <h2 className="text-2xl font-black text-[#1a0208]">إسعاف الدقيقة الأولى</h2>
            <p className="text-sm font-medium leading-relaxed text-[#3a020c]">{resultCopy(score, questions.length)}</p>
            <p className="text-sm font-black text-[#630517]">مرة واحدة كل ٢٤ ساعة. المحاولة التالية بعد {hours} س {minutes} د.</p>
            <ShareResultButton text={quizShareText(score, durationMs)} />
            <Link
              href="/case-study"
              className="inline-flex rounded-2xl bg-[#630517] px-5 py-3 text-sm font-black text-[#F5D061]"
            >
              التحدي السريري للتمريض
            </Link>
          </div>
        ) : question ? (
          <div className="space-y-4">
            <h2 className="text-xl font-black leading-snug text-[#1a0208] sm:text-2xl">{question.prompt}</h2>
            <div className="grid gap-2">
              {question.options.map((option, index) => {
                const correct = index === question.answer;
                const selected = index === picked;
                let tone = 'border-[#630517]/15 bg-white text-[#1a0208] hover:border-[#630517]/40';
                if (revealed && correct) tone = 'border-[#1f7a3a] bg-[#e8f6ec] text-[#145c2a]';
                else if (revealed && selected) tone = 'border-[#9d174d] bg-[#fde8ef] text-[#9d174d]';
                else if (revealed) tone = 'border-transparent bg-white/50 text-[#630517]/45';
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(index)}
                    disabled={revealed || saving || !question}
                    className={`rounded-2xl border px-4 py-3 text-right text-sm font-bold leading-relaxed transition ${tone}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {revealed ? (
              <div className="space-y-3">
                <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm font-medium leading-relaxed text-[#3a020c]">
                  {question.why}
                </p>
                <button
                  type="button"
                  onClick={next}
                  className="w-full rounded-2xl bg-[#630517] px-5 py-3 text-sm font-black text-[#F5D061]"
                >
                  {step === questions.length - 1 ? 'عرض النتيجة' : 'السؤال التالي'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
    </div>
  );
}
