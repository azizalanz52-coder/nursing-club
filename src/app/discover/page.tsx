'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { CLUB_GOALS, CLUB_MISSION, CLUB_VISION } from '../lib/clubIdentity';
import { ClubIcon } from '../components/icons';

const DEFAULT_PASSION_SLIDES = [
  {
    id: '1',
    image: '/header-banner.png',
    quote: '«التمريض ليس مجرد مهنة، بل هو فن وعِلم يلامس حياة الإنسان في أصعب لحظاته.»'
  },
  {
    id: '2',
    image: '/logo.png',
    quote: '«بالعطاء المستمر والعمل الجماعي نصنع أثراً يخلده الزمن في قلوب المجتمع.»'
  },
  {
    id: '3',
    image: '/header-banner.png',
    quote: '«نطمح لأن نكون المنارة التي تضيء دروب التميز لكل ممرض وممرضة في جامعة حفر الباطن.»'
  }
];

const DEFAULT_DISCOVER_EVENTS = [
  {
    id: '1',
    title: 'ملتقى التمريض السنوي التفاعلي',
    category: 'أنشطة كبرى',
    description: 'ملتقى شامل يستعرض أحدث الممارسات التمريضية وورش العمل التطبيقية لطلاب وطالبات الكلية.',
    images: ['/header-banner.png', '/logo.png']
  },
  {
    id: '2',
    title: 'حملة القياسات الحيوية والتثقيف الصحي',
    category: 'خدمة المجتمع',
    description: 'فعالية توعوية ميدانية لقياس العلامات الحيوية وتقديم الاستشارات للزوار.',
    images: ['/logo.png', '/header-banner.png']
  },
  {
    id: '3',
    title: 'ورشة الإسعافات الأولية المتقدمة',
    category: 'ورش تدريبية',
    description: 'دورة تدريبية مكثفة بالتعاون مع الكوادر الطبية المتخصصة لتمكين الأعضاء من التعامل مع الحالات الحرجة.',
    images: ['/header-banner.png', '/logo.png']
  }
];

const DEFAULT_PARTNERS: Array<{
  id: string;
  name: string;
  category: string;
  logo: string;
  websiteUrl?: string;
  offerType?: string;
  offerCode?: string;
}> = [];

interface StudentAchievement {
  id: string;
  studentName?: string;
  studentNames?: string[];
  awardName: string;
  image: string;
  description: string;
  createdAt: string;
}

interface PartnerItem {
  id: string;
  name: string;
  category: string;
  logo: string;
  websiteUrl?: string;
  offerType?: string;
  offerCode?: string;
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0, rootMargin: '160px 0px 160px 0px' }
    );
    io.observe(el);
    const fallback = window.setTimeout(() => setShown(true), 180);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`discover-reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function DiscoverPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [passionSlides, setPassionSlides] = useState(DEFAULT_PASSION_SLIDES);
  const [discoverEvents, setDiscoverEvents] = useState(DEFAULT_DISCOVER_EVENTS);
  const [partners, setPartners] = useState<PartnerItem[]>(DEFAULT_PARTNERS);
  const [studentAchievements, setStudentAchievements] = useState<StudentAchievement[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % passionSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [passionSlides.length]);

  useEffect(() => {
    const fetchCloudContent = async () => {
      try {
        const [passionSnap, discoverSnap, partnersSnap, achievementsSnap] = await Promise.all([
          getDocs(collection(db, 'site_passion_slides')),
          getDocs(collection(db, 'site_discover_events')),
          getDocs(collection(db, 'site_partners')),
          getDocs(collection(db, 'student_achievements')),
        ]);

        if (!passionSnap.empty) {
          const slides = passionSnap.docs.map((d) => {
            const data = d.data() as Partial<(typeof DEFAULT_PASSION_SLIDES)[number]>;
            return {
              id: d.id,
              image: data.image || '/header-banner.png',
              quote: data.quote || '',
            };
          });
          if (slides.length > 0) setPassionSlides(slides);
        }

        if (!discoverSnap.empty) {
          const eventsList = discoverSnap.docs.map((d) => {
            const data = d.data() as Partial<(typeof DEFAULT_DISCOVER_EVENTS)[number]>;
            return {
              id: d.id,
              title: data.title || 'فعالية',
              category: data.category || '',
              description: data.description || '',
              images: Array.isArray(data.images) && data.images.length ? data.images : ['/header-banner.png'],
            };
          });
          if (eventsList.length > 0) setDiscoverEvents(eventsList);
        }

        if (!partnersSnap.empty) {
          const partnersList = partnersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as PartnerItem));
          if (partnersList.length > 0) setPartners(partnersList);
        }

        if (!achievementsSnap.empty) {
          setStudentAchievements(achievementsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentAchievement)));
        }
      } catch (err) {
        console.error('Error fetching cloud data:', err);
      }
    };

    fetchCloudContent();
  }, []);

  const activeSlide = passionSlides[currentSlide] || passionSlides[0];

  const getCategoryPriority = (category: string = '') => {
    const cat = category.trim();
    if (cat.includes('إستراتيجي') || cat.includes('استراتيجي') || cat.includes('ماسي')) return 1;
    if (cat.includes('ذهبي')) return 2;
    if (cat.includes('فضي')) return 3;
    if (cat.includes('برونزي')) return 4;
    return 5;
  };

  const sortedPartners = [...partners].sort((a, b) => {
    return getCategoryPriority(a.category) - getCategoryPriority(b.category);
  });

  const goldAndStrategic = sortedPartners.filter((p) => getCategoryPriority(p.category) <= 2);
  const silverPartners = sortedPartners.filter((p) => getCategoryPriority(p.category) === 3);
  const bronzeAndOthers = sortedPartners.filter((p) => getCategoryPriority(p.category) >= 4);

  const copyOfferCode = async (code: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(''), 1600);
    } catch (err) {
      console.error(err);
    }
  };

  const renderPartnerCard = (partner: PartnerItem, delay = 0) => {
    const isGoldOrStrategic = partner.category?.includes('ذهبي') || partner.category?.includes('إستراتيجي') || partner.category?.includes('استراتيجي') || partner.category?.includes('ماسي');
    const isSilver = partner.category?.includes('فضي');
    const isBronze = partner.category?.includes('برونزي');
    const offerType = String(partner.offerType || '').trim();
    const offerCode = String(partner.offerCode || '').trim();

    const badgeColorClass = isGoldOrStrategic
      ? 'text-amber-700 font-black'
      : isSilver
      ? 'text-slate-600 font-extrabold'
      : isBronze
      ? 'text-amber-900 font-bold'
      : 'text-[#630517] font-bold';

    const partnerContent = (
      <div
        className={`relative p-6 rounded-[1.75rem] border shadow-md flex flex-col items-center justify-between w-64 min-h-64 overflow-hidden space-y-3 group cursor-pointer ${
          isGoldOrStrategic
            ? 'discover-shine border-amber-300 bg-gradient-to-b from-amber-50 to-white shadow-amber-200/70'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="w-24 h-24 bg-white rounded-2xl p-2.5 shadow-inner flex items-center justify-center overflow-hidden border border-slate-100">
          <img
            src={partner.logo && partner.logo.trim() !== '' ? partner.logo : '/logo.png'}
            alt={partner.name}
            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.png';
            }}
          />
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-slate-900 text-sm truncate max-w-[200px]">{partner.name}</h4>
          <span className={`text-xs ${badgeColorClass}`}>{partner.category || 'شريك إستراتيجي'}</span>
        </div>
        {(offerType || offerCode) && (
          <div className="w-full space-y-1.5 pt-1 border-t border-slate-100">
            {offerType && (
              <p className="text-[11px] font-black text-[#630517] bg-[#630517]/10 rounded-xl px-2.5 py-1.5">
                {offerType}
              </p>
            )}
            {offerCode && (
              <button
                type="button"
                onClick={(event) => copyOfferCode(offerCode, event)}
                className="w-full text-[11px] font-mono font-black tracking-wide bg-slate-900 text-[#F5D061] rounded-xl px-2.5 py-1.5 cursor-pointer hover:brightness-110"
                dir="ltr"
                title="نسخ الكود"
              >
                {copiedCode === offerCode ? 'تم النسخ' : offerCode}
              </button>
            )}
          </div>
        )}
      </div>
    );

    return (
      <Reveal key={partner.id || partner.name} delay={delay}>
        {partner.websiteUrl ? (
          <a
            href={partner.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            title={`زيارة صفحة أو موقع ${partner.name}`}
          >
            {partnerContent}
          </a>
        ) : (
          <div>{partnerContent}</div>
        )}
      </Reveal>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      <div className="py-14 bg-white border-b border-slate-200 text-center px-4 shadow-sm overflow-hidden">
        <Reveal>
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase mb-3">
            استكشف عالمنا
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900">عن نادي التمريض</h1>
          <p className="text-slate-600 text-sm sm:text-base mt-2">الرؤية، الرسالة، الأهداف، والأنشطة تحت مظلة كلية التمريض</p>
        </Reveal>
      </div>

      <section className="py-12 bg-[#630517] text-white border-b border-[#F5D061]/20 shadow-md overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '200+', label: 'عضو' },
            { value: '15+', label: 'فعالية سنوية' },
            { value: '«بصمة»', label: 'نبض يلامس القلوب أو عطاء بلا حدود' },
            { value: '2+', label: 'سنوات من العطاء' },
          ].map((stat, index) => (
            <Reveal key={stat.label} delay={index * 90}>
              <div className="space-y-2">
                <h3 className="text-4xl sm:text-5xl font-black text-[#F5D061]">{stat.value}</h3>
                <p className="text-amber-50/90 text-sm sm:text-base font-bold">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {studentAchievements.length > 0 && (
        <section className="py-20 bg-gradient-to-b from-amber-50/60 via-white to-slate-50 border-b border-amber-200/50 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <Reveal className="text-center max-w-2xl mx-auto space-y-3">
              <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-extrabold tracking-widest uppercase shadow-sm">
                <span className="inline-flex items-center gap-1.5"><ClubIcon name="trophy" size={13} /> إنجازات الطلبة</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                إنجازات طلبة كلية التمريض
              </h2>
              <p className="text-slate-600 text-sm sm:text-base font-medium">
                نحتفي بنخبة من طلاب وطالبات كلية التمريض بجامعة حفر الباطن الحاصلين على جوائز ومراكز متقدمة تشرف الكلية والنادي.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {studentAchievements.map((ach, index) => {
                const namesList = ach.studentNames && ach.studentNames.length > 0
                  ? ach.studentNames
                  : (ach.studentName ? ach.studentName.split(/[,،\n]+/).map(n => n.trim()).filter(Boolean) : []);

                return (
                  <Reveal key={ach.id} delay={index * 80}>
                    <article className="bg-white rounded-[1.75rem] overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col h-full group">
                      <div className="relative h-56 sm:h-72 overflow-hidden bg-slate-100">
                        <img
                          src={ach.image || '/logo.png'}
                          alt={ach.awardName}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/logo.png';
                          }}
                        />
                      </div>

                      <div className="p-5 sm:p-6 flex flex-col gap-3.5 flex-1">
                        <h3 className="text-slate-900 font-black text-lg leading-snug">
                          {ach.awardName}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {namesList.length > 0 ? (
                            namesList.map((name, idx) => (
                              <span
                                key={`${ach.id}-name-${idx}`}
                                className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-950 text-xs font-bold border border-amber-100"
                              >
                                {name}
                              </span>
                            ))
                          ) : (
                            <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                              فريق كلية التمريض
                            </span>
                          )}
                        </div>

                        {ach.description ? (
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {ach.description}
                          </p>
                        ) : null}

                        <p className="mt-auto pt-1 text-[11px] text-slate-400 font-bold">
                          كلية التمريض — جامعة حفر الباطن
                        </p>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-right">
            <Reveal>
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase">
                من نحن
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
                ناديٌ ينظر إلى الغد، لا يكتفي بلحظة النشاط
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-slate-600 leading-relaxed text-[15px] font-medium">
                نحن المظلة الطلابية الرسمية لتخصص التمريض في جامعة حفر الباطن. لا نقدم فعالية وتنتهي؛ نُعدّ طالباً يحمل المهنة أمانة، ويرى في كليته بيتاً علمياً يستحق أن يُمثَّل بأحسن صورة.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <Reveal delay={220}>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm h-full space-y-2">
                  <h4 className="font-black text-[#630517] text-lg">رؤيتنا</h4>
                  <p className="text-[15px] text-slate-600 leading-8">{CLUB_VISION}</p>
                </div>
              </Reveal>
              <Reveal delay={300}>
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm h-full space-y-2">
                  <h4 className="font-black text-[#630517] text-lg">رسالتنا</h4>
                  <p className="text-[15px] text-slate-600 leading-8">{CLUB_MISSION}</p>
                </div>
              </Reveal>
            </div>
          </div>

          <Reveal delay={120}>
            <div className="relative">
              <div className="absolute inset-0 bg-[#630517]/10 rounded-3xl blur-2xl transform rotate-3" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 min-h-[400px] flex flex-col justify-between text-white p-8 sm:p-10 bg-slate-950">
                <div className="absolute inset-0 z-0">
                  <img
                    src={activeSlide.image && activeSlide.image.trim() !== '' ? activeSlide.image : '/header-banner.png'}
                    alt="شغف وعطاء"
                    className="w-full h-full object-cover opacity-80 scale-105 transition-all duration-1000"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/header-banner.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />
                </div>

                <div className="relative z-10 flex justify-between items-center">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl p-2 flex items-center justify-center shadow-lg border border-white/20 overflow-hidden">
                    <img src="/logo.png" alt="شعار النادي" className="w-full h-full object-contain" />
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F5D061] font-bold border border-white/10">
                    شغف، عطاء، واحترافية
                  </span>
                </div>

                <div className="relative z-10 space-y-3 text-center my-6">
                  <h3 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">نادي التمريض</h3>
                  <p className="text-amber-50 text-sm sm:text-base leading-relaxed font-semibold transition-opacity duration-700 drop-shadow">
                    {activeSlide.quote}
                  </p>
                </div>

                <div className="relative z-10 space-y-3">
                  <div className="flex justify-center gap-2">
                    {passionSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2 rounded-full transition-all cursor-pointer ${currentSlide === idx ? 'w-8 bg-[#F5D061]' : 'w-2 bg-white/40'}`}
                      />
                    ))}
                  </div>
                  <div className="text-center pt-2 text-xs text-[#F5D061] font-black tracking-wider uppercase border-t border-white/10">
                    جامعة حفر الباطن • كلية التمريض
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200 overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-10">
          <Reveal className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase">
              أهدافنا
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">ستة مقاصد نسير إليها</h2>
            <p className="text-slate-600 text-[15px] leading-8">
              ليست شعارات للوحة؛ هي ما نقيس به عمل اللجان وأثر الطالب بعد كل برنامج.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CLUB_GOALS.map((goal, index) => (
              <Reveal key={goal.title} delay={index * 70}>
                <article className="h-full rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-2">
                  <p className="text-[11px] font-black text-[#F5D061] bg-[#630517] inline-block px-2.5 py-1 rounded-full">
                    0{index + 1}
                  </p>
                  <h3 className="font-black text-[#630517] text-[15px]">{goal.title}</h3>
                  <p className="text-slate-600 text-[15px] leading-8">{goal.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-100/70 border-t border-slate-200 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase">
              معرض الأنشطة
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              لقطات من فعالياتنا وبرامجنا
            </h2>
            <p className="text-slate-600 text-sm">اضغط على أي فعالية لاستعراض معرض الصور الكامل المرفوع سحابياً</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoverEvents.map((event, index) => {
              const coverImage = (event.images && event.images.length > 0 && event.images[0]) ? event.images[0] : '/header-banner.png';
              return (
                <Reveal key={event.id} delay={index * 90}>
                  <div
                    onClick={() => setSelectedEvent(event)}
                    className="group relative h-80 rounded-3xl overflow-hidden border border-slate-200 bg-slate-950 shadow-md transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="absolute inset-0">
                      <img
                        src={coverImage}
                        alt={event.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition-transform duration-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/header-banner.png';
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent z-10" />

                    <div className="absolute bottom-0 right-0 left-0 p-6 z-20 space-y-2 text-right">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#F5D061] text-[#630517] font-bold text-xs shadow">
                        {event.category || 'فعالية'} • {event.images?.length || 0} صور
                      </span>
                      <h4 className="text-xl font-black text-white leading-tight drop-shadow-md">{event.title}</h4>
                      <p className="text-xs text-amber-50/90 font-medium line-clamp-1 drop-shadow">{event.description}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#630517] text-white p-6 flex justify-between items-center border-b border-[#F5D061]/20">
              <div>
                <span className="text-xs text-[#F5D061] font-bold">{selectedEvent.category}</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">{selectedEvent.title}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white font-black flex items-center justify-center transition-all cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              <p className="text-slate-700 text-sm sm:text-base font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {selectedEvent.description}
              </p>

              <div>
                <h4 className="font-extrabold text-slate-900 text-lg mb-4">معرض الصور ({selectedEvent.images?.length || 0} صورة)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedEvent.images?.map((img: string, idx: number) => (
                    <div key={idx} className="h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group bg-slate-100">
                      <img
                        src={img}
                        alt={`صورة ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/header-banner.png';
                        }}
                      />
                      <div className="absolute top-3 right-3 bg-black/60 text-[#F5D061] px-2.5 py-1 rounded-lg text-xs font-black">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 text-center">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-6 py-2.5 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 cursor-pointer"
              >
                إغلاق المعرض
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="py-16 border-t border-slate-200 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          <Reveal className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              شركاء النجاح والرعاة
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              نعتز بشراكاتنا الدائمة لدعم فعاليات وأنشطة نادي التمريض
            </p>
          </Reveal>

          <div className="space-y-12">
            {goldAndStrategic.length > 0 && (
              <div className="space-y-4">
                <Reveal>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black shadow-sm">
                    <ClubIcon name="crown" size={13} />
                    <span>الرعاة الذهبيون والشركاء الاستراتيجيون</span>
                  </div>
                </Reveal>
                <div className="flex flex-wrap items-stretch justify-center gap-6 sm:gap-8">
                  {goldAndStrategic.map((partner, index) => renderPartnerCard(partner, index * 90))}
                </div>
              </div>
            )}

            {silverPartners.length > 0 && (
              <div className="space-y-4">
                <Reveal>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-black shadow-sm">
                    <span>🥈</span>
                    <span>الرعاة الفضيون</span>
                  </div>
                </Reveal>
                <div className="flex flex-wrap items-stretch justify-center gap-6 sm:gap-8">
                  {silverPartners.map((partner, index) => renderPartnerCard(partner, index * 90))}
                </div>
              </div>
            )}

            {bronzeAndOthers.length > 0 && (
              <div className="space-y-4">
                <Reveal>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-900/10 border border-amber-900/20 text-amber-950 text-xs font-black shadow-sm">
                    <span>🥉</span>
                    <span>الرعاة البرونزيون والشركاء</span>
                  </div>
                </Reveal>
                <div className="flex flex-wrap items-stretch justify-center gap-6 sm:gap-8">
                  {bronzeAndOthers.map((partner, index) => renderPartnerCard(partner, index * 90))}
                </div>
              </div>
            )}

            {goldAndStrategic.length === 0 && silverPartners.length === 0 && bronzeAndOthers.length === 0 && (
              sortedPartners.length > 0 ? (
                <div className="flex flex-wrap items-stretch justify-center gap-6 sm:gap-8">
                  {sortedPartners.map((partner, index) => renderPartnerCard(partner, index * 90))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 font-medium">تظهر هنا شعارات الشركاء فور إضافتها من لوحة التحكم.</p>
              )
            )}
          </div>
        </div>
      </section>

      <div className="py-12 text-center bg-slate-50 border-t border-slate-200">
        <Link
          href="/"
          className="inline-block bg-[#630517] text-[#F5D061] px-8 py-3.5 rounded-full font-black text-sm hover:brightness-110 hover:scale-105 transition-all shadow-lg"
        >
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}
