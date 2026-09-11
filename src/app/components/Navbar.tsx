'use client';

import { useState, useEffect } from "react";
import Link from 'next/link';
import Image from 'next/image';
import LoginModal from './LoginModal';
import { db } from '../lib/firebase';
import { doc, updateDoc, onSnapshot, collection, getDocs, query, where } from 'firebase/firestore';

export default function Navbar() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [assignedCommittee, setAssignedCommittee] = useState<string | null>(null);
  const [adminAuth, setAdminAuth] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // حالات نافذة الترقية والمباركة الاحتفالية المنفصلة
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState<boolean>(false);
  
  // حالة الأليرت بار القيادي (الإنذارات تحت النافبار)
  const [leaderAlertMsg, setLeaderAlertMsg] = useState<string | null>(null);
  const [showLeaderAlertBar, setShowLeaderAlertBar] = useState(true);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // حالات نافذة استعراض وتحميل الشهائد من النافبار
  const [showCertModal, setShowCertModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [memberCertificates, setMemberCertificates] = useState<any[]>([]);
  const [searchStatus, setSearchStatus] = useState('');

  const getRolePermissions = (roleName: string) => {
    switch (roleName) {
      case 'System Admin':
        return 'الصلاحيات المطلقة على النظام (التحكم الكامل بجميع الأقسام، حذف ونشر الفعاليات، تعديل وإدارة رتب جميع الأعضاء، استيراد وتصدير بيانات الأكسل، والتحكم بالبانرات والشرائح).';
      case 'General Supervisor':
        return 'صلاحيات الإشراف العام على الأنشطة والفعاليات ومتابعة سير العمل في لجان النادي ومراجعة طلبات الأعضاء.';
      case 'رئيس النادي':
      case 'رئيسة النادي':
        return 'إدارة شاملة لجميع لجان النادي، متابعة الفعاليات، واعتماد وقبول الأعضاء بكامل الصلاحيات القيادية.';
      case 'رئيس لجنة / مشرف قسم':
        return 'إدارة أعضاء اللجنة الخاصة به، متابعة المهام المسندة للجنة، ورفع التقارير والمقترحات.';
      case 'عضو مميز / منسق':
        return 'المشاركة الفعالة في تنظيم المبادرات والأنشطة، التنسيق بين الأعضاء، وصلاحيات مساعدة في إدارة بعض المهام.';
      default:
        return 'المشاركة في فعاليات النادي، الانضمام للجان والقروبات، والتقديم على الأنشطة والبرامج.';
    }
  };

  useEffect(() => {
    setMounted(true);
    const name = localStorage.getItem('userName');
    const phone = localStorage.getItem('userPhone');
    const isAuthAdmin = sessionStorage.getItem('adminToken') === 'SECURE_ADMIN_KEY_NURSING_2026';
    
    if (name) setUserName(name);
    if (phone) {
      setUserPhone(phone);
      updateUserPresence(phone);
    }
    setAdminAuth(isAuthAdmin);

    document.body.style.paddingTop = '85px';

    return () => {
      document.body.style.paddingTop = '0px';
    };
  }, []);

  useEffect(() => {
    if (!userPhone) return;

    const userRef = doc(db, 'users', userPhone);
    const unsubscribe = onSnapshot(userRef, (userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data();
        const currentRole = data.role || 'عضو أساسي';
        setUserRole(currentRole);

        if (data.assignedCommittee) {
          setAssignedCommittee(data.assignedCommittee);
        }

        if (data.latestNotification) {
          const notifText = data.latestNotification;
          
          if (notifText.includes('إنذار') || notifText.includes('تنبيه') || notifText.includes('تصعيد') || notifText.includes('الإحالة')) {
            setLeaderAlertMsg(notifText);
            setShowLeaderAlertBar(true);
          } else {
            setPromotionMessage(notifText);
            setShowPromotionModal(true);
          }
        }
      }
    }, (err) => {
      console.error('Error listening to user changes:', err);
    });

    return () => unsubscribe();
  }, [userPhone]);

  const updateUserPresence = async (phone: string) => {
    try {
      const userRef = doc(db, 'users', phone);
      await updateDoc(userRef, { lastActive: Date.now() });
    } catch (err) {
      console.error('Error updating presence:', err);
    }
  };

  const handleDismissPromotion = async () => {
    if (!userPhone) return;
    try {
      const userRef = doc(db, 'users', userPhone);
      await updateDoc(userRef, { latestNotification: null });
      setShowPromotionModal(false);
      setPromotionMessage(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchCertificatesFromNav = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setSearchStatus('جاري التحقق من سجل الشهائد سحابياً...');
    try {
      const certsRef = collection(db, 'club_certificates');
      const q = query(certsRef, where('memberPhone', '==', phoneInput.trim()));
      const snap = await getDocs(q);

      const foundCerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMemberCertificates(foundCerts);

      if (foundCerts.length > 0) {
        setSearchStatus(`تم العثور على (${foundCerts.length}) شهادة معتمدة بنجاح! 🎉`);
      } else {
        setSearchStatus('لا توجد شهائد مسجلة لهذا الرقم حتى الآن.');
      }
    } catch (err) {
      console.error(err);
      setSearchStatus('حدث خطأ أثناء البحث.');
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowNavbar(false);
        setMobileMenuOpen(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleLogout = () => {
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userName');
    sessionStorage.removeItem('adminToken');
    setUserName(null);
    setUserPhone(null);
    setUserRole(null);
    setAssignedCommittee(null);
    setAdminAuth(false);
    window.location.href = '/';
  };

  if (!mounted) return null;

  const isAdmin = (userPhone === '0553731265') || adminAuth || (typeof window !== 'undefined' && sessionStorage.getItem('adminToken') === 'SECURE_ADMIN_KEY_NURSING_2026') || (userRole === 'System Admin') || (userRole === 'رئيس النادي') || (userRole === 'رئيسة النادي');
  const isCommitteeLeader = userRole && (userRole.includes('رئيس لجنة') || userRole.includes('مشرف') || userRole.includes('General Supervisor'));
  const isQualityOperationsRoom = assignedCommittee?.includes('الجودة والتطوير') || userRole === 'System Admin' || userRole === 'رئيس النادي' || userRole === 'رئيسة النادي';

  const showLeaderAlertInNavbar = (isCommitteeLeader || isQualityOperationsRoom || isAdmin) && leaderAlertMsg && showLeaderAlertBar;

  return (
    <>
      {/* نافذة مباركة الترقية والاحتفال (مخصصة للتهنئة فقط) */}
      {showPromotionModal && promotionMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 border-2 border-[#F5D061] relative">
            <div className="w-20 h-20 bg-[#630517] text-[#F5D061] rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl border-4 border-white -mt-14">
              🎉
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">مبارك لك الثقة القيادية!</h3>
              <p className="text-xs text-slate-500 font-medium">{promotionMessage}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5 text-right shadow-inner">
              <span className="text-[11px] font-bold text-slate-400 block">رتبتك القيادية الحالية:</span>
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl py-2 px-4 text-center">
                <span className="text-base font-black text-[#630517]">{userRole || 'عضو أساسي'}</span>
              </div>
            </div>
            <div className="bg-amber-50/30 border border-amber-200/50 rounded-2xl p-4 space-y-1.5 text-right shadow-sm">
              <span className="text-[11px] font-bold text-amber-900 block flex items-center gap-1">
                <span>📜</span> صلاحياتك ومهامك القيادية المعتمدة:
              </span>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                {getRolePermissions(userRole || 'عضو أساسي')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissPromotion}
              className="w-full py-3.5 rounded-2xl bg-[#630517] text-[#F5D061] font-black text-sm shadow-lg hover:brightness-110 cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <span>بدء مهام العمل القيادي 🚀</span>
            </button>
          </div>
        </div>
      )}

      <header className={`w-full bg-white border-b border-slate-100 fixed top-0 z-50 transition-transform duration-300 ${showNavbar ? 'translate-y-0' : '-translate-y-full'}`}>
        
        {/* المحتوى الرئيسي للنافبار */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between" dir="rtl">
          
          <Link href="/" className="flex items-center gap-2.5 shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <Image
              src="/logo.png"
              alt="شعار نادي التمريض"
              width={40}
              height={40}
              className="object-contain"
            />
            <div>
              <h1 className="font-bold text-rose-950 text-sm sm:text-base leading-tight">نادي التمريض</h1>
              <p className="text-[11px] text-slate-500">جامعة حفر الباطن</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-700">
            <Link href="/" className="hover:text-rose-900 transition-colors">الرئيسية</Link>
            <Link href="/check-status" className="hover:text-rose-900 transition-colors text-[#630517] font-black">🔍 استعلام عن القبول</Link>
            <Link href="/events" className="hover:text-rose-900 transition-colors">الفعاليات</Link>
            <Link href="/team" className="hover:text-rose-900 transition-colors">أعضاء النادي</Link>
            
            {/* زر الشهائد المضاف خصيصاً في النافبار */}
            <button
              type="button"
              onClick={() => setShowCertModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-all font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              🎖️ الشهائد
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link 
              href="/join" 
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#630517] font-black text-xs sm:text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              تقديم طلب الانضمام
            </Link>

            {userName ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link 
                    href="/admin"
                    className="bg-[#630517] text-[#F5D061] px-3.5 py-2 rounded-xl text-xs font-black shadow hover:brightness-110 transition-all flex items-center gap-1.5"
                  >
                    <span>⚙️</span>
                    <span>لوحة التحكم</span>
                  </Link>
                )}

                {isCommitteeLeader && !isAdmin && (
                  <Link 
                    href="/committee-dashboard"
                    className={`px-3.5 py-2 rounded-xl text-xs font-black shadow transition-all flex items-center gap-1.5 ${
                      isQualityOperationsRoom 
                        ? 'bg-rose-950 text-[#F5D061] border border-amber-400 animate-pulse' 
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                  >
                    <span>{isQualityOperationsRoom ? '⚡' : '🛠️'}</span>
                    <span>{isQualityOperationsRoom ? 'غرفة العمليات المركزية' : 'لوحة اللجنة'}</span>
                  </Link>
                )}

                <div className="flex flex-col text-right bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 max-w-[140px]">
                  <span className="text-xs font-bold text-rose-950 truncate">{userName}</span>
                  <span className="text-[10px] font-black text-[#630517] truncate">{userRole || 'عضو أساسي'}</span>
                </div>

                <button 
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1"
                  title="تسجيل خروج"
                >
                  خروج
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="text-slate-600 hover:text-rose-900 text-sm font-semibold px-3 py-2 cursor-pointer"
              >
                تسجيل الدخول
              </button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <Link 
              href="/join" 
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F5D061] to-[#C99C21] text-[#630517] font-black text-[11px] shadow"
            >
              تقديم الانضمام
            </Link>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 text-slate-800 focus:outline-none"
              aria-label="القائمة"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>

        {/* 🚨 شريط الإنذار والبار القيادي (تحت الشعار داخل النافبار) */}
        {showLeaderAlertInNavbar && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white px-4 py-1.5 shadow-inner flex items-center justify-between text-xs font-black border-t border-amber-400/30" dir="rtl">
            <div className="flex items-center gap-2 mx-auto">
              <span className="text-sm animate-pulse">🚨</span>
              <span>[تنبيه غرفة العمليات لقادة اللجان]: {leaderAlertMsg}</span>
            </div>
            <button
              onClick={() => setShowLeaderAlertBar(false)}
              className="text-yellow-100 hover:text-white px-2 py-0.5 bg-black/10 rounded-lg text-[10px] cursor-pointer"
              title="إخفاء التنبيه"
            >
              ✕ إخفاء
            </button>
          </div>
        )}

        {/* قائمة الجوال المنسدلة */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full right-0 left-0 bg-white border-b border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200" dir="rtl">
            <nav className="flex flex-col space-y-3 text-sm font-bold text-slate-700 pb-4 border-b border-slate-100">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hover:text-rose-900 transition-colors py-1">الرئيسية</Link>
              <Link href="/check-status" onClick={() => setMobileMenuOpen(false)} className="text-[#630517] font-black transition-colors py-1">🔍 استعلام عن القبول</Link>
              <Link href="/events" onClick={() => setMobileMenuOpen(false)} className="hover:text-rose-900 transition-colors py-1">الفعاليات</Link>
              <Link href="/team" onClick={() => setMobileMenuOpen(false)} className="hover:text-rose-900 transition-colors py-1">أعضاء النادي</Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowCertModal(true);
                }}
                className="text-right text-amber-800 font-black py-1 flex items-center gap-2"
              >
                <span>🎖️</span> استعراض الشهائد
              </button>
            </nav>

            <div className="space-y-3 pt-1">
              {userName ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-rose-50 p-3 rounded-2xl border border-rose-100">
                    <div>
                      <span className="text-xs font-bold text-rose-950 block truncate max-w-[180px]">👤 {userName}</span>
                      <span className="text-[10px] font-black text-[#630517] block">{userRole || 'عضو أساسي'}</span>
                    </div>
                    <button onClick={handleLogout} className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1">تسجيل خروج</button>
                  </div>

                  {isAdmin && (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="w-full bg-[#630517] text-[#F5D061] py-3 rounded-2xl text-xs font-black shadow flex items-center justify-center gap-2">
                      <span>⚙️</span><span>لوحة التحكم</span>
                    </Link>
                  )}

                  {isCommitteeLeader && !isAdmin && (
                    <Link href="/committee-dashboard" onClick={() => setMobileMenuOpen(false)} className={`w-full py-3 rounded-2xl text-xs font-black shadow flex items-center justify-center gap-2 ${isQualityOperationsRoom ? 'bg-rose-950 text-[#F5D061] border border-amber-400' : 'bg-amber-600 text-white'}`}>
                      <span>{isQualityOperationsRoom ? '⚡' : '🛠️'}</span>
                      <span>{isQualityOperationsRoom ? 'غرفة العمليات المركزية' : 'لوحة تحكم اللجنة'}</span>
                    </Link>
                  )}
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="block text-center w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  تسجيل الدخول
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* نافذة منبثقة لاستعراض وتحميل الشهائد مباشرة من النافبار */}
      {showCertModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 border-2 border-amber-400">
            <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg">
              🎖️
            </div>
            
            <div className="space-y-1 text-center">
              <h3 className="text-xl font-black">بوابة استعراض وتحميل الشهائد</h3>
              <p className="text-xs text-slate-500">أدخل رقم جوالك وكلمة المرور لتحميل شهاداتك الفخرية المعتمدة فوراً:</p>
            </div>

            <form onSubmit={handleFetchCertificatesFromNav} className="space-y-4">
              <input
                type="text"
                placeholder="رقم الجوال (05XXXXXXXX)"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 bg-white"
                dir="ltr"
                required
              />
              <input
                type="password"
                placeholder="كلمة المرور"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 bg-white"
                required
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-600 text-white font-black text-xs shadow hover:bg-amber-700 cursor-pointer transition-all"
              >
                بحث واستعراض الشهائد 🔍
              </button>
            </form>

            {searchStatus && (
              <p className="text-xs text-amber-800 font-bold text-center bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                {searchStatus}
              </p>
            )}

            {memberCertificates.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto pt-2">
                {memberCertificates.map((cert) => (
                  <div key={cert.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-extrabold text-slate-900 block">{cert.eventTitle}</span>
                      <span className="text-[10px] text-slate-500">إصدار: {cert.issueDate} | العضو: {cert.memberName}</span>
                    </div>
                    <a
                      href={cert.certFileUrl}
                      download="certificate.jpg"
                      className="px-3 py-1.5 bg-amber-600 text-white font-bold rounded-lg shadow hover:bg-amber-700"
                    >
                      تحميل 📥
                    </a>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowCertModal(false);
                setMemberCertificates([]);
                setSearchStatus('');
                setPhoneInput('');
                setPasswordInput('');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 cursor-pointer"
            >
              إغلاق ✕
            </button>
          </div>
        </div>
      )}

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}