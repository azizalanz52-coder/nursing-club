'use client';

import React, { useState, useEffect } from 'react';
import Link from "next/link";
import { db } from './../lib/firebase';
import { DEFAULT_WELCOME_BANNER, WELCOME_BANNER_ID } from '../lib/welcomeBanner';
import { loadCloudCollection, peekCloudCollection } from '../lib/cloudCache';
import { BANNER_CONTROL_DOC, CLUB_AWARD_BANNER_ID, CLUB_AWARD_POSTER_BANNER, CLUB_AWARD_POSTER_ID, readBannerControl } from '../lib/clubAwardCelebration';
import { doc, getDoc } from 'firebase/firestore';
import { ClubIcon } from './icons';
import ClubAwardCelebration from './ClubAwardCelebration';
import AwardConfetti from './AwardConfetti';

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

function sortBanners(list: BannerItem[]) {
  return [...list].sort((a, b) => {
    if (a.id === 'welcome-default') return -1;
    if (b.id === 'welcome-default') return 1;
    return Number(b.id) - Number(a.id);
  });
}

const HIDDEN_HOME = { posterRetired: false, welcomeOnHome: false };

function presentBanners(list: BannerItem[], control: { posterRetired: boolean; welcomeOnHome: boolean }) {
  const poster = list.find((item) => item.id === CLUB_AWARD_POSTER_ID) ?? CLUB_AWARD_POSTER_BANNER;
  const rest = sortBanners(list.filter((item) => item.id !== CLUB_AWARD_POSTER_ID && item.id !== CLUB_AWARD_BANNER_ID));
  const withWelcome = rest.some((item) => item.id === WELCOME_BANNER_ID)
    ? rest
    : [DEFAULT_WELCOME_BANNER, ...rest];
  const published = control.welcomeOnHome ? withWelcome : [];
  const slides = control.posterRetired ? published : [poster, ...published];
  return slides.length ? slides : [DEFAULT_WELCOME_BANNER];
}

export default function Hero() {
  const [banners, setBanners] = useState<BannerItem[]>(() => presentBanners([], HIDDEN_HOME));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    setLive(true);
  }, []);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const cached = peekCloudCollection<BannerItem>('site_banners');
    if (cached?.length) {
      setBanners(presentBanners(cached, HIDDEN_HOME));
    }
    localStorage.removeItem('UHB_BANNERS');

    const controlPromise = getDoc(doc(db, 'site_settings', BANNER_CONTROL_DOC))
      .then((snap) => readBannerControl(snap.data()))
      .catch(() => HIDDEN_HOME);

    void Promise.all([
      loadCloudCollection<BannerItem>(db, 'site_banners', {
      mapDoc: (id, dat) => ({
        id,
        tag: String(dat.tag || 'مناسبة خاصة'),
        title: String(dat.title || 'نادي التمريض'),
        description: String(dat.description || ''),
        image: String(dat.image || '/header-banner.png'),
        buttonText: String(dat.buttonText || 'اكتشف النادي'),
        buttonLink: String(dat.buttonLink || '/discover'),
        theme: dat.theme === 'pink-october' ? 'pink-october' : 'club',
        cinematic: Boolean(dat.cinematic),
      }),
    }),
      controlPromise,
    ])
      .then(([cloudList, control]) => {
        if (cancelled) return;
        setBanners(presentBanners(cloudList, control));
        setCurrentIndex(0);
      })
      .catch((err) => {
        console.error('Error fetching cloud banners:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [live]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const delay = banners[currentIndex]?.id === CLUB_AWARD_POSTER_ID ? 15000 : 5000;
    const timer = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [banners, currentIndex]);

  const currentBanner = banners[currentIndex] || banners[0];
  const isPoster = currentBanner.id === CLUB_AWARD_POSTER_ID;
  const isPink = currentBanner.theme === 'pink-october';
  const heroCtaHref = currentBanner.buttonLink || (isPink ? '/case-study' : '/discover');
  const heroCtaLabel = currentBanner.buttonText || (isPink ? 'ابدئي التحدي الوردي' : 'اكتشف النادي');

  return (
    <section 
      className={`relative flex overflow-hidden px-4 sm:px-6 lg:px-8 text-white ${
        isPoster ? 'items-start justify-center py-6' : 'min-h-[85vh] items-center justify-center pt-10 pb-16'
      } ${
        isPink
          ? 'bg-gradient-to-br from-[#4a0326] via-[#9d174d] to-[#be185d]'
          : 'bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,208,97,0.18),transparent_42%),linear-gradient(165deg,#2a050c_0%,#630517_48%,#1a0208_100%)]'
      }`}
      dir="rtl"
    >
      <AwardConfetti />
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full blur-[140px] pointer-events-none ${
        isPink ? 'bg-pink-300/25' : 'bg-[#F5D061]/22'
      }`} />
      <div className="absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-[#F5D061]/10 blur-[100px] pointer-events-none" />

      <div className={`relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center ${isPoster ? 'justify-start gap-4' : 'justify-center space-y-7'}`}>
        {isPoster ? (
          <h1 className="sr-only">{currentBanner.title}</h1>
        ) : (
          <>
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
          </>
        )}

        {isPoster ? (
          <ClubAwardCelebration image={currentBanner.image || CLUB_AWARD_POSTER_BANNER.image} />
        ) : (
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
                    alt={currentBanner.title || 'بانر نادي التمريض'}
                    className="w-full h-auto block object-cover max-h-[75vh] mx-auto"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {currentBanner.description && !isPoster ? (
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
