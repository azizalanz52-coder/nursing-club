'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { emailToPhone, isAdminPhone } from '../lib/authIdentity';
import { clubNotice } from '../lib/clubNotice';
import { findUserDoc, resolveMemberAcceptance } from '../lib/memberAcceptance';
import {
  PROFILE_LATER_KEY,
  isValidUniversityId,
  persistUniversityId,
  readStoredUniversityId,
  saveUniversityIdAndLink,
} from '../lib/memberIdentity';
import { loginWithPhonePassword, registerWithPhonePassword } from '../lib/sessionAuth';
import { canonicalPhone, normalizeUniversityId } from '../lib/certificatesLookup';

export default function CompleteProfileGate() {
  const [ready, setReady] = useState(false);
  const [needed, setNeeded] = useState(false);
  const [hasAuth, setHasAuth] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const [open, setOpen] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [universityId, setUniversityId] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const storedPhone = localStorage.getItem('userPhone') || '';
      const authPhone = emailToPhone(user?.email);
      const phoneValue = storedPhone || authPhone;

      if (isAdminPhone(phoneValue) || isAdminPhone(authPhone)) {
        setNeeded(false);
        setReady(true);
        return;
      }

      let linked = readStoredUniversityId();
      if (phoneValue) {
        try {
          const found = await findUserDoc(db, phoneValue);
          const fromDoc = normalizeUniversityId(found?.data?.universityId);
          const acceptance = await resolveMemberAcceptance(db, phoneValue, found?.data || null);
          const fromApp = normalizeUniversityId(acceptance?.universityId);
          if (fromDoc) {
            persistUniversityId(fromDoc);
            linked = fromDoc;
          } else if (fromApp) {
            setUniversityId(fromApp);
          }
        } catch (err) {
          console.error(err);
        }
      }

      if (linked) {
        setNeeded(false);
        setReady(true);
        return;
      }

      setPhone(canonicalPhone(phoneValue) || phoneValue);
      setHasAuth(Boolean(user));
      setDeferred(sessionStorage.getItem(PROFILE_LATER_KEY) === '1');
      setNeeded(true);
      setReady(true);
    });

    return () => unsub();
  }, []);

  const finishLater = () => {
    sessionStorage.setItem(PROFILE_LATER_KEY, '1');
    setDeferred(true);
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uni = normalizeUniversityId(universityId);
    if (!isValidUniversityId(uni)) {
      await clubNotice('أدخل الرقم الجامعي الصحيح (6 إلى 12 خانة) لربط شهاداتك.', 'info');
      return;
    }

    setSaving(true);
    try {
      if (!hasAuth) {
        if (isRegistering) {
          if (!fullName.trim() || !phone.trim() || password.length < 6) {
            await clubNotice('أدخل الاسم والجوال وكلمة المرور والرقم الجامعي.', 'info');
            setSaving(false);
            return;
          }
          await registerWithPhonePassword({
            phone,
            password,
            fullName: fullName.trim(),
            universityId: uni,
          });
        } else {
          if (!phone.trim() || !password) {
            await clubNotice('أدخل رقم الجوال وكلمة المرور مع الرقم الجامعي.', 'info');
            setSaving(false);
            return;
          }
          await loginWithPhonePassword(phone, password);
        }
      }

      await saveUniversityIdAndLink(db, uni, phone);
      sessionStorage.removeItem(PROFILE_LATER_KEY);
      setNeeded(false);
      await clubNotice('تم ربط الرقم الجامعي بجوالك. استعلام الشهادات صار على الاثنين معاً.', 'success');
      window.location.reload();
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.includes('لم يكمل إنشاء الحساب')) {
        setIsRegistering(true);
      }
      await clubNotice(message || 'تعذر حفظ الرقم الجامعي. حاول مرة أخرى.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!ready || !needed) return null;

  if (deferred && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-4 z-[180] max-w-[16.5rem] rounded-2xl bg-[#630517] text-[#F5D061] px-4 py-3 text-[13px] font-black shadow-[0_12px_30px_rgba(99,5,23,0.35)] text-right leading-6"
        dir="rtl"
      >
        أكمل تسجيل دخولك — أدخل الرقم الجامعي
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-md" />
      <div className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-[1.7rem] bg-white shadow-[0_24px_60px_rgba(99,5,23,0.25)]">
        <div className="h-1.5 bg-[#F5D061]" />
        <form onSubmit={handleSubmit} className="px-6 pt-6 pb-5 space-y-4">
          <div className="text-center space-y-1.5">
            <p className="text-[#F5D061] bg-[#630517] inline-block px-3 py-1 rounded-full text-[11px] font-black">تنبيه مهم</p>
            <h2 className="text-[#630517] text-[1.2rem] font-black leading-snug">أكمل تسجيل دخولك</h2>
            <p className="text-slate-600 text-[15px] font-medium leading-7">
              أدخل الرقم الجامعي حتى نربط شهاداتك برقم جوالك. الاستعلام يصير بالجوال أو الجامعي لنفس الشخص.
            </p>
          </div>

          {!hasAuth && (
            <>
              {isRegistering && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الاسم الكامل</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="الاسم الرباعي"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] text-slate-900 focus:outline-none focus:border-[#630517]"
                    required
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">رقم الجوال</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] font-mono text-slate-900 focus:outline-none focus:border-[#630517]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">كلمة المرور</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] text-slate-900 focus:outline-none focus:border-[#630517]"
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">الرقم الجامعي</label>
            <input
              value={universityId}
              onChange={(e) => setUniversityId(e.target.value)}
              placeholder="مثال: 2230005939"
              dir="ltr"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-[15px] font-mono text-slate-900 focus:outline-none focus:border-[#630517]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-[15px] hover:brightness-110 disabled:opacity-60"
          >
            {saving ? 'جاري الربط...' : hasAuth ? 'حفظ وربط الشهادات' : isRegistering ? 'إنشاء الحساب وربط الرقم' : 'دخول وربط الرقم الجامعي'}
          </button>

          {!hasAuth && (
            <button
              type="button"
              onClick={() => setIsRegistering((value) => !value)}
              className="w-full text-[13px] font-bold text-[#630517] hover:underline"
            >
              {isRegistering ? 'لديك حساب؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
            </button>
          )}

          <button
            type="button"
            onClick={finishLater}
            className="w-full text-[13px] text-slate-400 hover:text-slate-600"
          >
            لاحقاً
          </button>
        </form>
      </div>
    </div>
  );
}
