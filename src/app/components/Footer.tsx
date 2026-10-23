import Link from 'next/link';
import { SocialIcon } from './icons';

export default function Footer() {
  return (
    <footer className="bg-[#630517] text-white py-7 border-t border-[#F5D061]/20" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

        <div className="flex flex-col items-center xl:items-start gap-2">
          <p className="flex flex-wrap items-center justify-center xl:justify-start gap-x-2 gap-y-1 text-xs text-amber-50/80 font-medium">
            <span className="whitespace-nowrap">جميع الحقوق محفوظة</span>
            <span className="text-[#F5D061]">•</span>
            <span className="whitespace-nowrap">نادي التمريض بجامعة حفر الباطن</span>
            <span className="whitespace-nowrap">© 2026</span>
          </p>
          <div className="flex flex-wrap items-center justify-center xl:justify-start gap-x-3 gap-y-1 text-[11px] font-black text-[#F5D061]">
            <Link href="/college" className="hover:text-white">إدارة كلية التمريض</Link>
            <span className="text-white/40">•</span>
            <Link href="/discover" className="hover:text-white">اكتشف النادي</Link>
            <span className="text-white/40">•</span>
            <Link href="/newsletter" className="hover:text-white">النشرة</Link>
            <span className="text-white/40">•</span>
            <Link href="/events" className="hover:text-white">الفعاليات</Link>
            <span className="text-white/40">•</span>
            <Link href="/team" className="hover:text-white">القادة</Link>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 lg:flex-row lg:flex-wrap lg:justify-center xl:justify-end">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-bold">
            <span className="text-[#F5D061] whitespace-nowrap">صنع بواسطة:</span>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-white/90">
              <span className="whitespace-nowrap">عبدالعزيز سليمان العنزي</span>
              <span className="text-[#F5D061]">•</span>
              <span className="whitespace-nowrap">عبدالله محمد المطيري</span>
              <span className="text-[#F5D061]">•</span>
              <span className="whitespace-nowrap">عبدالله سعدون الشمري</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <a
              href="https://x.com/Nurs_club"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 bg-black/40 hover:bg-black/60 border border-[#F5D061]/30 text-white px-3 py-2 rounded-xl transition-all inline-flex items-center gap-2 whitespace-nowrap"
              dir="ltr"
              title="حسابنا على إكس"
            >
              <SocialIcon name="x" size={15} title="إكس" />
              <span>@Nurs_club</span>
            </a>

            <a
              href="https://tiktok.com/@Nurs_club"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 bg-black/40 hover:bg-black/60 border border-[#F5D061]/30 text-white px-3 py-2 rounded-xl transition-all inline-flex items-center gap-2 whitespace-nowrap"
              dir="ltr"
              title="حسابنا على تيك توك"
            >
              <SocialIcon name="tiktok" size={15} title="تيك توك" />
              <span>@Nurs_club</span>
            </a>

            <a
              href="https://wa.me/966553731265?text=السلام عليكم، لدي استفسار أو مشكلة بخصوص موقع نادي التمريض"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all whitespace-nowrap"
            >
              <SocialIcon name="whatsapp" size={16} title="واتساب" />
              <span>تواصل معنا عبر الواتساب</span>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
