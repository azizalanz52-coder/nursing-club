import Link from "next/link";

export default function DiscoverPage() {
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

      {/* 2. نبذة ورؤية النادي */}
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

          <div className="relative">
            <div className="absolute inset-0 bg-[#630517]/10 rounded-3xl blur-2xl transform rotate-3" />
            <div className="relative bg-white border border-slate-200 p-8 sm:p-10 rounded-3xl shadow-xl text-center space-y-6">
              <div className="w-16 h-16 bg-[#630517] text-[#F5D061] rounded-2xl mx-auto flex items-center justify-center font-black text-2xl shadow-lg">
                UHB
              </div>
              <h3 className="text-2xl font-bold text-slate-900">شغف، عطاء، واحترافية</h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                &quot;التمريض ليس مجرد مهنة، بل هو فن وعِلم يلامس حياة الإنسان في أصعب لحظاته.&quot;
              </p>
              <div className="pt-2 text-xs text-[#630517] font-extrabold tracking-wider uppercase">
                جامعة حفر الباطن • كلية التمريض
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. معرض الصور والأنشطة */}
      <section className="py-20 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#630517]/10 border border-[#630517]/20 text-[#630517] text-xs font-extrabold tracking-widest uppercase">
              معرض الأنشطة
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              لقطات من فعالياتنا وبرامجنا
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="group relative h-72 rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-lg">
                  [ صورة فعالية {item} ]
                </div>
                <div className="absolute bottom-0 right-0 left-0 p-6 z-20 space-y-1">
                  <span className="text-xs text-[#F5D061] font-bold">أنشطة النادي</span>
                  <h4 className="text-lg font-bold text-white">عنوان الفعالية أو الورشة التدريبية رقم {item}</h4>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

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