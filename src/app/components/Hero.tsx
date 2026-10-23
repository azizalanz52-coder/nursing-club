'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { db } from './../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { DEFAULT_WELCOME_BANNER } from '../lib/welcomeBanner';
import { ClubIcon } from './icons';

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
  const [live, setLive] = useState(false);

  useEffect(() => {
    setLive(true);
  }, []);

  useEffect(() => {
    if (!live) return;
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
  }, [live]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[currentIndex] || banners[0];
  const isPink = currentBanner.theme === 'pink-october';
  const heroCtaHref = currentBanner.buttonLink || (isPink ? '/case-study' : '/discover');
  const heroCtaLabel = currentBanner.buttonText || (isPink ? 'ابدئي التحدي الوردي' : 'اكتشف النادي');

  return (
    <section 
      className={`relative min-h-[85vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 text-white pt-10 pb-16 ${
        isPink
          ? 'bg-gradient-to-br from-[#4a0326] via-[#9d174d] to-[#be185d]'
          : 'bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,208,97,0.18),transparent_42%),linear-gradient(165deg,#2a050c_0%,#630517_48%,#1a0208_100%)]'
      }`}
      dir="rtl"
    >
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full blur-[140px] pointer-events-none ${
        isPink ? 'bg-pink-300/25' : 'bg-[#F5D061]/22'
      }`} />
      <div className="absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-[#F5D061]/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center justify-center space-y-7">
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full backdrop-blur-xl text-xs sm:text-sm font-bold shadow-sm border ${
          isPink
            ? 'bg-white/10 border-white/40 text-pink-100'
            : 'bg-[#F5D061]/10 border-[#F5D061]/40 text-[#F5D061]'
        }`}>
          <span className="inline-flex items-center gap-1.5">
            <ClubIcon name={isPink ? 'heart' : 'sparkles'} size={14} />
            {currentBanner.tag}
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white drop-shadow-md">
          {currentBanner.title}
        </h1>

        <div className="relative w-full max-w-4xl mx-auto">
          <div className={`absolute -inset-3 rounded-[2.2rem] blur-2xl pointer-events-none ${
            isPink ? 'bg-pink-400/20' : 'bg-[#F5D061]/25'
          }`} />
          <div
            className={`relative overflow-hidden rounded-[1.5rem] sm:rounded-[2.2rem] p-[2px] shadow-[0_24px_60px_rgba(0,0,0,0.35)] ${
              isPink
                ? 'bg-gradient-to-br from-pink-200 via-white/30 to-[#9d174d]'
                : 'bg-gradient-to-br from-[#F5D061] via-[#FFF3C4] to-[#C9A227]'
            }`}
          >
            <div className="overflow-hidden rounded-[1.4rem] sm:rounded-[2.05rem] bg-[#1a0208]">
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
                  alt={currentBanner.title || "بانر نادي التمريض"}
                  className="w-full h-auto block object-cover max-h-[75vh] mx-auto"
                />
              )}
            </div>
          </div>
        </div>

        {currentBanner.description ? (
          <p className={`max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-center font-medium px-6 py-4 backdrop-blur-md rounded-2xl border ${
            isPink
              ? 'text-pink-50 bg-white/10 border-white/15'
              : 'text-[#FFF6D6] bg-[#F5D061]/8 border-[#F5D061]/25'
          }`}>
            {currentBanner.description}
          </p>
        ) : null}

        <Link
          href={heroCtaHref}
          className={`w-full sm:w-auto px-10 py-3.5 rounded-2xl font-black hover:brightness-110 active:scale-95 transition-all duration-300 text-base text-center ${
            isPink
              ? 'bg-white text-[#9d174d]'
              : 'bg-gradient-to-l from-[#F5D061] via-[#F0C75A] to-[#E2B739] text-[#3b020b] shadow-[0_10px_28px_rgba(245,208,97,0.28)]'
          }`}
        >
          {heroCtaLabel}
        </Link>

        {banners.length > 1 && (
          <div className="flex items-center justify-center gap-2.5 pt-1 bg-black/20 backdrop-blur-md px-5 py-2 rounded-full border border-[#F5D061]/20">
            {banners.map((b, idx) => (
              <button
                key={b.id}
                type="button"
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
