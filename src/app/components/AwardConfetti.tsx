'use client';

import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { BANNER_CONTROL_DOC, readBannerControl } from '../lib/clubAwardCelebration';
import { doc, getDoc } from 'firebase/firestore';

const PIECES = [
  { left: '3%', delay: '0s', duration: '7.2s', color: '#F5D061', w: 10, h: 16, round: false },
  { left: '8%', delay: '1.4s', duration: '8.1s', color: '#fff6d6', w: 8, h: 8, round: true },
  { left: '13%', delay: '0.4s', duration: '6.6s', color: '#e8c96a', w: 9, h: 18, round: false },
  { left: '18%', delay: '2.1s', duration: '7.8s', color: '#F5D061', w: 14, h: 14, round: true },
  { left: '24%', delay: '0.8s', duration: '6.9s', color: '#fff', w: 7, h: 14, round: false },
  { left: '29%', delay: '1.8s', duration: '8.4s', color: '#c9a227', w: 11, h: 11, round: true },
  { left: '35%', delay: '0.2s', duration: '7.1s', color: '#F5D061', w: 8, h: 16, round: false },
  { left: '41%', delay: '2.6s', duration: '8.8s', color: '#fff6d6', w: 10, h: 10, round: true },
  { left: '47%', delay: '1.1s', duration: '6.4s', color: '#e8c96a', w: 7, h: 18, round: false },
  { left: '53%', delay: '0.6s', duration: '7.6s', color: '#F5D061', w: 16, h: 16, round: true },
  { left: '59%', delay: '2.2s', duration: '8.2s', color: '#fff', w: 8, h: 15, round: false },
  { left: '64%', delay: '1.5s', duration: '6.8s', color: '#F5D061', w: 9, h: 9, round: true },
  { left: '70%', delay: '0.3s', duration: '7.9s', color: '#ffe7a3', w: 8, h: 17, round: false },
  { left: '76%', delay: '1.9s', duration: '8.5s', color: '#c9a227', w: 13, h: 13, round: true },
  { left: '82%', delay: '0.7s', duration: '6.7s', color: '#F5D061', w: 7, h: 14, round: false },
  { left: '88%', delay: '2.4s', duration: '7.4s', color: '#fff6d6', w: 10, h: 10, round: true },
  { left: '93%', delay: '1.2s', duration: '8s', color: '#e8c96a', w: 9, h: 16, round: false },
  { left: '97%', delay: '0.5s', duration: '6.5s', color: '#F5D061', w: 8, h: 8, round: true },
];

export default function AwardConfetti() {
  const [live, setLive] = useState(false);

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

  if (!live) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden [container-type:size]" aria-hidden>
      <style>{`
        @keyframes awardPageFall {
          0% { transform: translateY(-24px) rotate(0deg); opacity: 0; }
          12% { opacity: 0.9; }
          75% { opacity: 0.7; }
          100% { transform: translateY(100cqh) rotate(210deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .award-page-piece { animation: none !important; opacity: 0; }
        }
      `}</style>
      {PIECES.map((piece) => (
        <span
          key={piece.left}
          className="award-page-piece absolute top-0"
          style={{
            left: piece.left,
            width: piece.w,
            height: piece.h,
            background: piece.color,
            borderRadius: piece.round ? '999px' : '2px',
            boxShadow: piece.round ? '0 0 10px rgba(245,208,97,0.65)' : undefined,
            animation: `awardPageFall ${piece.duration} ${piece.delay} linear infinite`,
          }}
        />
      ))}
    </div>
  );
}
