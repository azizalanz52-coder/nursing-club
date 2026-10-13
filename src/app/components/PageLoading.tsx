export default function PageLoading({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6" dir="rtl">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-[#630517] text-[#F5D061] flex items-center justify-center font-black shadow">
          N
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
