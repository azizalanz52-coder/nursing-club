export default function Footer() {
  return (
    <footer className="bg-[#630517] text-white py-8 border-t border-[#F5D061]/20" dir="rtl">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        
        <p className="text-xs text-amber-50/80 font-medium">
          جميع الحقوق محفوظة • نادي التمريض بجامعة حفر الباطن © 2026
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-bold">
          <span className="text-[#F5D061]">
            صنع بواسطة: عبدالعزيز العنزي
          </span>
          
          <a
            href="https://wa.me/966553731265?text=السلام عليكم، لدي استفسار أو مشكلة بخصوص موقع نادي التمريض"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all shadow"
          >
            <span>💬</span>
            <span>تواصل معنا عبر الواتساب </span>
          </a>
        </div>

      </div>
    </footer>
  );
}