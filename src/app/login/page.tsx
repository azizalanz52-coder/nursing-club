'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { completeOrCreateUserAccount, isIncompleteUserAccount } from '../lib/userAccounts';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const finishLogin = (cleanPhone: string, name: string, isAdmin: boolean) => {
    localStorage.setItem('userPhone', cleanPhone);
    localStorage.setItem('userName', name);
    if (isAdmin) {
      sessionStorage.setItem('adminToken', 'SECURE_ADMIN_KEY_NURSING_2026');
    } else {
      sessionStorage.removeItem('adminToken');
    }
    router.push('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      alert('الرجاء إدخال رقم الجوال وكلمة المرور.');
      return;
    }

    try {
      const cleanPhone = phone.trim();

      if (cleanPhone === '0553731265') {
        if (password !== 'qwer8901as') {
          alert('كلمة المرور غير صحيحة لحساب المشرف العام.');
          return;
        }
        finishLogin(cleanPhone, 'عبدالعزيز العنزي (المشرف العام)', true);
        return;
      }

      const userDocRef = doc(db, 'users', cleanPhone);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (isIncompleteUserAccount(userData)) {
          alert('هذا الرقم لم يكمل إنشاء الحساب بعد. استخدم إنشاء حساب جديد واختر كلمة المرور بنفسك.');
          setIsRegistering(true);
          return;
        }
        if (userData.password === password) {
          finishLogin(cleanPhone, userData.fullName || 'مستخدم مسجل', false);
        } else {
          alert('كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مرة أخرى.');
        }
      } else {
        alert('رقم الجوال غير مسجل في النظام. يمكنك إنشاء حساب جديد من الأسفل.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('حدث خطأ أثناء تسجيل الدخول. تأكد من اتصال الإنترنت.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !fullName.trim()) {
      alert('الرجاء تعبئة جميع الحقول (الاسم، الجوال، وكلمة المرور).');
      return;
    }
    if (password.length < 6) {
      alert('يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.');
      return;
    }

    try {
      const cleanPhone = phone.trim();
      const result = await completeOrCreateUserAccount(db, {
        phone: cleanPhone,
        fullName: fullName.trim(),
        password,
      });

      if (result.status === 'exists') {
        alert('رقم الجوال مسجل مسبقاً بكلمة مرور. قم بتسجيل الدخول مباشرة.');
        setIsRegistering(false);
        return;
      }

      finishLogin(cleanPhone, fullName.trim(), false);
    } catch (err) {
      console.error('Registration error:', err);
      alert('حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-950">
            {isRegistering ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </h1>
          <p className="text-xs text-slate-500">
            {isRegistering
              ? 'إذا ظهر رقمك سابقاً بدون كلمة مرور، أكمل الحساب هنا واختر كلمة المرور بنفسك.'
              : 'أدخل رقم جوالك وكلمة المرور للمتابعة'}
          </p>
        </div>

        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">رقم الجوال</label>
              <input
                type="text"
                placeholder="05xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">كلمة المرور</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                dir="ltr"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-black text-white shadow-lg transition-all cursor-pointer hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #630517 0%, #3a030b 100%)' }}
            >
              دخول
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">الاسم الكامل</label>
              <input
                type="text"
                placeholder="مثال: محمد أحمد"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">رقم الجوال (اسم الدخول)</label>
              <input
                type="text"
                placeholder="05xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">كلمة المرور الجديدة</label>
              <input
                type="password"
                placeholder="6 خانات على الأقل"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                dir="ltr"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl font-black text-white shadow-lg transition-all cursor-pointer hover:brightness-110"
              style={{ background: 'linear-gradient(135deg, #630517 0%, #3a030b 100%)' }}
            >
              إنشاء الحساب والدخول
            </button>
          </form>
        )}

        <div className="text-center space-y-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-bold text-[#630517] hover:underline block w-full"
          >
            {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
          </button>
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 underline">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
