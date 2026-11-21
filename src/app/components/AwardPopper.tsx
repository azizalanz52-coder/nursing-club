'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { db } from '../lib/firebase';
import { BANNER_CONTROL_DOC, readBannerControl } from '../lib/clubAwardCelebration';
import { doc, getDoc } from 'firebase/firestore';

const AWARD_PATHS = new Set(['/', '/case-study']);
const SPLASH_KEY = 'nurs_splash_seen';

let burstPlayedThisVisit = false;

type Streamer = { dx: number; dy: number; rot: number; delay: string; w: number; h: number; color: string };

const COLORS = ['#F5D061', '#fff6d6', '#ffffff', '#e8c96a', '#c9a227', '#ffe7a3'];

const LEFT: Streamer[] = Array.from({ length: 22 }, (_, i) => {
  const t = i / 21;
  const angle = ((18 + t * 112) * Math.PI) / 180;
  const dist = 170 + (i % 5) * 36;
  return {
    dx: Math.round(Math.cos(angle) * dist),
    dy: Math.round(-Math.sin(angle) * dist),
    rot: Math.round((t - 0.5) * 90),
    delay: `${(i % 7) * 0.012}s`,
    w: i % 3 === 0 ? 9 : 6,
    h: 46 + (i % 5) * 12,
    color: COLORS[i % COLORS.length],
  };
});

const RIGHT: Streamer[] = LEFT.map((piece) => ({ ...piece, dx: -piece.dx, rot: -piece.rot }));

function PopperBurst({ side }: { side: 'left' | 'right' }) {
  const pieces = side === 'left' ? LEFT : RIGHT;
  return (
    <div className={`absolute bottom-[16%] ${side === 'left' ? 'left-[7%]' : 'right-[7%]'} h-8 w-8`}>
      <span
        className="absolute bottom-0 left-1/2 h-7 w-4 -translate-x-1/2 rounded-b-sm bg-gradient-to-b from-[#F5D061] to-[#c9a227]"
        style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 100%, 0 100%)' }}
      />
      {pieces.map((piece, index) => (
        <span
          key={`${side}-${index}`}
          className="award-popper-ribbon absolute bottom-2 left-1/2"
          style={{
            width: piece.w,
            height: piece.h,
            background: piece.color,
            borderRadius: 2,
            ['--dx' as string]: `${piece.dx}px`,
            ['--dy' as string]: `${piece.dy}px`,
            ['--rot' as string]: `${piece.rot}deg`,
            animation: `awardPopper 3.4s ${piece.delay} cubic-bezier(0.12, 0.75, 0.2, 1) both`,
          }}
        />
      ))}
    </div>
  );
}

export default function AwardPopper() {
  const path = usePathname();
  const [live, setLive] = useState(false);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      void getDoc(doc(db, 'site_settings', BANNER_CONTROL_DOC))
        .then((snap) => {
          if (!cancelled) setLive(!readBannerControl(snap.data()).posterRetired);
        })
        .catch(() => {
          if (!cancelled) setLive(true);
        });
    };
    sync();
    const timer = window.setInterval(sync, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!live || !AWARD_PATHS.has(path || '') || burstPlayedThisVisit) return;
    const wait = sessionStorage.getItem(SPLASH_KEY) === '1' ? 400 : 2700;
    const timer = window.setTimeout(() => {
      burstPlayedThisVisit = true;
      setPlay(true);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [live, path]);

  useEffect(() => {
    if (!play) return;
    const timer = window.setTimeout(() => setPlay(false), 3800);
    return () => window.clearTimeout(timer);
  }, [play]);

  if (!play) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[45] overflow-hidden" aria-hidden>
      <style>{`
        @keyframes awardPopper {
          0% { transform: translate(-50%, 0) rotate(0deg) scaleY(0.15); opacity: 0; }
          7% { opacity: 1; }
          24% { transform: translate(calc(-50% + var(--dx)), var(--dy)) rotate(var(--rot)) scaleY(1); opacity: 1; }
          46% { transform: translate(calc(-50% + var(--dx) * 0.9), calc(var(--dy) + 24px)) rotate(calc(var(--rot) + 24deg)) scaleY(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--dx) * 0.28), calc(var(--dy) + 72vh)) rotate(calc(var(--rot) + 170deg)) scaleY(1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .award-popper-ribbon { animation: none !important; opacity: 0; }
        }
      `}</style>
      <PopperBurst side="left" />
      <PopperBurst side="right" />
    </div>
  );
}
