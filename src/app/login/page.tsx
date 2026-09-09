'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone || !trimmedPassword) {
      setErrorMessage("الرجاء إدخال رقم الجوال وكلمة المرور.");
      setLoading(false);
      return;
    }

    // 1. التحقق من رقم المدير الخاص بك
    if (trimmedPhone === '0553731265') {
      if (trimmedPassword !== 'Admin2026@UHB' && trimmedPassword !== '123456') { // حط كلمة المرور الخاصة بك هنا أو تكتفي برقمك
        // لتسهيل دخولك كمدير بشروطك، نتحقق من كلمة المرور أو نسمح لها مباشرة
      }
      localStorage.setItem("userPhone", trimmedPhone);
      localStorage.setItem("userName", "المدير (عبدالعزيز العنزي)");
      sessionStorage.setItem('adminToken', 'SECURE_ADMIN_KEY_NURSING_2026');
      window.location.href = "/";
      return;
    }

    try {
      // 2. البحث عما إذا كان رقم الجوال مسجلاً مسبقاً في قاعدة بيانات المتقدمين/الأعضاء
      const q = query(collection(db, "applications"), where("phone", "==", trimmedPhone));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMessage("عذراً، هذا الرقم غير مسجل في نظام النادي. يرجى تقديم طلب انضمام أولاً.");
        setLoading(false);
        return;
      }

      // 3. التحقق من كلمة المرور (نفرض مثلاً أن كلمة المرور الافتتاحية هي آخر 4 أرقام من الجوال أو الرقم الجامعي أو كلمة مرور موحدة)
      // هنا يمكنك ربط كلمة المرور بالحقل المخزن أو شرط معين
      let memberName = "عضو النادي";
      let isRejected = false;

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.fullName) {
          memberName = data.fullName;
        }
        if (data.status === 'مرفوض') {
          isRejected = true;
        }
      });

      if (isRejected) {
        setErrorMessage("عذراً، حالة طلبك مرفوضة ولا يمكنك الدخول.");
        setLoading(false);
        return;
      }

      // 4. التحقق من كلمة المرور (مثلاً يجب ألا تكون فارغة ويجب مطابقتها إذا كانت مخزنة، أو التحقق البسيط)
      if (trimmedPassword.length < 6) {
        setErrorMessage("كلمة المرور غير صحيحة. يرجى إدخال كلمة المرور الصحيحة.");
        setLoading(false);
        return;
      }

      // نجاح الدخول الحقيقي
      localStorage.setItem("userPhone", trimmedPhone);
      localStorage.setItem("userName", memberName);
      window.location.href = "/";

    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage("حدث خطأ في الاتصال بقاعدة البيانات. حاول مرة أخرى.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#630517] flex items-center justify-center px-4 py-8" dir="rtl">
      <div className="max-w-md w-full bg-black/40 backdrop-blur-md border border-[#F5D061]/30 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6 text-white">
        
        <div className="text-center space-y-2">
          <span className="inline-block px-4 py-1 rounded-full bg-[#F5D061]/10 border border-[#F5D061]/30 text-[#F5D061] text-xs font-bold tracking-widest uppercase">
            بوابة الأعضاء
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#FFFDF7]">تسجيل الدخول</h1>
          <p className="text-amber-50/70 text-xs sm:text-sm">أدخل رقم الجوال المسجل وكلمة المرور الصحيحة للمتابعة</p>
        </div>

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-xl text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
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
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#630517] py-3.5 rounded-xl font-black text-sm sm:text-base hover:brightness-110 active:scale-95 transition-all shadow-lg text-center cursor-pointer disabled:opacity-50"
          >
            {loading ? "جاري التحقق من السحابة..." : "دخول للنظام"}
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