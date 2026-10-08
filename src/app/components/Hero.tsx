'use client';

import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { db } from './../lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

interface BannerItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
}

export default function Hero() {
  // البانر الافتراضي المخصص لليوم العالمي للصحة النفسية
  const [banners, setBanners] = useState<BannerItem[]>([
    {
      id: 'mental_health_main',
      tag: '💚 اليوم العالمي للصحة النفسية | نادي التمريض',
      title: 'صحتك النفسية.. أولوية وليست رفاهية 🧠',
      description: 'في نادي التمريض بجامعة حفر الباطن، نؤمن بأن العناية بسلامة العقل توازي العناية بالجسد. صحتك النفسية هي الركيزة الأساسية لتميزك الأكاديمي وحياتك اليومية.',
      image: '/header-banner.png',
      buttonText: 'تحدي الصحة النفسية 🎯',
      buttonLink: '/case-study',
    },
  ]);

  const [acceptedData, setAcceptedData] = useState<{ committee: string; whatsapp: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);

  // --- States خاصة بتهنئة الترقية والصلاحيات القيادية ---
  const [showRoleCongratModal, setShowRoleCongratModal] = useState(false);
  const [myNewRole, setMyNewRole] = useState('');
  const [myPermissions, setMyPermissions] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // التحقق الفوري محلياً هل سبق إغلاق النافذة لعدم تكرارها نهائياً
    const hasSeenLocal = localStorage.getItem('hasSeenAcceptanceModal');
    if (hasSeenLocal === 'true') {
      setShowModal(false);
    }

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
    } else {
      const fetchCloudBanners = async () => {
        try {
          const bannersSnap = await getDocs(collection(db, 'site_banners'));
          if (!bannersSnap.empty) {
            const cloudList: BannerItem[] = [];
            bannersSnap.forEach((d) => {
              const dat = d.data();
              cloudList.push({
                id: d.id,
                tag: dat.tag || '💚 مناسبة خاصة',
                title: dat.title || 'نادي التمريض',
                description: dat.description || 'مجتمع طلابي متميز بجامعة حفر الباطن.',
                image: dat.image || '/header-banner.png',
                buttonText: dat.buttonText || 'اكتشف النادي',
                buttonLink: dat.buttonLink || '/discover'
              });
            });
            if (cloudList.length > 0) {
              setBanners([...cloudList, ...banners]);
            }
          }
        } catch (err) {
          console.error('Error fetching cloud banners:', err);
        }
      };
      fetchCloudBanners();
    }

    const userPhone = localStorage.getItem('userPhone');
    const userName = localStorage.getItem('userName');
    if (userPhone) setCurrentUserPhone(userPhone);

    if (userPhone || userName) {
      const checkUserData = async () => {
        try {
          if (userPhone) {
            const userDocRef = doc(db, 'users', userPhone);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              if (uData.pendingCongratulation) {
                setMyNewRole(uData.role || 'عضو أساسي');
                setMyPermissions(uData.assignedPermissions || 'الصلاحيات العامة للنادي.');
                setShowRoleCongratModal(true);
                await updateDoc(userDocRef, { pendingCongratulation: false });
              }

              if (uData.hasSeenCongrats === true || hasSeenLocal === 'true') {
                return;
              }

              if (uData.status === 'مقبول') {
                setAcceptedData({
                  committee: uData.assignedCommittee || uData.firstChoice || 'اللجنة',
                  whatsapp: uData.whatsappLink || 'https://chat.whatsapp.com/JQGv9ut56D2LJ2i2mIdxLP'
                });
                setShowModal(true);
                return;
              }
            }
          }

          if (hasSeenLocal !== 'true') {
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
          }

        } catch (err) {
          console.error('Error checking user acceptance or role update:', err);
        }
      };

      checkUserData();
    }
  }, []);

  const handleCloseAcceptanceModal = async () => {
    setShowModal(false);
    localStorage.setItem('hasSeenAcceptanceModal', 'true');

    const phone = currentUserPhone || localStorage.getItem('userPhone');
    if (!phone) return;
    try {
      const userDocRef = doc(db, 'users', phone);
      await updateDoc(userDocRef, { hasSeenCongrats: true });
    } catch (err) {
      console.error('Error updating hasSeenCongrats in cloud:', err);
    }
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[currentIndex] || banners[0];

  return (
    <section 
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#047857] px-4 sm:px-6 lg:px-8 text-white pt-36 pb-20 transition-all duration-700"
      dir="rtl"
    >
      {/* خلفية جمالية وإضاءة خضراء متناسقة مع هوية اليوم العالمي للصحة النفسية */}
      <div className="absolute inset-0 opacity-15 bg-[url('/grid.svg')] bg-center pointer-events-none mix-blend-overlay" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#10b981]/20 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#F5D061]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center justify-center space-y-8">
        
        {/* شارة المناسبة */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-900/60 backdrop-blur-xl border border-[#F5D061]/40 text-[#F5D061] text-xs sm:text-sm font-bold tracking-wider uppercase shadow-lg">
          <span>{currentBanner.tag}</span>
        </div>

        {/* عنوان الصفحة */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight drop-shadow-md leading-tight transition-all duration-700">
            {currentBanner.title}
          </h1>
        </div>

        {/* حاوية البانر والصورة المتكيفة مع المقاسات */}
        <div className="relative w-full max-w-4xl mx-auto rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-[#F5D061]/40 group transition-all duration-500 hover:border-[#F5D061]/80">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none z-10" />

          {currentBanner.image?.startsWith('data:video') || currentBanner.image?.includes('.mp4') ? (
            <video 
              src={currentBanner.image} 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-auto block object-cover max-h-[75vh] mx-auto" 
            />
          ) : (
            <img
              src={currentBanner.image || '/header-banner.png'} 
              alt={currentBanner.title || "اليوم العالمي للصحة النفسية"}
              className="w-full h-auto block object-cover max-h-[75vh] mx-auto transition-transform duration-700 group-hover:scale-[1.01]"
            />
          )}
        </div>

        {/* الوصف التوعوي المختصر */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-emerald-50/95 leading-relaxed text-center font-medium px-6 py-4 bg-emerald-950/40 backdrop-blur-md rounded-2xl border border-emerald-500/20 shadow-inner">
          {currentBanner.description}
        </p>

        {/* أزرار التفاعل */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto pt-2">
          <Link
            href={currentBanner.buttonLink || '/case-study'}
            className="w-full sm:w-auto bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#064e3b] px-10 py-3.5 rounded-2xl font-black hover:brightness-110 active:scale-95 transition-all duration-300 shadow-xl text-base text-center border border-white/30"
          >
            {currentBanner.buttonText || 'تحدي الصحة النفسية 🎯'}
          </Link>
        </div>

        {/* مؤشر البنرات إن وجدت أكثر من واحدة */}
        {banners.length > 1 && (
          <div className="flex items-center justify-center gap-2.5 pt-4 bg-black/20 backdrop-blur-md px-5 py-2 rounded-full border border-white/10">
            {banners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2.5 rounded-full transition-all duration-500 cursor-pointer ${
                  currentIndex === idx ? 'w-8 bg-[#F5D061]' : 'w-2.5 bg-white/40 hover:bg-white/80'
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
            <div className="w-20 h-20 bg-[#064e3b] text-[#F5D061] rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg font-black">
              🎉
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">مبارك لك الثقة القيادية!</h2>
              <p className="text-xs text-slate-500">تم ترقيتك رسمياً في نادي كلية التمريض - جامعة حفر الباطن</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs text-slate-400 font-bold block">رتبتك القيادية الجديدة:</span>
              <span className="text-lg font-black text-[#064e3b] bg-[#F5D061]/20 px-4 py-1.5 rounded-xl inline-block" dir="ltr">
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
              className="w-full py-3.5 bg-[#064e3b] text-[#F5D061] rounded-2xl font-black text-sm shadow-lg hover:brightness-110 transition-all cursor-pointer"
            >
              بدء مهام العمل القيادي 🚀
            </button>
          </div>
        </div>
      )}

      {/* نافذة التهنئة بالقبول */}
      {showModal && acceptedData && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300" dir="rtl">
          <div className="bg-gradient-to-br from-[#F5D061] via-[#dfb64d] to-[#064e3b] rounded-[32px] p-8 max-w-md w-full shadow-2xl text-center space-y-6 border-2 border-[#F5D061] relative text-slate-900">
            
            <div className="w-20 h-20 bg-[#064e3b] text-[#F5D061] rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl border-4 border-white/20">
              🎉
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-emerald-950">مبروك تم قبولك!</h3>
              <p className="text-xs font-bold text-slate-800 leading-relaxed">
                يسعدنا انضمامك إلى <span className="text-[#064e3b] font-black underline">{acceptedData.committee}</span> في نادي التمريض 🌟
              </p>
            </div>

            <div className="pt-2">
              <a
                href={acceptedData.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 px-6 rounded-2xl shadow-xl transition-all text-xs"
              >
                <span>💬</span>
                <span>الانضمام إلى قروب اللجنة عبر واتساب</span>
              </a>
            </div>

            <button
              type="button"
              onClick={handleCloseAcceptanceModal}
              className="text-xs font-extrabold text-emerald-950 hover:text-emerald-900 underline cursor-pointer pt-1 block mx-auto"
            >
              إغلاق النافذة ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}