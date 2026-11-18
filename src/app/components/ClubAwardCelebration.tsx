'use client';

import { CLUB_AWARD_CELEBRATION } from '../lib/clubAwardCelebration';

const LINES = [
  { key: 'ceremony', motion: 'award-line-ceremony', className: 'text-xl font-bold text-[#F5D061] sm:text-2xl' },
  { key: 'place', motion: 'award-line-place', className: 'text-3xl font-black text-[#F5D061] sm:text-4xl' },
  { key: 'award', motion: 'award-line-award', className: 'text-[2.7rem] font-black leading-tight text-white sm:text-7xl' },
  { key: 'scope', motion: 'award-line-scope', className: 'text-xl font-bold text-[#FFF6D6] sm:text-2xl' },
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
          animation-duration: 15s;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          animation-iteration-count: infinite;
          animation-fill-mode: both;
        }
        .award-line-ceremony span { animation-name: awardLineCeremony; }
        .award-line-place span { animation-name: awardLinePlace; }
        .award-line-award span { animation-name: awardLineAward; }
        .award-line-scope span { animation-name: awardLineScope; }
        @keyframes awardLineCeremony {
          0%, 1.3% { transform: translateY(110%); }
          7% { transform: translateY(0); }
          92% { transform: translateY(0); }
          96%, 100% { transform: translateY(110%); }
        }
        @keyframes awardLinePlace {
          0%, 16% { transform: translateY(110%); }
          21.7% { transform: translateY(0); }
          92% { transform: translateY(0); }
          96%, 100% { transform: translateY(110%); }
        }
        @keyframes awardLineAward {
          0%, 32% { transform: translateY(110%); }
          37.7% { transform: translateY(0); }
          92% { transform: translateY(0); }
          96%, 100% { transform: translateY(110%); }
        }
        @keyframes awardLineScope {
          0%, 48% { transform: translateY(110%); }
          53.7% { transform: translateY(0); }
          92% { transform: translateY(0); }
          96%, 100% { transform: translateY(110%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .award-mask span { animation: none; transform: none; }
        }
      `}</style>

      <div className="flex min-h-[14rem] flex-col items-center justify-end gap-1 text-center sm:min-h-[16rem] sm:gap-2">
        {LINES.map((line) => (
          <p key={line.key} className={`award-mask ${line.motion} ${line.className}`}>
            <span>{copy[line.key]}</span>
          </p>
        ))}
      </div>

      <div className="max-w-full overflow-hidden rounded-[1.15rem] border border-[#F5D061]/85 bg-[#1a0208] shadow-[0_16px_36px_rgba(0,0,0,0.28)]">
        <img
          src={award.image}
          alt="تتويج نادي التمريض بالمركز الأول في حفل روّاد التفوق والتميز"
          className="block h-auto max-h-[68vh] w-auto max-w-full"
        />
      </div>
    </div>
  );
}
