"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleDirectLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      localStorage.setItem("userPhone", phone.trim());
    }
    if (name.trim()) {
      localStorage.setItem("userName", name.trim());
    }
    
    // استخدام التوجيه المباشر لتجنب أي تعليق في المتصفح أو الجوال
    window.location.href = "/";
  };

  return (
    <main className="min-h-screen bg-[#630517] flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="max-w-md w-full bg-black/40 backdrop-blur-md border border-[#F5D061]/30 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-white">
        
        <div className="text-center space-y-2">
          <span className="inline-block px-4 py-1 rounded-full bg-[#F5D061]/10 border border-[#F5D061]/30 text-[#F5D061] text-xs font-bold tracking-widest uppercase">
            بوابة الأعضاء
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#FFFDF7]">تسجيل الدخول</h1>
          <p className="text-amber-50/70 text-xs sm:text-sm">أدخل الاسم، رقم الجوال، وكلمة المرور للمتابعة</p>
        </div>

        <form onSubmit={handleDirectLogin} className="space-y-4" autoComplete="off">
          <div className="space-y-1.5 text-right">
            <label className="text-xs sm:text-sm font-bold text-[#F5D061]">الاسم الكامل</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: محمدأحمد العنزي"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-[#F5D061]/20 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5D061] text-sm"
              required
            />
          </div>

          <div className="space-y-1.5 text-right">
            <label className="text-xs sm:text-sm font-bold text-[#F5D061]">رقم الجوال</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0500000000"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-[#F5D061]/20 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5D061] text-sm"
              required
            />
          </div>

          <div className="space-y-1.5 text-right">
            <label className="text-xs sm:text-sm font-bold text-[#F5D061]">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-[#F5D061]/20 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5D061] text-sm"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#630517] py-3.5 rounded-xl font-black text-sm sm:text-base hover:brightness-110 active:scale-95 transition-all shadow-lg text-center cursor-pointer"
          >
            دخول للنظام
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#F5D061]/10">
          <Link href="/" className="text-xs sm:text-sm text-amber-50/70 hover:text-[#F5D061] transition-colors">
            العودة للرئيسية ←
          </Link>
        </div>

      </div>
    </main>
  );
}