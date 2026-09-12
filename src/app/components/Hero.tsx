'use client';

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

export default function Hero() {
  const [banners, setBanners] = useState([
    {
      id: 'main',
      tag: 'مرحباً بكم ',
      title: 'نادي التمريض ',
      description: 'مجتمع طلابي يهدف إلى تطوير المعرفة، وبناء المهارات القيادية، وصناعة أثر في مجال التمريض بجامعة حفر الباطن.',
      image: '/header-banner.png',
      buttonText: 'اكتشف النادي',
      buttonLink: '/discover',
    },
    {
      id: 'national-day',
      tag: 'اليوم الوطني السعودي 🇸🇦',
      title: 'نحتفل بالوطن ونمضي قدماً بالعطاء',
      description: 'نرفع أسمى آيات التهاني والتبريكات للقيادة الرشيدة بمناسبة اليوم الوطني المجيد.',
      image: '/header-banner.png',
      buttonText: 'فعاليات اليوم الوطني',
      buttonLink: '/events',
    },
  ]);

  const [acceptedData, setAcceptedData] = useState<{ committee: string; whatsapp: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  // --- States خاصة بتهنئة الترقية والصلاحيات القيادية ---
  const [showRoleCongratModal, setShowRoleCongratModal] = useState(false);
  const [myNewRole, setMyNewRole] = useState('');
  const [myPermissions, setMyPermissions] = useState('');

  useEffect(() => {
    const savedBanners = localStorage.getItem('UHB_BANNERS');
    if (savedBanners) {
      try {
        const parsed = JSON.parse(savedBanners);
        if (parsed && parsed.length > 0) {
          setBanners(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    }

    // التحقق من حالة العضو وطلبات القبول وتحديثات الرتب من سحابة فايربيس
    const userPhone = localStorage.getItem('userPhone');
    const userName = localStorage.getItem('userName');

    if (userPhone || userName) {
      const checkUserData = async () => {
        try {
          // 1. التحقق من وجود ترقية ورتبة جديدة وإشعار معلق
          if (userPhone) {
            const userDocRef = doc(db, 'users', userPhone);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              if (uData.pendingCongratulation) {
                setMyNewRole(uData.role || 'عضو أساسي');
                setMyPermissions(uData.assignedPermissions || 'الصلاحيات العامة للنادي.');
                setShowRoleCongratModal(true);

                // إزالة علامة الانتظار لكي لا تظهر مجدداً في كل تحديث صفحة
                await updateDoc(userDocRef, { pendingCongratulation: false });
              }
            }
          }

          // 2. التحقق من قبول الطلب وانضمامه للجنة
          const querySnapshot = await getDocs(collection(db, 'applications'));
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (
              (userPhone && data.phone === userPhone) ||
              (userName && data.fullName === userName)
            ) {
              if (data.status === 'مقبول') {
                setAcceptedData({
                  committee: data.acceptedCommittee || data.firstChoice || 'اللجنة',
                  whatsapp: data.whatsappLink || 'https://chat.whatsapp.com/JQGv9ut56D2LJ2i2mIdxLP'
                });
                setShowModal(true);
              }
            }
          });
        } catch (err) {
          console.error('Error checking user acceptance or role update:', err);
        }
      };

      checkUserData();
    }
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentBanner = banners[currentIndex] || banners[0];

  return (
    <section 
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#4A030F] via-[#630517] to-[#36020A] px-4 sm:px-6 lg:px-8 text-white pt-36 pb-20"
      dir="rtl"
    >
      {/* خلفية تفاعلية مع شبكة ناعمة */}
      <div className="absolute inset-0 opacity-15 bg-[url('/grid.svg')] bg-center pointer-events-none mix-blend-overlay" />

      {/* هالأت الإضاءة المتحركة والمتوهجة (Glow & Pulse Effects) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] sm:w-[650px] sm:h-[650px] bg-gradient-to-r from-[#F5D061]/30 to-amber-500/20 rounded-full blur-[140px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#F5D061]/15 rounded-full blur-[100px] animate-ping pointer-events-none duration-1000" />
      <div className="absolute top-1/3 left-10 w-[250px] h-[250px] bg-rose-500/20 rounded-full blur-[120px] animate-pulse pointer-events-none" />

      {/* الحاوية الرئيسية */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center justify-center space-y-8">
        
        {/* شارة المناسبة بتصميم زجاجي متحرك وفخم */}
        <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-[#F5D061]/50 text-[#F5D061] text-xs sm:text-sm font-black tracking-wider uppercase shadow-xl shadow-[#F5D061]/10 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-[#F5D061] animate-ping" />
          <span>✨ {currentBanner.tag}</span>
        </div>

        {/* عنوان نادي التمريض مع تأثير تدرج ذهبي متوهج */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-[#F5D061] tracking-tight drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)] transition-all duration-700">
            {currentBanner.title}
          </h1>
        </div>

        {/* عرض تصميم البانر مع إطار متوهج وتأثير زووم خفيف */}
        <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] border-2 border-[#F5D061]/60 group transition-all duration-700 hover:scale-[1.01] hover:border-[#F5D061] bg-black/40">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-30 group-hover:opacity-60 transition-opacity pointer-events-none z-10" />
          
          {/* حافة إضاءة ليزرية متحركة حول البانر */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#F5D061] via-amber-200 to-[#630517] rounded-3xl blur-sm opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse pointer-events-none" />

          <div className="relative z-0">
            <Image
              src={currentBanner.image || '/header-banner.png'} 
              alt="بانر نادي التمريض"
              width={1200}
              height={500}
              className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
          </div>
        </div>

        {/* النص الوصفي المتناسق */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-amber-50/95 leading-relaxed text-center font-medium px-4 bg-white/5 backdrop-blur-md py-4 rounded-2xl border border-white/10 shadow-inner">
          {currentBanner.description}
        </p>

        {/* الأزرار التفاعلية الفخمة مع متوهج حراري */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto pt-2">
          <Link
            href={currentBanner.buttonLink || '/discover'}
            className="relative group overflow-hidden w-full sm:w-auto bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#4A030F] px-12 py-4 rounded-2xl font-black hover:brightness-110 active:scale-95 transition-all duration-300 shadow-[0_10px_30px_rgba(245,208,97,0.4)] text-base text-center border border-white/40"
          >
            <span className="absolute inset-0 w-full h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <span>{currentBanner.buttonText || 'اكتشف النادي'}</span>
              <span>✨</span>
            </span>
          </Link>
        </div>

        {/* أزرار التنقل (النقاط) المتحركة بين البانرات */}
        {banners.length > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 bg-black/20 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/10">
            {banners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-3 rounded-full transition-all duration-500 shadow-md ${
                  currentIndex === idx ? 'w-12 bg-[#F5D061] scale-110 shadow-[0_0_15px_#F5D061]' : 'w-3 bg-white/40 hover:bg-white/80'
                }`}
                title={b.tag}
              />
            ))}
          </div>
        )}

      </div>

      {/* --- نافذة تهنئة الترقية القيادية والصلاحيات --- */}
      {showRoleCongratModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-300" dir="rtl">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 text-center border-4 border-[#F5D061] animate-in zoom-in-95 duration-300 text-slate-900">
            <div className="w-20 h-20 bg-[#630517] text-[#F5D061] rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg font-black">
              🎉
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">مبارك لك الثقة القيادية!</h2>
              <p className="text-xs text-slate-500">تم ترقيتك رسمياً في نادي كلية التمريض - جامعة حفر الباطن</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs text-slate-400 font-bold block">رتبتك القيادية الجديدة:</span>
              <span className="text-lg font-black text-[#630517] bg-[#F5D061]/20 px-4 py-1.5 rounded-xl inline-block" dir="ltr">
                {myNewRole}
              </span>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-right space-y-1">
              <h4 className="text-xs font-black text-amber-900">📜 صلاحياتك ومهامك القيادية المعتمدة:</h4>
              <p className="text-xs text-slate-700 leading-relaxed">{myPermissions}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowRoleCongratModal(false)}
              className="w-full py-3.5 bg-[#630517] text-[#F5D061] rounded-2xl font-black text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              بدء مهام العمل القيادي 🚀
            </button>
          </div>
        </div>
      )}

      {/* نافذة التهنئة بالقبول ورابط الواتساب */}
      {showModal && acceptedData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-slate-900 to-[#630517] border-2 border-[#F5D061] rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center space-y-6 text-white relative">
            <span className="text-5xl animate-bounce inline-block">🎉</span>
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-black text-[#F5D061]">مبروك تم قبولك!</h3>
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                يسعدنا انضمامك إلى <span className="font-extrabold text-[#F5D061]">{acceptedData.committee}</span> في نادي التمريض 
              </p>
            </div>

            <div className="pt-2">
              <a
                href={acceptedData.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl shadow-xl transition-all text-base"
              >
                <span>💬</span>
                <span>الانضمام إلى قروب اللجنة عبر واتساب</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="text-xs text-slate-300 hover:text-white underline pt-2 cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      )}
    </section>
  );
}