'use client';

import { CLUB_AWARD_CELEBRATION } from '../lib/clubAwardCelebration';

const LINES = [
  { key: 'ceremony', delay: '0.2s', className: 'text-xl font-bold text-[#F5D061] sm:text-2xl' },
  { key: 'place', delay: '2.4s', className: 'text-3xl font-black text-[#F5D061] sm:text-4xl' },
  { key: 'award', delay: '4.8s', className: 'text-[2.7rem] font-black leading-tight text-white sm:text-7xl' },
  { key: 'scope', delay: '7.2s', className: 'text-xl font-bold text-[#FFF6D6] sm:text-2xl' },
] as const;

export default function ClubAwardCelebration() {
  const award = CLUB_AWARD_CELEBRATION;
  const copy = {
    ceremony: `حفل ${award.ceremony}`,
    place: award.place,
    award: award.award,
    scope: award.scope,
  };

  return (
    <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
      <style>{`
        .award-mask {
          overflow: hidden;
          line-height: 1.15;
        }
        .award-mask span {
          display: inline-block;
          padding: 0.42em 0.14em 0.5em;
          animation: awardRise 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes awardRise {
          from { transform: translateY(110%); }
          to { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .award-mask span { animation: none; transform: none; }
        }
      `}</style>

      <div className="flex min-h-[14rem] flex-col items-center justify-end gap-1 text-center sm:min-h-[16rem] sm:gap-2">
        {LINES.map((line) => (
          <p key={line.key} className={`award-mask ${line.className}`}>
            <span style={{ animationDelay: line.delay }}>{copy[line.key]}</span>
          </p>
        ))}
      </div>

      <div className="w-full overflow-hidden rounded-[1.15rem] border border-[#F5D061]/85 bg-[#1a0208] shadow-[0_16px_36px_rgba(0,0,0,0.28)]">
        <img
          src={award.image}
          alt="تتويج نادي التمريض بالمركز الأول في حفل روّاد التفوق والتميز"
          className="block h-auto w-full max-h-[52vh] object-contain"
        />
      </div>
    </div>
  );
}
