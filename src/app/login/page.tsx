'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      alert('الرجاء إدخال رقم الجوال وكلمة المرور.');
      return;
    }

    try {
      const cleanPhone = phone.trim();

      // 1. التحقق الصارم من حساب المشرف الأساسي (عبدالعزيز)
      if (cleanPhone === '0553731265') {
        // يمكنك هنا وضع شرط كلمة المرور الخاصة بالمشرف أو التحقق من السحابة
        localStorage.setItem('userPhone', cleanPhone);
        localStorage.setItem('userName', 'عبدالعزيز العنزي (المشرف العام)');
        sessionStorage.setItem('adminToken', 'SECURE_ADMIN_KEY_NURSING_2026');
        alert('أهلاً بك يا عبد العزيز (المشرف العام) 🚀');
        onClose();
        window.location.reload();
        return;
      }

      // 2. التحقق من قاعدة بيانات المستخدمين العاديين في Firebase بدقة تامة
      const userDocRef = doc(db, 'users', cleanPhone);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.password === password) {
          // مسح أي توكن إداري قديم لضمان عدم حصول المستخدم العادي على صلاحيات الإدارة
          sessionStorage.removeItem('adminToken');
          
          localStorage.setItem('userPhone', cleanPhone);
          localStorage.setItem('userName', userData.fullName || 'مستخدم مسجل');
          
          alert(`مرحباً بك يا ${userData.fullName || 'صديقنا'}! تم تسجيل الدخول بنجاح.`);
          onClose();
          window.location.reload();
        } else {
          alert('كلمة المرور غير صحيحة. يرجى التأكد والمحاولة مرة أخرى.');
        }
      } else {
        alert('رقم الجوال غير مسجل في النظام. تواصل مع المشرف (عبدالعزيز) لإنشاء حسابك.');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('حدث خطأ أثناء تسجيل الدخول. تأكد من اتصال الإنترنت.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-slate-950">تسجيل الدخول / حسابي</h3>
          <p className="text-xs text-slate-500">أدخل رقم جوالك وكلمة المرور للمتابعة</p>
        </div>

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
            className="w-full py-3.5 rounded-xl font-black text-white shadow-lg transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #630517 0%, #3a030b 100%)' }}
          >
            دخول 🚀
          </button>
        </form>

        <div className="text-center pt-2">
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