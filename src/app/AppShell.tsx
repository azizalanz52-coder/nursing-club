'use client';

import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OpeningSplash from './components/OpeningSplash';
import ClubNoticeHost from './components/ClubNotice';

const SPLASH_KEY = 'nurs_splash_seen';

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY) === '1') {
      setShowSplash(false);
      return;
    }

    const timer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, '1');
      setShowSplash(false);
    }, 3800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash ? <OpeningSplash /> : (
        <>
          <Navbar />
          {children}
        </>
      )}
      <ClubNoticeHost />
    </>
  );
}
