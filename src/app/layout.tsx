'use client';

import { useState, useEffect } from "react";
import "./globals.css";
import { Kufam } from "next/font/google";
import Navbar from "./components/Navbar";
import Image from "next/image";

const kufam = Kufam({
  variable: "--font-kufam",
  subsets: ["arabic", "latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="ar" className={`${kufam.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        {isLoading ? (
          <main className="min-h-screen bg-[#4A030F] flex items-center justify-center px-4 relative overflow-hidden fixed inset-0 z-50" dir="rtl">
            
            {/* البوكس الزجاجي الداخلي */}
            <div className="max-w-md w-full bg-[#35020A]/85 backdrop-blur-xl border border-[#F5D061]/30 p-8 rounded-3xl shadow-2xl text-center space-y-6 text-white relative z-10 flex flex-col items-center">
              
              {/* حاوية الشعار مع المربعات الددوارة */}
              <div className="relative w-32 h-32 flex items-center justify-center my-2">
                {/* المربع الدوار الأول */}
                <div className="absolute inset-0 border-2 border-[#F5D061]/60 rounded-3xl animate-[spin_6s_linear_infinite] shadow-lg"></div>
                {/* المربع الدوار الثاني بعكس الاتجاه */}
                <div className="absolute inset-[-6px] border border-[#F5D061]/30 rounded-[28px] animate-[spin_10s_linear_infinite_reverse]"></div>
                
                {/* مربع أبيض ناصع بخلفية فاخرة ليظهر الشعار بكامل وضوحه */}
                <div className="relative w-24 h-24 bg-white border-2 border-[#F5D061] rounded-2xl flex flex-col items-center justify-center shadow-2xl overflow-hidden p-2">
                  <Image
                    src="/logo.png"
                    alt="شعار نادي التمريض"
                    width={55}
                    height={55}
                    className="object-contain drop-shadow"
                  />
                  <span className="text-[9px] font-black text-[#630517] tracking-tighter mt-1">
                    NURSING CLUB
                  </span>
                </div>
              </div>

              {/* شارة جاري تجهيز التجربة */}
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#5A0412] border border-[#F5D061]/40 text-[#F5D061] text-xs font-bold tracking-wider uppercase shadow-inner">
                <span>✨</span>
                <span>جاري تجهيز التجربة</span>
              </div>

              {/* النص الترحيبي والصلاة على النبي */}
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#FFFDF7] leading-relaxed">
                  اللهم صل وسلم على نبينا محمد
                </h2>
                <p className="text-amber-50/70 text-xs sm:text-sm">
                  لحظات بسيطة ونجهز لك محتوى نادي التمريض
                </p>
              </div>

              {/* شريط التحميل المدرج والسميك */}
              <div className="w-full bg-[#240106] rounded-full h-3.5 p-0.5 border border-[#F5D061]/20 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-[#C99C21] via-[#E2B739] to-[#F5D061] h-full rounded-full animate-pulse w-full shadow-md"></div>
              </div>

              {/* التوقيع السفلي */}
              <div className="text-[11px] text-[#F5D061]/70 font-semibold tracking-wider uppercase pt-1">
                نادي التمريض • جامعة حفر الباطن
              </div>

            </div>
          </main>
        ) : (
          <>
            <Navbar />
            {children}
          </>
        )}
      </body>
    </html>
  );
}