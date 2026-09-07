"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleDirectLogin = () => {
    if (phone) {
      localStorage.setItem("userPhone", phone);
    }
    // استخدام أداة التوجيه الرسمية لـ Next.js
    router.push("/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#630517] flex items-center justify-center px-4 py-12" dir="rtl">
      <div className="max-w-md w-full bg-black/40 backdrop-blur-md border border-[#F5D061]/30 p-8 rounded-3xl shadow-2xl space-y-8 text-white">
        
        <div className="text-center space-y-2">
          <span className="inline-block px-4 py-1 rounded-full bg-[#F5D061]/10 border border-[#F5D061]/30 text-[#F5D061] text-xs font-bold tracking-widest uppercase">
            بوابة الأعضاء
          </span>
          <h1 className="text-3xl font-black text-[#FFFDF7]">تسجيل الدخول</h1>
          <p className="text-amber-50/70 text-sm">أدخل رقم الجوال وكلمة المرور للمتابعة</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2 text-right">
            <label className="text-sm font-bold text-[#F5D061]">رقم الجوال</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-[#F5D061]/20 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5D061] transition-all"
            />
          </div>

          <div className="space-y-2 text-right">
            <label className="text-sm font-bold text-[#F5D061]">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-[#F5D061]/20 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5D061] transition-all"
            />
          </div>

          <button
            type="button"
            onClick={handleDirectLogin}
            className="w-full bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#630517] py-3.5 rounded-xl font-black hover:brightness-110 active:scale-95 transition-all shadow-lg text-center cursor-pointer"
          >
            دخول للنظام
          </button>
        </div>

        <div className="text-center pt-2 border-t border-[#F5D061]/10">
          <Link href="/" className="text-sm text-amber-50/70 hover:text-[#F5D061] transition-colors">
            العودة للرئيسية ←
          </Link>
        </div>

      </div>
    </main>
  );
}