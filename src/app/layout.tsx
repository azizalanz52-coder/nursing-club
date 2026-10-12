'use client';

import { useState, useEffect } from "react";
import "./globals.css";
import { Readex_Pro } from "next/font/google";
import Navbar from "./components/Navbar";
import OpeningSplash from "./components/OpeningSplash";

const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="ar" className={`${readex.variable} ${readex.className} h-full antialiased`}>
      <head>
        <title>نادي التمريض - جامعة حفر الباطن</title>
        <meta name="application-name" content="نادي التمريض" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="نادي التمريض" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#630517" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="icon" href="/logo.png" />

        {/* وسوم ظهور شعار النادي عند مشاركة الرابط في واتساب وسوشيال ميديا */}
        <meta property="og:title" content="نادي التمريض - جامعة حفر الباطن" />
        <meta property="og:description" content="مجتمع طلابي يهدف إلى تطوير المعرفة، وبناء المهارات القيادية، وصناعة أثر في مجال التمريض بجامعة حفر الباطن." />
        <meta property="og:image" content="https://nursing-club.vercel.app/logo.png" />
        <meta property="og:url" content="https://nursing-club.vercel.app" />
        <meta property="og:type" content="website" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800">
        {isLoading ? (
          <OpeningSplash />
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