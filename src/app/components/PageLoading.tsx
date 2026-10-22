export default function PageLoading({
  title = 'جاري التحميل',
  hint,
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6" dir="rtl">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto flex items-center justify-center gap-3" dir="ltr">
          <img
            src="/logo.png?v=pair"
            alt="شعار نادي التمريض"
            className="h-11 w-auto max-w-[7.5rem] object-contain"
          />
          <div className="w-px h-10 bg-[#630517]/20" />
          <img
            src="/uhb-logo.png?v=pair"
            alt="شعار جامعة حفر الباطن"
            className="h-12 w-auto max-w-[2.8rem] object-contain"
          />
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-[#630517] animate-pulse" />
        </div>
        <p className="text-sm font-black text-slate-800">{title}</p>
        {hint ? <p className="text-xs text-slate-500 font-medium leading-relaxed">{hint}</p> : null}
      </div>
    </main>
  );
}
