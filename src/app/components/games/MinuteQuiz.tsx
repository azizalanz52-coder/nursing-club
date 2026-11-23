'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ClubIcon } from '../icons';
import { msUntilNextWord, riyadhDateKey } from '../../lib/dailyWord';
import { loadGamePlays, recordGamePlay } from '../../lib/gameActivity';

const QUESTIONS = [
  {
    prompt: 'احترق إصبع أحد بحرق بسيط. أول تصرف صح؟',
    options: [
      'صب ماء بارد جاري حوالي عشر دقائق',
      'حط معجون أسنان على الحرق',
      'فجّر الفقاعة إذا طلعت',
      'حط ثلج مباشرة على الجلد',
    ],
    answer: 0,
    why: 'الماء البارد الجاري يبرد الجلد. الثلج والمعجون يزيدان الضرر.',
  },
  {
    prompt: 'شخص يختنق، ما يقدر يتكلم ولا يسعل، ويمسك رقبته. وش تسوي؟',
    options: [
      'خمس ضربات بين الكتفين ثم خمس ضغطات على البطن، وكلم الإسعاف',
      'عطه ماء عشان يبلع',
      'ادخل إصبعك في حلقه',
      'خله يستلقي على ظهره',
    ],
    answer: 0,
    why: 'إذا ما يقدر يسعل ولا يتكلم فالمجرى مسدود. الماء والإصبع يزيدان الخطر.',
  },
  {
    prompt: 'جرح في اليد والدم نازل. أول شيء؟',
    options: [
      'اضغط بقماش نظيف على الجرح وارفع اليد',
      'حط تراب أو قهوة ليوقف الدم',
      'اغسله بماء حار بقوة',
      'اربط فوق الجرح ربطة ضيقة من أول لحظة',
    ],
    answer: 0,
    why: 'الضغط المباشر مع رفع اليد يوقف أغلب النزيف. الربطة الضيقة آخر حل.',
  },
  {
    prompt: 'ألم صدر مفاجئ مع عرق وبرودة. أقرب تصرف؟',
    options: [
      'اتصل بـ 997 وخله جالس ومرتاح',
      'خله يركض عشان الدورة تتحرك',
      'انتظر ساعة يمكن يروح',
      'عطه قهوة ثقيلة',
    ],
    answer: 0,
    why: 'هذا قد يكون جلطة قلب. 997 رقم الإسعاف، والراحة أسلم من الحركة أو الانتظار.',
  },
] as const;

function resultCopy(score: number) {
  if (score === QUESTIONS.length) return 'أربع من أربع. هالتصرفات هي اللي تفرق في الدقيقة الأولى.';
  if (score >= 2) return 'قريب. راجع الجملة تحت كل سؤال، هذي أكثر أغلاط الناس في البيت.';
  return 'عادي. الإسعاف مهارة، مو معلومة تحفظها مرة. عدّها وأنت مرتاح.';
}

function quizKey() {
  return `nurs-quiz-${riyadhDateKey()}`;
}

export default function MinuteQuiz({ phone, name, onPlayed }: { phone: string; name: string; onPlayed?: () => void }) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [left, setLeft] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(quizKey());
    if (saved) {
      try {
        const row = JSON.parse(saved) as { step?: number; score?: number; done?: boolean; startedAt?: number };
        if (row.done) {
          setScore(Number(row.score) || 0);
          setDone(true);
        }
        if (row.startedAt) startedAt.current = row.startedAt;
      } catch {
        window.localStorage.removeItem(quizKey());
      }
    }
    void loadGamePlays(riyadhDateKey()).then((list) => {
      const mine = list.find((row) => row.game === 'quiz' && row.phone === phone && row.status === 'finished');
      if (!mine) return;
      setScore(mine.score || 0);
      setDone(true);
      window.localStorage.setItem(quizKey(), JSON.stringify({ done: true, score: mine.score || 0 }));
    }).catch((err) => console.error(err));
    const tick = () => setLeft(msUntilNextWord());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [phone]);

  const question = QUESTIONS[step];
  const revealed = picked !== null;

  const choose = (index: number) => {
    if (revealed) return;
    if (!startedAt.current) startedAt.current = Date.now();
    setPicked(index);
    if (index === question.answer) setScore((value) => value + 1);
  };

  const next = () => {
    if (step === QUESTIONS.length - 1) {
      const finalScore = score;
      setDone(true);
      window.localStorage.setItem(quizKey(), JSON.stringify({ done: true, score: finalScore, startedAt: startedAt.current }));
      void recordGamePlay({
        game: 'quiz',
        phone,
        name,
        status: 'finished',
        attempts: QUESTIONS.length,
        score: finalScore,
        durationMs: startedAt.current ? Date.now() - startedAt.current : undefined,
      }).then(() => onPlayed?.()).catch((err) => console.error(err));
      return;
    }
    setStep((value) => value + 1);
    setPicked(null);
  };

  const hours = Math.floor(Math.max(0, left) / 3_600_000);
  const minutes = Math.floor((Math.max(0, left) % 3_600_000) / 60_000);

  return (
    <div dir="rtl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#630517] px-3 py-1 text-[11px] font-black text-[#F5D061]">
            <ClubIcon name="zap" size={13} />
            دقيقة لأي أحد
          </span>
          <span className="text-xs font-bold text-[#630517]/70">
            {done ? 'النتيجة' : `${step + 1} من ${QUESTIONS.length}`}
          </span>
        </div>

        {done ? (
          <div className="space-y-5 text-center">
            <p className="text-5xl font-black text-[#630517]">{score}/{QUESTIONS.length}</p>
            <h2 className="text-2xl font-black text-[#1a0208]">إسعاف الدقيقة الأولى</h2>
            <p className="text-sm font-medium leading-relaxed text-[#3a020c]">{resultCopy(score)}</p>
            <p className="text-sm font-black text-[#630517]">مرة واحدة كل ٢٤ ساعة. الجاية بعد {hours} س {minutes} د.</p>
            <Link
              href="/case-study"
              className="inline-flex rounded-2xl bg-[#630517] px-5 py-3 text-sm font-black text-[#F5D061]"
            >
              التحدي السريري للتمريض
            </Link>
          </div>
        ) : (
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
                    disabled={revealed}
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
                  {step === QUESTIONS.length - 1 ? 'شوف نتيجتك' : 'السؤال اللي بعده'}
                </button>
              </div>
            ) : null}
          </div>
        )}
    </div>
  );
}
