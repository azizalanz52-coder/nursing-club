'use client';

import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import {
  COMPETITION_PROPOSAL,
  hasExistingCompetitionVote,
  hasLocalCompetitionVote,
  submitCompetitionVote,
  type CompetitionVoteChoice,
} from '../lib/caseStudyCompetitionPoll';
import { ClubIcon } from './icons';

export default function CaseStudyCompetitionPoll() {
  const [open, setOpen] = useState(false);
  const [vote, setVote] = useState<CompetitionVoteChoice | null>(null);
  const [idea, setIdea] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (hasLocalCompetitionVote()) return;
    const phone = localStorage.getItem('userPhone') || localStorage.getItem('phone') || '';
    hasExistingCompetitionVote(db, phone)
      .then((exists) => {
        if (!exists) setOpen(true);
      })
      .catch(() => {
        if (!hasLocalCompetitionVote()) setOpen(true);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vote) {
      alert('يرجى اختيار أوافق أو لا أوافق قبل الإرسال.');
      return;
    }
    setSending(true);
    try {
      await submitCompetitionVote(db, {
        vote,
        idea,
        name: localStorage.getItem('userName') || localStorage.getItem('fullName') || '',
        phone: localStorage.getItem('userPhone') || localStorage.getItem('phone') || '',
      });
      setDone(true);
      setTimeout(() => setOpen(false), 1200);
    } catch (err) {
      console.error(err);
      alert('تعذر حفظ رأيك. يرجى المحاولة مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[420] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[1.8rem] bg-white border-2 border-[#F5D061]/50 shadow-[0_25px_60px_rgba(99,5,23,0.28)]">
        <div className="h-1.5 bg-gradient-to-l from-[#F5D061] via-amber-300 to-[#630517]" />
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
          <div className="space-y-2 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-[11px] font-black">
              <ClubIcon name="lightbulb" size={13} />
              استبيان لمرة واحدة
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-[#630517]">{COMPETITION_PROPOSAL.title}</h2>
            <p className="text-sm text-slate-600 font-medium leading-7">{COMPETITION_PROPOSAL.intro}</p>
          </div>

          {done ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-8 text-center text-sm font-black text-emerald-800 leading-7">
              شكراً لمشاركتك. لن يظهر هذا الاستبيان مرة أخرى.
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-[#630517]/5 border border-[#630517]/10 p-4 space-y-3 text-right">
                <p className="text-[11px] font-black text-[#630517]">{COMPETITION_PROPOSAL.currentTitle}</p>
                <ul className="space-y-2">
                  {COMPETITION_PROPOSAL.currentPoints.map((point) => (
                    <li key={point} className="text-xs text-slate-700 font-medium leading-7 flex gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#630517] shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-amber-50/80 border border-[#F5D061]/50 p-4 space-y-3 text-right">
                <p className="text-[11px] font-black text-[#630517]">{COMPETITION_PROPOSAL.proposalTitle}</p>
                <ul className="space-y-2">
                  {COMPETITION_PROPOSAL.points.map((point) => (
                    <li key={point} className="text-xs text-slate-700 font-medium leading-7 flex gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#F5D061] shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-500 font-medium leading-6">{COMPETITION_PROPOSAL.note}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVote('agree')}
                  className={`py-3 rounded-2xl text-xs font-black border-2 cursor-pointer ${
                    vote === 'agree'
                      ? 'bg-[#630517] text-[#F5D061] border-[#630517]'
                      : 'bg-white text-[#630517] border-[#630517]/20 hover:bg-[#630517]/5'
                  }`}
                >
                  أوافق
                </button>
                <button
                  type="button"
                  onClick={() => setVote('disagree')}
                  className={`py-3 rounded-2xl text-xs font-black border-2 cursor-pointer ${
                    vote === 'disagree'
                      ? 'bg-rose-700 text-white border-rose-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  لا أوافق
                </button>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-slate-600">هل لديكم مقترح أفضل لتطوير المنافسة؟ (اختياري)</label>
                <textarea
                  rows={4}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="اكتبوا المقترح هنا إن وُجد."
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#630517] bg-slate-50 leading-7"
                />
              </div>

              <button
                type="submit"
                disabled={sending || !vote}
                className="w-full py-3.5 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-sm cursor-pointer hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <ClubIcon name="send" size={15} />
                {sending ? 'جاري الإرسال...' : 'إرسال الرأي'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
