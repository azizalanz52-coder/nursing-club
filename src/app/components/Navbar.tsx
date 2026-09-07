'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <header className="w-full bg-white border-b border-slate-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between" dir="rtl">
        
        {/* الشعار واسم النادي */}
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

        {/* روابط القائمة */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-700">
          <Link href="/" className="hover:text-rose-900 transition-colors">الرئيسية</Link>
          <Link href="/#about" className="hover:text-rose-900 transition-colors">من نحن</Link>
          <Link href="/events" className="hover:text-rose-900 transition-colors">الفعاليات</Link>
          <Link href="/team" className="hover:text-rose-900 transition-colors">أعضاء النادي</Link>
        </nav>

        {/* أزرار التفاعل (التقديم وتسجيل الدخول) */}
        <div className="flex items-center gap-3">
          <Link 
            href="/join" 
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-sm"
          >
            انضم للنادي
          </Link>
          <Link 
            href="/login" 
            className="text-slate-600 hover:text-rose-900 text-sm font-semibold px-3 py-2"
          >
            دخول
          </Link>
        </div>

      </div>
    </header>
  );
}