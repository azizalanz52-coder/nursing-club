'use client';

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const name = localStorage.getItem('userName');
    const phone = localStorage.getItem('userPhone');
    if (name) setUserName(name);
    if (phone) setUserPhone(phone);

    // إضافة مسافة علوية تلقائية للجسم لمنع النافبار من تغطية المحتوى في أي صفحة
    document.body.style.paddingTop = '80px';

    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  // دالة إخفاء وإظهار النافبار عند التمرير
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false); // انزل لتحت -> تختفي
        setMobileMenuOpen(false); // إغلاق القائمة عند النزول
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
        
        {/* الشعار */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMobileMenuOpen(false)}>
          <Image
            src="/logo.png"
            alt="شعار نادي التمريض"
            width={40}
            height={40}
            className="object-contain"
          />
          <div>
            <h1 className="font-bold text-rose-950 text-sm sm:text-base leading-tight">نادي التمريض</h1>
            <p className="text-[11px] text-slate-500">جامعة حفر الباطن</p>
          </div>
        </Link>

        {/* روابط سطح المكتب */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
          <Link href="/" className="hover:text-rose-900 transition-colors">الرئيسية</Link>
          <Link href="/check-status" className="hover:text-rose-900 transition-colors text-[#630517] font-black">🔍 استعلام عن القبول</Link>
          <Link href="/events" className="hover:text-rose-900 transition-colors">الفعاليات</Link>
          <Link href="/team" className="hover:text-rose-900 transition-colors">أعضاء النادي</Link>
        </nav>

        {/* أزرار الحساب والإجراءات لسطح المكتب */}
        <div className="hidden md:flex items-center gap-3">
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

              <span className="text-xs font-bold text-rose-950 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 max-w-[120px] truncate">
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

        {/* زر القائمة (Hamburger Menu) للجوال */}
        <div className="flex md:hidden items-center gap-2">
          <Link 
            href="/join" 
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F5D061] to-[#C99C21] text-[#630517] font-black text-[11px] shadow"
          >
            تقديم الانضمام للنادي
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 text-slate-800 focus:outline-none"
            aria-label="القائمة"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

      </div>

      {/* قائمة الجوال المنسدلة (Mobile Dropdown Menu) */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 right-0 left-0 bg-white border-b border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200" dir="rtl">
          <nav className="flex flex-col space-y-3 text-sm font-bold text-slate-700 pb-4 border-b border-slate-100">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-rose-900 transition-colors py-1"
            >
              الرئيسية
            </Link>
            <Link 
              href="/check-status" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#630517] font-black transition-colors py-1"
            >
              🔍 استعلام عن القبول
            </Link>
            <Link 
              href="/events" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-rose-900 transition-colors py-1"
            >
              الفعاليات
            </Link>
            <Link 
              href="/team" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-rose-900 transition-colors py-1"
            >
              أعضاء النادي
            </Link>
          </nav>

          <div className="space-y-3 pt-1">
            {userName ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-rose-50 p-3 rounded-2xl border border-rose-100">
                  <span className="text-xs font-bold text-rose-950 truncate max-w-[180px]">
                    👤 {userName}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1"
                  >
                    تسجيل خروج
                  </button>
                </div>

                {isAdmin && (
                  <Link 
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full bg-[#630517] text-[#F5D061] py-3 rounded-2xl text-xs font-black shadow flex items-center justify-center gap-2"
                  >
                    <span>⚙️</span>
                    <span>لوحة التحكم</span>
                  </Link>
                )}
              </div>
            ) : (
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}