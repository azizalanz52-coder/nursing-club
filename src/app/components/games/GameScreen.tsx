'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { canonicalPhone } from '../../lib/certificatesLookup';
import { emailToPhone } from '../../lib/authIdentity';
import DailyBoard from './DailyBoard';
import type { GameId } from '../../lib/gameActivity';

type Player = { phone: string; name: string };

export default function GameScreen({
  title,
  subtitle,
  game,
  loginNext,
  children,
}: {
  title: string;
  subtitle?: string;
  game: GameId;
  loginNext: string;
  children: (player: Player, onPlayed: () => void) => React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessionDropped, setSessionDropped] = useState(false);
  const [boardTick, setBoardTick] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const phone = canonicalPhone(emailToPhone(user?.email || ''));
      const stored = canonicalPhone(localStorage.getItem('userPhone') || '');
      const name = localStorage.getItem('userName') || localStorage.getItem('fullName') || '';
      setSessionDropped(Boolean(stored) && !user);
      setPlayer(user && phone ? { phone, name } : null);
      setReady(true);
    });
  }, []);

  return (
    <main className="min-h-[80vh] bg-[linear-gradient(180deg,#1a0208_0%,#3a020c_55%,#1a0208_100%)] px-4 py-8 text-white sm:px-6" dir="rtl">
      <div className="mx-auto max-w-md space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link href="/games" className="inline-flex rounded-2xl border border-[#F5D061]/50 bg-[#F5D061] px-4 py-3 text-xs font-black text-[#630517]">
            العودة لقائمة الألعاب
          </Link>
          {player ? <DailyBoard game={game} phone={player.phone} refresh={boardTick} /> : null}
        </div>
        <div>
          <h1 className="text-2xl font-black">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm font-bold text-[#F5D061]">{subtitle}</p> : null}
        </div>
        {!ready ? <p className="text-center text-sm font-bold text-[#F5D061]">نتحقق من حسابك...</p> : null}
        {ready && !player ? (
          <div className="rounded-[2rem] border border-[#F5D061]/40 bg-[#fff6d6] p-6 text-center text-[#1a0208]">
            <h2 className="text-2xl font-black">{sessionDropped ? 'جلستك انقطعت' : 'سجّل دخولك عشان تلعب'}</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed">
              {sessionDropped
                ? 'النتيجة ما تنحفظ في الصدارة إلا والحساب متصل. ادخل مرة ثانية.'
                : 'الألعاب للحسابات المسجلة، عشان نعرف مين تفاعل اليوم.'}
            </p>
            <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="mt-5 inline-flex rounded-2xl bg-[#630517] px-6 py-3 text-sm font-black text-[#F5D061]">
              تسجيل الدخول
            </Link>
          </div>
        ) : null}
        {player ? children(player, () => setBoardTick((value) => value + 1)) : null}
      </div>
    </main>
  );
}
