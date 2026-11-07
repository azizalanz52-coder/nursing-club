'use client';

import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OpeningSplash from './components/OpeningSplash';
import ClubNoticeHost from './components/ClubNotice';
import MonthCelebrationNotice from './components/MonthCelebrationNotice';
import { warmPublicCloud } from './lib/cloudCache';

const SPLASH_KEY = 'nurs_splash_seen';

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // تأخير أطول حتى لا يتزاحم مع أول رسم للصفحة + يشتغل مرة لكل جلسة فقط.
    const warm = window.setTimeout(() => warmPublicCloud(), 2500);

    if (sessionStorage.getItem(SPLASH_KEY) === '1') {
      return () => window.clearTimeout(warm);
    }

    setShowSplash(true);
    const timer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, '1');
      setShowSplash(false);
    }, 2400);
    return () => {
      window.clearTimeout(warm);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <Navbar />
      {children}
      {showSplash ? <OpeningSplash /> : null}
      <MonthCelebrationNotice />
      <ClubNoticeHost />
    </>
  );
}
