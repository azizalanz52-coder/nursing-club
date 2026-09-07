import type { Metadata } from "next";
import "./globals.css";
import { Kufam } from "next/font/google";
import Navbar from "./components/Navbar";
const kufam = Kufam({
  variable: "--font-kufam",
  subsets: ["arabic", "latin"],
});
export const metadata = {
  title: 'Nursing Club | UHB',
  description: 'نادي التمريض - جامعة حفر الباطن',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      className={`${kufam.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
