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
    // إخفاء شاشة التحميل بعد 3 ثوانٍ (3000 ملي ثانية)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang="ar" className={`${kufam.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        {isLoading ? (
          <main className="min-h-screen bg-[#630517] flex items-center justify-center px-4 relative overflow-hidden fixed inset-0 z-50" dir="rtl">
            <div className="absolute w-96 h-96 bg-[#F5D061]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-[#F5D061]/30 p-8 rounded-3xl shadow-2xl text-center space-y-6 text-white relative z-10">
              
              <div className="relative w-20 h-20 mx-auto bg-[#630517]/80 border border-[#F5D061]/40 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="شعار نادي التمريض"
                  width={50}
                  height={50}
                  className="object-contain drop-shadow"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#F5D061]/10 border border-[#F5D061]/30 text-[#F5D061] text-xs font-bold tracking-wider uppercase">
                <span>✨</span>
                <span>جاري تجهيز التجربة</span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#FFFDF7] leading-relaxed">
                  اللهم صل وسلم على نبينا محمد
                </h2>
                <p className="text-amber-50/70 text-xs sm:text-sm">
                  لحظات بسيطة ونجهز لك محتوى نادي التمريض
                </p>
              </div>

              <div className="w-full bg-black/60 rounded-full h-2.5 p-0.5 border border-[#F5D061]/20 overflow-hidden">
                <div className="bg-gradient-to-r from-[#F5D061] to-[#E2B739] h-full rounded-full animate-pulse w-full"></div>
              </div>

              <div className="text-[11px] text-[#F5D061]/70 font-semibold tracking-wider uppercase">
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