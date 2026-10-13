'use client';

import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import OpeningSplash from './components/OpeningSplash';

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <OpeningSplash />;
  }

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
