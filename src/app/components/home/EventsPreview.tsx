'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function EventsPreview() {
  const [eventsList, setEventsList] = useState([
    {
      id: '1',
      title: "حملة التوعية الصحية",
      date: "2026/10/15",
      location: "جامعة حفر الباطن",
      status: "upcoming",
      poster: "/header-banner.png",
      description: "حملة توعوية صحية شاملة لمنسوبي وزوار الجامعة."
    },
    {
      id: '2',
      title: "ورشة مهارات التمريض",
      date: "2026/11/05",
      location: "كلية التمريض",
      status: "upcoming",
      poster: "/header-banner.png",
      description: "ورشة عمل تفاعلية لأحدث المهارات الإكلينيكية والتمريضية."
    },
    {
      id: '3',
      title: "اليوم العالمي للتمريض",
      date: "2026/12/01",
      location: "جامعة حفر الباطن",
      status: "upcoming",
      poster: "/header-banner.png",
      description: "احتفالية سنوية لتكريم وتقدير جهود مهنة التمريض العظيمة."
    },
  ]);

  useEffect(() => {
    // جلب الفعاليات المضافة من لوحة التحكم (Admin)
    const savedEvents = localStorage.getItem('UHB_EVENTS');
    if (savedEvents) {
      try {
        const parsed = JSON.parse(savedEvents);
        if (parsed && parsed.length > 0) {
          setEventsList(parsed.slice(0, 3)); // نعرض أول 3 فعاليات في الرئيسية
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <section className="py-20 bg-[#630517] text-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">

        {/* العنوان وزر الانتقال لصفحة الفعاليات الكاملة */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-4">
          <div className="space-y-3 text-center md:text-right">
            <span className="px-4 py-1.5 rounded-full bg-[#F5D061]/20 text-[#F5D061] text-xs font-black tracking-widest uppercase border border-[#F5D061]/30">
              أنشطة وفعاليات النادي
            </span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              الفعاليات القادمة
            </h2>
            <p className="text-slate-200 text-sm sm:text-base">
              تابع أحدث الملتقيات، الورش، والحملات الميدانية لنادي التمريض بجامعة حفر الباطن.
            </p>
          </div>

          <Link
            href="/events"
            className="px-6 py-3 rounded-2xl bg-[#F5D061] text-[#630517] font-black text-xs sm:text-sm shadow-lg hover:brightness-110 transition-all"
          >
            عرض كل الفعاليات ←
          </Link>
        </div>

        {/* شبكة عرض الفعاليات المصغرة بتصميم فخم ومتناسق */}
        <div className="grid md:grid-cols-3 gap-8">
          {eventsList.map((event, index) => (
            <div
              key={event.id || index}
              className="relative rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between group min-h-[400px] bg-slate-900 border border-[#F5D061]/30 transition-all hover:scale-[1.02]"
            >
              {/* خلفية البوستر مع التعتيم */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={event.poster || "/header-banner.png"}
                  alt={event.title}
                  fill
                  className="object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/40" />
              </div>

              {/* شارة الحالة العلوية */}
              <div className="relative z-10 p-6 flex justify-end">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-lg ${
                  event.status === 'upcoming' || event.status === 'قريباً' 
                    ? 'bg-[#F5D061] text-slate-950' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}>
                  {event.status === 'upcoming' || event.status === 'قريباً' ? '⏱️ قريبًا' : '✓ انتهت'}
                </span>
              </div>

              {/* تفاصيل الفعالية السفلية */}
              <div className="relative z-10 p-6 space-y-4 flex-1 flex flex-col justify-end">
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#F5D061] transition-colors line-clamp-1">
                    {event.title}
                  </h3>
                  {event.description && (
                    <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 space-y-2 text-xs font-bold text-slate-200">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
                    <span>📍</span>
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
                    <span>📆</span>
                    <span className="truncate">{event.date}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}