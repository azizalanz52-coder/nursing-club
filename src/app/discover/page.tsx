'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const DEFAULT_PASSION_SLIDES = [
  {
    id: 1,
    image: '/header-banner.png',
    quote: '«التمريض ليس مجرد مهنة، بل هو فن وعِلم يلامس حياة الإنسان في أصعب لحظاته.»'
  },
  {
    id: 2,
    image: '/logo.png',
    quote: '«بالعطاء المستمر والعمل الجماعي نصنع أثراً يخلده الزمن في قلوب المجتمع.»'
  },
  {
    id: 3,
    image: '/header-banner.png',
    quote: '«نطمح لأن نكون المنارة التي تضيء دروب التميز لكل ممرض وممرضة في جامعة حفر الباطن.»'
  }
];

const DEFAULT_DISCOVER_EVENTS = [
  {
    id: 1,
    title: 'ملتقى التمريض السنوي التفاعلي',
    category: 'أنشطة كبرى',
    description: 'ملتقى شامل يستعرض أحدث الممارسات التمريضية وورش العمل التطبيقية لطلاب وطالبات الكلية.',
    images: ['/header-banner.png', '/logo.png']
  },
  {
    id: 2,
    title: 'حملة القياسات الحيوية والتثقيف الصحي',
    category: 'خدمة المجتمع',
    description: 'فعالية توعوية ميدانية لقياس العلامات الحيوية وتقديم الاستشارات للزوار.',
    images: ['/logo.png', '/header-banner.png']
  },
  {
    id: 3,
    title: 'ورشة الإسعافات الأولية المتقدمة',
    category: 'ورش تدريبية',
    description: 'دورة تدريبية مكثفة بالتعاون مع الكوادر الطبية المتخصصة لتمكين الأعضاء من التعامل مع الحالات الحرجة.',
    images: ['/header-banner.png', '/logo.png']
  }
];

export default function DiscoverPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [passionSlides, setPassionSlides] = useState(DEFAULT_PASSION_SLIDES);
  const [discoverEvents, setDiscoverEvents] = useState(DEFAULT_DISCOVER_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<typeof DEFAULT_DISCOVER_EVENTS[0] | null>(null);

  // السلايدر التلقائي لبطاقة شغف وعطاء
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % passionSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [passionSlides.length]);

  // جلب البيانات المخزنة من لوحة التحكم
  useEffect(() => {
    const savedPassion = localStorage.getItem('UHB_PASSION_SLIDES');
    if (savedPassion) {
      try {
        const parsed = JSON.parse(savedPassion);
        if (parsed && parsed.length > 0) setPassionSlides(parsed);
      } catch (e) {
        console.error(e);
      }
    }

    const savedDiscover = localStorage.getItem('UHB_DISCOVER_EVENTS');
    if (savedDiscover) {
      try {
        const parsed = JSON.parse(savedDiscover);
        if (parsed && parsed.length > 0) setDiscoverEvents(parsed);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const activeSlide = passionSlides[currentSlide] || passionSlides[0];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      
      {/* شريط عنوان الصفحة */}
      <div className="py-14 bg-white border-b border-slate-200 text-center px-4 shadow-sm">
        <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase mb-3">
          استكشف عالمنا
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900">عن نادي التمريض</h1>
        <p className="text-slate-600 text-sm sm:text-base mt-2">تعرف على رؤيتنا، أنشطتنا، وشركاء النجاح</p>
      </div>

      {/* 1. قسم الإحصائيات */}
      <section className="py-12 bg-[#630517] text-white border-b border-[#F5D061]/20 shadow-md">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-2">
            <h3 className="text-4xl sm:text-5xl font-black text-[#F5D061]">200+</h3>
            <p className="text-amber-50/90 text-sm sm:text-base font-bold">عضو وعضوة</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-4xl sm:text-5xl font-black text-[#F5D061]">15+</h3>
            <p className="text-amber-50/90 text-sm sm:text-base font-bold">فعالية سنوية</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-4xl sm:text-5xl font-black text-[#F5D061]">300+</h3>
            <p className="text-amber-50/90 text-sm sm:text-base font-bold">ساعة تطوعية</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-4xl sm:text-5xl font-black text-[#F5D061]">4+</h3>
            <p className="text-amber-50/90 text-sm sm:text-base font-bold">سنوات من العطاء</p>
          </div>
        </div>
      </section>

      {/* 2. نبذة ورؤية النادي + بطاقة شغف عطاء واحترافية المتحركة بالصور */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6 text-right">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase">
              من نحن
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              نبذة عن نادي التمريض ورؤيتنا المستقبلية
            </h2>
            <p className="text-slate-600 leading-relaxed text-base font-medium">
              نُعد المظلة الرسمية لطلاب وطالبات تخصص التمريض في جامعة حفر الباطن. نسعى لخلق بيئة محفزة تجمع بين التميز الأكاديمي، المهارات القيادية، والممارسات الإنسانية الراقية لخدمة المجتمع الجامعي والمحلي.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <h4 className="font-bold text-[#630517] text-lg mb-2">رؤيتنا</h4>
                <p className="text-sm text-slate-600 leading-relaxed">الريادة والتميز في إعداد كوادر تمريضية قيادية ومؤثرة مجتمعياً واهتماماً بالمهنة.</p>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <h4 className="font-bold text-[#630517] text-lg mb-2">رسالتنا</h4>
                <p className="text-sm text-slate-600 leading-relaxed">تمكين الأعضاء وتنمية مهاراتهم عبر برامج وفعاليات نوعية وثقافية متقدمة.</p>
              </div>
            </div>
          </div>

          {/* بطاقة شغف، عطاء، واحترافية (مع صور السلايدر المتحركة والأوفرلاي) */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#630517]/10 rounded-3xl blur-2xl transform rotate-3" />
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 min-h-[380px] flex flex-col justify-between text-white p-8 sm:p-10">
              
              {/* خلفية الصورة المتحركة مع أوفرلاي فخم */}
              <div className="absolute inset-0 z-0">
                <img
                  src={activeSlide.image}
                  alt="شغف وعطاء"
                  className="w-full h-full object-cover scale-105 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-slate-950/40" />
              </div>

              {/* الشعار بالأعلى */}
              <div className="relative z-10 flex justify-between items-center">
                <div className="w-14 h-14 bg-[#630517] text-[#F5D061] rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border border-[#F5D061]/30">
                  UHB
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F5D061] font-bold border border-white/10">
                  شغف، عطاء، واحترافية
                </span>
              </div>

              {/* النص والمقولة */}
              <div className="relative z-10 space-y-3 text-center my-6">
                <h3 className="text-2xl sm:text-3xl font-black text-white">نادي التمريض</h3>
                <p className="text-amber-50 text-sm sm:text-base leading-relaxed font-semibold transition-opacity duration-700">
                  {activeSlide.quote}
                </p>
              </div>

              {/* نقاط المؤشر وتذييل البطاقة */}
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

        </div>
      </section>

      {/* 3. معرض الصور والأنشطة (مع سحب الصور المرفوعة من لوحة التحكم) */}
      <section className="py-20 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase">
              معرض الأنشطة
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              لقطات من فعالياتنا وبرامجنا
            </h2>
            <p className="text-slate-600 text-sm">اضغط على أي فعالية لاستعراض معرض الصور الكامل المرفوع من لوحة التحكم</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoverEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="group relative h-80 rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-md transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
              >
                <div className="absolute inset-0">
                  <img
                    src={event.images[0] || '/header-banner.png'}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent z-10" />
                
                <div className="absolute bottom-0 right-0 left-0 p-6 z-20 space-y-2 text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#F5D061] text-[#630517] font-bold text-xs">
                    {event.category} • {event.images.length} صور
                  </span>
                  <h4 className="text-xl font-black text-white leading-tight">{event.title}</h4>
                  <p className="text-xs text-amber-50/80 font-medium line-clamp-1">{event.description}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* النافذة المنبثقة (Modal) لعرض صور الفعالية بالكامل */}
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
                <h4 className="font-extrabold text-slate-900 text-lg mb-4">معرض الصور ({selectedEvent.images.length} صورة)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedEvent.images.map((img, idx) => (
                    <div key={idx} className="h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group bg-slate-100">
                      <img
                        src={img}
                        alt={`صورة ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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

      {/* 4. شركاء النجاح */}
      <section className="py-16 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-10">
          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              شركاء النجاح
            </h2>
            <p className="text-slate-600 text-sm font-medium">
              نعتز بشراكاتنا الدائمة لدعم فعاليات وأنشطة نادي التمريض
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
            <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 shadow-md flex items-center justify-center w-48 h-40 hover:border-[#630517] hover:scale-105 transition-all overflow-hidden">
              <img src="/wabal.png" alt="وبل" className="w-full h-full object-cover rounded-2xl shadow-inner" />
            </div>
            <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 shadow-md flex items-center justify-center w-48 h-40 hover:border-[#630517] hover:scale-105 transition-all overflow-hidden">
              <img src="/ghaa.png" alt="كوفي غاء" className="w-full h-full object-cover rounded-2xl shadow-inner" />
            </div>
          </div>
        </div>
      </section>

      {/* زر العودة للرئيسية */}
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