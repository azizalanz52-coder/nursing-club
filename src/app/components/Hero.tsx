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

    // التحقق من حالة العضو وططلبات القبول وتحديثات الرتب من سحابة فايربيس
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
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#630517] via-[#850E24] to-[#630517] px-4 sm:px-6 lg:px-8 text-white pt-32 pb-16"
      dir="rtl"
    >
      {/* تأثير شبكة خلفية ناعمة */}
      <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] bg-center pointer-events-none" />

      {/* هالة إضاءة ذهبية متحركة ونابضة */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#F5D061]/20 rounded-full blur-[150px] animate-pulse pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#F5D061]/10 rounded-full blur-[100px] animate-ping pointer-events-none duration-1000" />

      {/* الحاوية الرئيسية */}
      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center justify-center space-y-8">
        
        {/* شارة المناسبة بتصميم زجاجي فاخر */}
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-[#F5D061]/40 text-[#F5D061] text-xs sm:text-sm font-black tracking-widest uppercase shadow-lg shadow-black/20 animate-bounce">
          <span>✨ {currentBanner.tag}</span>
        </div>

        {/* عنوان نادي التمريض بحجم كبير وبارز */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight drop-shadow-lg transition-all duration-500">
            {currentBanner.title}
          </h1>
        </div>

        {/* عرض تصميم البانر مع إطار متوهج وتأثير زووم خفيف */}
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-black/55 border-2 border-[#F5D061]/50 group transition-all duration-500 hover:scale-[1.01] hover:border-[#F5D061]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <Image
            src={currentBanner.image || '/header-banner.png'} 
            alt="بانر نادي التمريض"
            width={1200}
            height={500}
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
        </div>

        {/* النص الوصفي المتناسق */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-amber-50/90 leading-relaxed text-center font-medium px-2">
          {currentBanner.description}
        </p>

        {/* الأزرار التفاعلية الفخمة */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto pt-2">
          <Link
            href={currentBanner.buttonLink || '/discover'}
            className="w-full sm:w-auto bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#630517] px-10 py-4 rounded-full font-black hover:brightness-110 active:scale-95 transition-all duration-300 shadow-xl shadow-[#F5D061]/20 text-base text-center"
          >
            {currentBanner.buttonText || 'اكتشف النادي'}
          </Link>
        </div>

        {/* أزرار التنقل (النقاط) المتحركة بين البانرات */}
        {banners.length > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            {banners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-3 rounded-full transition-all duration-500 shadow ${
                  currentIndex === idx ? 'w-10 bg-[#F5D061] scale-110' : 'w-3 bg-white/30 hover:bg-white/60'
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