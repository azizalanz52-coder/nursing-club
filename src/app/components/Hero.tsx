'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { db } from './../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { DEFAULT_WELCOME_BANNER } from '../lib/welcomeBanner';

interface BannerItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  theme?: 'club' | 'pink-october';
  cinematic?: boolean;
}

export default function Hero() {
  const [banners, setBanners] = useState<BannerItem[]>([DEFAULT_WELCOME_BANNER]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    localStorage.removeItem('UHB_BANNERS');
    const unsub = onSnapshot(
      collection(db, 'site_banners'),
      (bannersSnap) => {
        if (bannersSnap.empty) {
          setBanners([DEFAULT_WELCOME_BANNER]);
          setCurrentIndex(0);
          return;
        }
        const cloudList: BannerItem[] = [];
        bannersSnap.forEach((d) => {
          const dat = d.data();
          cloudList.push({
            id: d.id,
            tag: dat.tag || 'مناسبة خاصة',
            title: dat.title || 'نادي التمريض',
            description: dat.description || '',
            image: dat.image || '/header-banner.png',
            buttonText: dat.buttonText || 'اكتشف النادي',
            buttonLink: dat.buttonLink || '/discover',
            theme: dat.theme === 'pink-october' ? 'pink-october' : 'club',
            cinematic: Boolean(dat.cinematic),
          });
        });
        cloudList.sort((a, b) => {
          if (a.id === 'welcome-default') return -1;
          if (b.id === 'welcome-default') return 1;
          return Number(b.id) - Number(a.id);
        });
        setBanners(cloudList);
        setCurrentIndex(0);
      },
      (err) => {
        console.error('Error fetching cloud banners:', err);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[currentIndex] || banners[0];
  const isPink = currentBanner.theme === 'pink-october';
  const cinematic = currentBanner.cinematic === true;
  const heroCtaHref = currentBanner.buttonLink || (isPink ? '/case-study' : '/discover');
  const heroCtaLabel = currentBanner.buttonText || (isPink ? 'ابدئي التحدي الوردي' : 'اكتشف النادي');

  return (
    <section 
      className={`relative min-h-[92vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 text-white pb-16 ${
        cinematic ? 'pt-28' : 'pt-36 pb-20'
      } ${
        isPink
          ? 'bg-gradient-to-br from-[#4a0326] via-[#9d174d] to-[#be185d]'
          : 'bg-gradient-to-br from-[#3b020b] via-[#630517] to-[#4a030f]'
      }`}
      dir="rtl"
    >
      <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')] bg-center pointer-events-none mix-blend-overlay" />
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-[160px] pointer-events-none ${
          isPink ? 'bg-pink-300/25' : 'bg-[#F5D061]/10'
        }`}
      />
      {isPink && (
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className={`relative z-10 mx-auto text-center flex flex-col items-center justify-center ${cinematic ? 'max-w-6xl space-y-6' : 'max-w-5xl space-y-8'}`}>
        
        {!cinematic && (
          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 backdrop-blur-xl text-xs sm:text-sm font-bold tracking-wider uppercase shadow-sm border ${
            isPink ? 'border-white/40 text-pink-100' : 'border-[#F5D061]/30 text-[#F5D061]'
          }`}>
            <span>{isPink ? '🎀' : '✨'} {currentBanner.tag}</span>
          </div>
        )}

        {!cinematic && (
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-7xl font-black text-white drop-shadow-md transition-all duration-700">
              {currentBanner.title}
            </h1>
          </div>
        )}

        <div
          className={`relative w-full mx-auto overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)] group transition-all duration-500 ${
            cinematic
              ? 'max-w-6xl rounded-[1.25rem] sm:rounded-[2rem] border border-white/15'
              : `max-w-4xl rounded-[1.5rem] sm:rounded-[2.5rem] border-2 ${isPink ? 'border-pink-200/40 hover:border-pink-100/80' : 'border-[#F5D061]/30 hover:border-[#F5D061]/70'}`
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 pointer-events-none z-10" />

          {currentBanner.image?.startsWith('data:video') || currentBanner.image?.includes('.mp4') ? (
            <video 
              src={currentBanner.image} 
              autoPlay 
              loop 
              muted 
              playsInline
              className={`w-full h-auto block object-cover mx-auto ${cinematic ? 'max-h-[82vh]' : 'max-h-[75vh]'}`}
            />
          ) : (
            <img
              src={currentBanner.image || '/header-banner.png'} 
              alt={currentBanner.title || "بانر نادي التمريض"}
              className={`w-full h-auto block object-cover mx-auto transition-transform duration-700 group-hover:scale-[1.015] ${cinematic ? 'max-h-[82vh]' : 'max-h-[75vh]'}`}
            />
          )}

          {cinematic && (
            <div className="absolute bottom-4 right-4 left-4 z-20 flex flex-wrap items-end justify-between gap-3 text-right" dir="rtl">
              <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/35 backdrop-blur-md text-[11px] font-black tracking-wide ${
                isPink ? 'text-pink-100 border border-white/20' : 'text-[#F5D061] border border-[#F5D061]/30'
              }`}>
                {isPink ? '🎀' : '✨'} {currentBanner.tag}
              </span>
            </div>
          )}
        </div>

        {currentBanner.description ? (
          <p className={`max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-center font-medium px-6 py-4 backdrop-blur-md rounded-2xl border shadow-inner ${
            isPink
              ? 'text-pink-50 bg-white/10 border-white/15'
              : 'text-amber-50/90 bg-white/5 border-white/10'
          }`}>
            {currentBanner.description}
          </p>
        ) : null}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto pt-1">
          <Link
            href={heroCtaHref}
            className={`w-full sm:w-auto px-10 py-3.5 rounded-2xl font-black hover:brightness-110 active:scale-95 transition-all duration-300 shadow-lg text-base text-center border ${
              isPink
                ? 'bg-white text-[#9d174d] border-white/40'
                : 'bg-gradient-to-r from-[#F5D061] via-[#E2B739] to-[#C99C21] text-[#3b020b] border-white/30'
            }`}
          >
            {heroCtaLabel}
          </Link>
        </div>

        {banners.length > 1 && (
          <div className="flex items-center justify-center gap-2.5 pt-2 bg-black/20 backdrop-blur-md px-5 py-2 rounded-full border border-white/10">
            {banners.map((b, idx) => (
              <button
                key={b.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2.5 rounded-full transition-all duration-500 cursor-pointer ${
                  currentIndex === idx
                    ? isPink ? 'w-8 bg-white' : 'w-8 bg-[#F5D061]'
                    : 'w-2.5 bg-white/40 hover:bg-white/80'
                }`}
                title={b.tag}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}