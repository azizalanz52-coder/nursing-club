'use client';

import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import {
  SATISFIED_LABEL,
  TIMER_CHOICE_LABEL,
  TRIAL_POLL_COPY,
  hasExistingTrialVote,
  hasLocalTrialVote,
  hasSessionTrialLater,
  isTrialPollOpen,
  markSessionTrialLater,
  submitTrialVote,
  type TimerChoice,
  type YesNo,
} from '../lib/caseStudyTrialPoll';
import { ClubIcon } from './icons';

function ChoicePair<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | null;
  onChange: (next: T) => void;
  options: Array<{ id: T; label: string; danger?: boolean }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`py-3 rounded-2xl text-xs font-black border-2 cursor-pointer ${
              active
                ? option.danger
                  ? 'bg-rose-700 text-white border-rose-700'
                  : 'bg-[#630517] text-[#F5D061] border-[#630517]'
                : option.danger
                  ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  : 'bg-white text-[#630517] border-[#630517]/20 hover:bg-[#630517]/5'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CaseStudyTrialPoll({
  onBlockingChange,
}: {
  onBlockingChange?: (blocking: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [timerChoice, setTimerChoice] = useState<TimerChoice | null>(null);
  const [weeklySatisfied, setWeeklySatisfied] = useState<YesNo | null>(null);
  const [idea, setIdea] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isTrialPollOpen() || hasLocalTrialVote() || hasSessionTrialLater()) {
      onBlockingChange?.(false);
      return;
    }
    setOpen(true);
    onBlockingChange?.(true);
    const phone = localStorage.getItem('userPhone') || localStorage.getItem('phone') || '';
    hasExistingTrialVote(db, phone)
      .then((exists) => {
        if (!exists || hasSessionTrialLater()) return;
        setOpen(false);
        onBlockingChange?.(false);
      })
      .catch(() => undefined);
  }, [onBlockingChange]);

  const enterChallenge = () => {
    markSessionTrialLater();
    setOpen(false);
    onBlockingChange?.(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTrialPollOpen()) {
      alert('انتهى وقت الاستبيان.');
      setOpen(false);
      onBlockingChange?.(false);
      return;
    }
    if (!timerChoice || !weeklySatisfied) {
      alert('يرجى الإجابة على السؤالين قبل الإرسال.');
      return;
    }
    setSending(true);
    try {
      await submitTrialVote(db, {
        timerChoice,
        weeklySatisfied,
        idea,
        name: localStorage.getItem('userName') || localStorage.getItem('fullName') || '',
        phone: localStorage.getItem('userPhone') || localStorage.getItem('phone') || '',
      });
      setDone(true);
      window.setTimeout(() => {
        setOpen(false);
        onBlockingChange?.(false);
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('تعذر حفظ رأيك. يرجى المحاولة مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[430] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[1.8rem] bg-white border-2 border-[#F5D061]/50 shadow-[0_25px_60px_rgba(99,5,23,0.28)]">
        <div className="h-1.5 bg-gradient-to-l from-[#F5D061] via-amber-300 to-[#630517]" />
        {!done ? (
          <button
            type="button"
            onClick={enterChallenge}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer z-10"
            aria-label="إغلاق والدخول للتحدي"
          >
            ✕
          </button>
        ) : null}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
          <div className="space-y-2 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-[11px] font-black">
              <ClubIcon name="lightbulb" size={13} />
              استبيان بعد التجربة
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#630517]">{TRIAL_POLL_COPY.title}</h2>
            <p className="text-sm text-slate-600 font-medium leading-7">{TRIAL_POLL_COPY.intro}</p>
          </div>

          {done ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-8 text-center text-sm font-black text-emerald-800 leading-7">
              شكراً لمشاركتك. لن يظهر هذا الاستبيان مرة أخرى.
            </div>
          ) : (
            <>
              <div className="space-y-2 text-right">
                <p className="text-xs font-black text-[#630517] leading-7">{TRIAL_POLL_COPY.timerQuestion}</p>
                <ChoicePair
                  value={timerChoice}
                  onChange={setTimerChoice}
                  options={[
                    { id: 'keep45', label: TIMER_CHOICE_LABEL.keep45 },
                    { id: 'minute90', label: TIMER_CHOICE_LABEL.minute90 },
                  ]}
                />
              </div>

              <div className="space-y-2 text-right">
                <p className="text-xs font-black text-[#630517] leading-7">{TRIAL_POLL_COPY.weeklyQuestion}</p>
                <ChoicePair
                  value={weeklySatisfied}
                  onChange={setWeeklySatisfied}
                  options={[
                    { id: 'yes', label: SATISFIED_LABEL.yes },
                    { id: 'no', label: SATISFIED_LABEL.no, danger: true },
                  ]}
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-slate-600">{TRIAL_POLL_COPY.ideaLabel}</label>
                <textarea
                  rows={4}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="اكتب اقتراحك هنا إن وُجد."
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517] bg-slate-50 leading-7"
                />
              </div>

              <button
                type="submit"
                disabled={sending || !timerChoice || !weeklySatisfied}
                className="w-full py-3.5 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-sm cursor-pointer hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <ClubIcon name="send" size={15} />
                {sending ? 'جاري الإرسال...' : 'إرسال الرأي'}
              </button>
              <button
                type="button"
                onClick={enterChallenge}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-[#630517] cursor-pointer"
              >
                أدخل التحدي الآن
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
