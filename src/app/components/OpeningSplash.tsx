export default function OpeningSplash() {
  return (
    <main className="fixed inset-0 z-50 flex flex-col overflow-hidden" dir="rtl">
      <style>{`
        @keyframes nursCoverIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes nursSweep {
          0% { transform: translateX(120%); }
          100% { transform: translateX(-220%); }
        }
        @keyframes nursBreath {
          0%, 100% { transform: scale(0.85); opacity: 0.45; }
          50% { transform: scale(1); opacity: 1; }
        }
        .nurs-cover-in { animation: nursCoverIn 0.75s ease both; }
        .nurs-cover-late { animation: nursCoverIn 0.8s 0.15s ease both; }
        .nurs-sweep { animation: nursSweep 1.8s ease-in-out infinite; }
        .nurs-breath { animation: nursBreath 1.6s ease-in-out infinite; }
      `}</style>

      <section className="relative flex-[1.2] bg-[#F6EFE0] flex items-center justify-center px-6">
        <img
          src="/nurs-wordmark.png?v=full"
          alt="شعار نادي التمريض NURSS - جامعة حفر الباطن"
          className="nurs-cover-in w-[min(58vw,240px)] h-auto object-contain"
        />
      </section>

      <div className="relative h-[3px] overflow-hidden bg-[#3a020c]">
        <div className="nurs-sweep absolute inset-y-0 w-1/3 bg-gradient-to-l from-transparent via-[#F5D061] to-transparent" />
      </div>

      <section className="flex-1 bg-[#4A030F] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="nurs-cover-late text-white font-black leading-[1.75] text-[clamp(1.4rem,4.4vw,2.2rem)]">
          اللهم صل وسلم
          <br />
          على نبينا محمد
        </h1>
        <p className="nurs-cover-late mt-2 text-[#F5D061] text-xl tracking-[0.28em]">ﷺ</p>
        <span className="nurs-breath mt-6 inline-block w-2.5 h-2.5 rounded-full bg-[#F5D061] shadow-[0_0_12px_#F5D061]" />
        <p className="nurs-cover-late mt-5 text-[11px] text-[#F5D061]/75 font-semibold tracking-[0.22em]">
          نادي التمريض • جامعة حفر الباطن
        </p>
      </section>
    </main>
  );
}
