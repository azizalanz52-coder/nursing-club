'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function EventsPage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  
  // الفعاليات الافتراضية
  const defaultEvents = [
    {
      id: '1',
      title: 'ملتقى التمريض التفاعلي 2026',
      date: '25 سبتمبر 2026',
      location: 'مسرح جامعة حفر الباطن',
      status: 'upcoming',
      poster: '/header-banner.png',
      description: 'ملتقى يهدف إلى استعراض أحدث الممارسات في التمريض وورش عمل تفاعلية.'
    },
    {
      id: '2',
      title: 'حملة التوعية بالسكري',
      date: '15 مايو 2026',
      location: 'المجمع التجاري - حفر الباطن',
      status: 'past',
      poster: '/header-banner.png',
      description: 'حملة ميدانية استهدفت التوعية بأخطار السكري وتقديم فحوصات مجانية.'
    },
    {
      id: '3',
      title: 'اليوم العالمي للتمريض',
      date: '01 ديسمبر 2026',
      location: 'جامعة حفر الباطن',
      status: 'upcoming',
      poster: '/header-banner.png',
      description: 'احتفالية سنوية لتكريم وتقدير جهود مهنة التمريض العظيمة.'
    }
  ];

  const [events, setEvents] = useState(defaultEvents);

  useEffect(() => {
    // جلب الفعاليات المضافة من لوحة التحكم (Admin)
    const saved = localStorage.getItem('UHB_EVENTS');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setEvents(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // تصفية الفعاليات حسب الفلتر (الكل / قريباً / انتهت)
  const filteredEvents = events.filter(ev => {
    if (filter === 'upcoming') return ev.status === 'upcoming';
    if (filter === 'past') return ev.status === 'past';
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061] py-12" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* شريط علوي للتنقل */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-sm font-bold text-[#630517] hover:underline flex items-center gap-1">
            ← العودة للرئيسية
          </Link>
          <span className="px-4 py-1 rounded-full bg-[#630517]/10 text-[#630517] text-xs font-extrabold tracking-wider uppercase border border-[#630517]/20">
            فعاليات نادي التمريض • UHB
          </span>
        </div>

        {/* عنوان الصفحة */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">فعاليات وبرامج النادي</h1>
          <p className="text-slate-600 text-sm sm:text-base">استكشف الفعاليات القادمة والسابقة لنادي التمريض بكل حيوية وتفاصيل.</p>
        </div>

        {/* أزرار الفلترة (الكل / قريباً / انتهت) */}
        <div className="flex justify-center items-center gap-2">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'upcoming', label: 'الفعاليات القادمة' },
            { id: 'past', label: 'الفعاليات السابقة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                filter === tab.id
                  ? 'bg-[#630517] text-[#F5D061] shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* شبكة عرض الفعاليات */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">
              لا توجد فعاليات مطابقة حالياً.
            </div>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="relative rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between group min-h-[420px] bg-slate-900 border border-slate-800 transition-all hover:scale-[1.01]"
              >
                {/* خلفية البوستر مع التعتيم */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={ev.poster || '/logo.png'}
                    alt={ev.title}
                    fill
                    className="object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/40" />
                </div>

                {/* المحتوى العلوي: الشارة */}
                <div className="relative z-10 p-6 flex justify-between items-start">
                  <span className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl shadow-md">
                    🏥
                  </span>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 ${
                    ev.status === 'upcoming' 
                      ? 'bg-[#F5D061] text-slate-950' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}>
                    {ev.status === 'upcoming' ? '⏱️ قريبًا' : '✓ انتهت'}
                  </span>
                </div>

                {/* المحتوى السفلي: العنوان، التفاصيل، الأيقونات، وزر الدخول */}
                <div className="relative z-10 p-6 space-y-5 flex-1 flex flex-col justify-end">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white group-hover:text-[#F5D061] transition-colors leading-tight">
                      {ev.title}
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>

                  {/* معلومات التاريخ والمكان بتصميم الأقراص الأنيقة */}
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-200">
                      <span>📍</span>
                      <span className="truncate">{ev.location}</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-200">
                      <span>📅</span>
                      <span className="truncate">{ev.date}</span>
                    </div>
                  </div>

                  {/* زر الدخول للفعالية */}
                  <button 
                    onClick={() => alert(`تفاصيل فعالية: ${ev.title}\nالمكان: ${ev.location}\nالتاريخ: ${ev.date}`)}
                    className="w-full bg-[#F5D061] hover:bg-[#e6c152] text-slate-950 py-3 rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>تفاصيل الفعالية</span>
                    <span>←</span>
                  </button>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}