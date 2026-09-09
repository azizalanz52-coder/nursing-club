'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    setMounted(true);
    const name = localStorage.getItem('userName');
    const phone = localStorage.getItem('userPhone');
    if (name) setUserName(name);
    if (phone) setUserPhone(phone);
  }, []);

  // دالة إخفاء وإظهار النافبار عند التمرير
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false); // انزل لتحت -> تختفي
      } else {
        setShowNavbar(true); // اصعد لفوق -> تظهر
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleLogout = () => {
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userName');
    setUserName(null);
    setUserPhone(null);
    window.location.href = '/';
  };

  if (!mounted) return null;

  // ظهور زر لوحة التحكم والوصول مقتصر حصرياً على رقمك
  const isAdmin = userPhone === '0553731265';

  return (
    <header className={`w-full bg-white border-b border-slate-100 fixed top-0 z-50 transition-transform duration-300 ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between" dir="rtl">
        
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="شعار نادي التمريض"
            width={45}
            height={45}
            className="object-contain"
          />
          <div>
            <h1 className="font-bold text-rose-950 text-base leading-tight">نادي التمريض</h1>
            <p className="text-xs text-slate-500">جامعة حفر الباطن</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
          <Link href="/" className="hover:text-rose-900 transition-colors">الرئيسية</Link>
          <Link href="/#about" className="hover:text-rose-900 transition-colors">من نحن</Link>
          <Link href="/events" className="hover:text-rose-900 transition-colors">الفعاليات</Link>
          <Link href="/team" className="hover:text-rose-900 transition-colors">أعضاء النادي</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/join" 
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#630517] font-black text-xs sm:text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer"
          >
            تقديم طلب الانضمام
          </Link>

          {userName ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link 
                  href="/admin"
                  className="bg-[#630517] text-[#F5D061] px-3 py-2 rounded-xl text-xs font-black shadow hover:brightness-110 transition-all flex items-center gap-1"
                >
                  <span>⚙️</span>
                  <span>لوحة التحكم</span>
                </Link>
              )}

              <span className="text-xs font-bold text-rose-950 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">
                {userName}
              </span>

              <button 
                onClick={handleLogout}
                className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1"
                title="تسجيل خروج"
              >
                خروج
              </button>
            </div>
          ) : (
            <Link 
              href="/login" 
              className="text-slate-600 hover:text-rose-900 text-sm font-semibold px-3 py-2"
            >
              تسجيل الدخول
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}