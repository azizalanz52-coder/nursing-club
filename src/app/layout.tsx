import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Readex_Pro } from 'next/font/google';
import AppShell from './AppShell';

const readex = Readex_Pro({
  variable: '--font-readex',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'نادي التمريض - جامعة حفر الباطن',
  applicationName: 'نادي التمريض',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'نادي التمريض',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'نادي التمريض - جامعة حفر الباطن',
    description:
      'مجتمع طلابي يهدف إلى تطوير المعرفة، وبناء المهارات القيادية، وصناعة أثر في مجال التمريض بجامعة حفر الباطن.',
    images: ['https://nursing-club.vercel.app/logo.png'],
    url: 'https://nursing-club.vercel.app',
    type: 'website',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#630517',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" className={`${readex.variable} ${readex.className} antialiased`}>
      <body className="min-h-dvh flex flex-col bg-slate-50 text-slate-800">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
