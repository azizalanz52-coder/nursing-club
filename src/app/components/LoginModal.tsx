'use client';

import React, { useState } from 'react';
import { loginWithPhonePassword, registerWithPhonePassword } from '../lib/sessionAuth';
import { clubNotice } from '../lib/clubNotice';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false); // للتبديل بين تسجيل الدخول وإنشاء الحساب

  if (!isOpen) return null;

  // --- دالة تسجيل الدخول ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      await clubNotice('الرجاء إدخال رقم الجوال وكلمة المرور.', 'info');
      return;
    }

    try {
      const session = await loginWithPhonePassword(phone, password);
      await clubNotice(`مرحباً بك يا ${session.fullName || 'صديقنا'}! تم تسجيل الدخول بنجاح.`, 'success');
      onClose();
      window.location.reload();
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('لم يكمل إنشاء الحساب')) {
        setIsRegistering(true);
      }
      await clubNotice(message || 'حدث خطأ أثناء تسجيل الدخول.', 'error');
    }
  };

  // --- دالة إنشاء حساب جديد تلقائياً ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password || !fullName.trim() || !universityId.trim()) {
      await clubNotice('الرجاء تعبئة جميع الحقول (الاسم، الجوال، الرقم الجامعي، وكلمة المرور).', 'info');
      return;
    }

    if (password.length < 6) {
      await clubNotice('يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.', 'info');
      return;
    }

    try {
      const result = await registerWithPhonePassword({
        phone,
        password,
        fullName: fullName.trim(),
        universityId: universityId.trim(),
      });
      await clubNotice(
        result.claimed
          ? `مرحباً بك يا ${fullName.trim()}! تم إكمال حسابك وتعيين كلمة المرور بنجاح.`
          : `مرحباً بك يا ${fullName.trim()}! تم إنشاء حسابك وتسجيل دخولك بنجاح.`,
        'success'
      );
      onClose();
      window.location.reload();
    } catch (err: any) {
      await clubNotice(err?.message || 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.', 'error');
    }
  };

  // --- دالة نسيت كلمة المرور (التوجيه للواتساب الخاص بك) ---
  const handleForgotPassword = () => {
    const whatsappUrl = `https://wa.me/966553731265?text=${encodeURIComponent('السلام عليكم ، نسيت كلمة المرور الخاصة بحسابي')}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4" dir="rtl">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border border-slate-100">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-black text-slate-950">
            {isRegistering ? 'إنشاء حساب جديد 📝' : 'تسجيل الدخول / حسابي'}
          </h3>
          <p className="text-xs text-slate-500">
            {isRegistering
              ? 'إذا ظهر رقمك سابقاً بدون كلمة مرور، أكمل الحساب هنا واختر كلمة المرور بنفسك.'
              : 'أدخل رقم جوالك وكلمة المرور للمتابعة'}
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
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">كلمة المرور</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-bold text-[#630517] hover:underline"
                >
                  نسيت كلمة المرور؟ 🔑
                </button>
              </div>
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