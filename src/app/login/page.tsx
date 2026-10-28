'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginWithPhonePassword, registerWithPhonePassword } from '../lib/sessionAuth';

function safeNextPath() {
  if (typeof window === 'undefined') return '/';
  const raw = new URLSearchParams(window.location.search).get('next') || '';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return '/';
  return raw;
}

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      alert('الرجاء إدخال رقم الجوال وكلمة المرور.');
      return;
    }

    try {
      await loginWithPhonePassword(phone, password);
      router.push(safeNextPath());
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('لم يكمل إنشاء الحساب')) {
        setIsRegistering(true);
      }
      alert(message || 'حدث خطأ أثناء تسجيل الدخول.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !fullName.trim() || !universityId.trim()) {
      alert('الرجاء تعبئة جميع الحقول (الاسم، الجوال، الرقم الجامعي، وكلمة المرور).');
      return;
    }
    if (password.length < 6) {
      alert('يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.');
      return;
    }

    try {
      await registerWithPhonePassword({
        phone,
        password,
        fullName: fullName.trim(),
        universityId: universityId.trim(),
      });
      router.push(safeNextPath());
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء إنشاء الحساب.');
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
              <label className="text-xs font-bold text-slate-700">الرقم الجامعي</label>
              <input
                type="text"
                placeholder="مثال: 2230005939"
                value={universityId}
                onChange={(e) => setUniversityId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-[#630517]"
                dir="ltr"
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
