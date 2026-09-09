'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // للتبديل بين تسجيل الدخول وإنشاء الحساب
  const router = useRouter();

  if (!isOpen) return null;

  // --- دالة تسجيل الدخول ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      alert('الرجاء إدخال رقم الجوال وكلمة المرور.');
      return;
    }

    try {
      const cleanPhone = phone.trim();

      // 1. حماية صارمة خاصة بمدير النظام (عبدالعزيز) برقم الجوال وكلمة المرور السرية الحصرية
      if (cleanPhone === '0553731265') {
        if (password !== 'qwer8901as') {
          alert('كلمة المرور غير صحيحة لحساب المشرف العام.');
          return;
        }
        localStorage.setItem('userPhone', cleanPhone);
        localStorage.setItem('userName', 'عبدالعزيز العنزي (المشرف العام)');
        sessionStorage.setItem('adminToken', 'SECURE_ADMIN_KEY_NURSING_2026');
        alert('أهلاً بك يا عبد العزيز (المشرف العام) 🚀');
        onClose();
        window.location.reload();
        return;
      }

      // 2. التحقق من قاعدة بيانات المستخدمين في Firebase
      const userDocRef = doc(db, 'users', cleanPhone);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.password === password) {
          sessionStorage.removeItem('adminToken'); // منع أي مستخدم عادي من أخذ صلاحية الأدمن
          localStorage.setItem('userPhone', cleanPhone);
          localStorage.setItem('userName', userData.fullName || 'مستخدم مسجل');
          alert(`مرحباً بك يا ${userData.fullName || 'صديقنا'}! تم تسجيل الدخول بنجاح.`);
          onClose();
          window.location.reload();
        } else {
          alert('كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مرة أخرى.');
        }
      } else {
        alert('رقم الجوال غير مسجل في النظام. يمكنك الضغط على "إنشاء حساب جديد" بالأسفل.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('حدث خطأ أثناء تسجيل الدخول. تأكد من اتصال الإنترنت.');
    }
  };

  // --- دالة إنشاء حساب جديد تلقائياً (بدون تدخل منك) ---
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
      const userDocRef = doc(db, 'users', cleanPhone);
      
      // التأكد أن الرقم غير مسجل مسبقاً
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        alert('رقم الجوال مسجل مسبقاً! قم بتسجيل الدخول مباشرة.');
        setIsRegistering(false);
        return;
      }

      // حفظ الحساب الجديد في فايربيس مع حماية الرتبة الافتراضية
      const newUserObj = {
        fullName: fullName.trim(),
        phone: cleanPhone,
        password: password,
        role: 'عضو أساسي',
        createdAt: new Date().toISOString()
      };

      await setDoc(userDocRef, newUserObj);

      // تسجيل دخول العضو مباشرة
      sessionStorage.removeItem('adminToken');
      localStorage.setItem('userPhone', cleanPhone);
      localStorage.setItem('userName', fullName.trim());

      alert(`مرحباً بك يا ${fullName.trim()}! تم إنشـاء حسابك وتسجيل دخولك بنجاح 🎉`);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error('Registration error:', err);
      alert('حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-slate-950">
            {isRegistering ? 'إنشاء حساب جديد 📝' : 'تسجيل الدخول / حسابي'}
          </h3>
          <p className="text-xs text-slate-500">
            {isRegistering ? 'أدخل بياناتك للانضمام فوراً لنظام النادي' : 'أدخل رقم جوالك وكلمة المرور للمتابعة'}
          </p>
        </div>

        {/* نموذج تسجيل الدخول */}
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
              دخول 🚀
            </button>
          </form>
        ) : (
          /* نموذج إنشاء حساب جديد */
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
              إنشاء الحساب والدخول فوراً ✨
            </button>
          </form>
        )}

        {/* أزرار التبديل والإغلاق */}
        <div className="text-center space-y-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-xs font-bold text-[#630517] hover:underline block w-full"
          >
            {isRegistering ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد 📝'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
}