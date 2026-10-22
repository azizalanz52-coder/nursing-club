'use client';

export default function OpeningSplash() {
  return (
    <main className="fixed inset-0 z-[90] flex flex-col overflow-hidden pointer-events-none" dir="rtl">
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
        @keyframes nursGlowA {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-8%, 6%) scale(1.12); }
        }
        @keyframes nursGlowB {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(10%, -8%) scale(1.08); }
        }
        @keyframes nursSpine {
          0% { transform: translateX(-50%) scaleY(0); opacity: 0; }
          18% { transform: translateX(-50%) scaleY(1); opacity: 1; }
          100% { transform: translateX(-50%) scaleY(1); opacity: 1; }
        }
        @keyframes nursSpineGlow {
          0%, 12% { transform: translateX(-50%) scaleY(0) scaleX(0.4); opacity: 0; }
          22% { transform: translateX(-50%) scaleY(1) scaleX(7); opacity: 0.95; }
          40% { transform: translateX(-50%) scaleY(1) scaleX(1.2); opacity: 0.55; }
          100% { transform: translateX(-50%) scaleY(1) scaleX(1); opacity: 0.28; }
        }
        @keyframes nursBurstLeft {
          0%, 20% { transform: translateX(78%) scale(0.72); opacity: 0; filter: blur(10px); }
          56% { transform: translateX(-7%) scale(1.06); opacity: 1; filter: blur(0); }
          74% { transform: translateX(3%) scale(0.98); }
          100% { transform: none; opacity: 1; filter: none; }
        }
        @keyframes nursBurstRight {
          0%, 20% { transform: translateX(-78%) scale(0.72); opacity: 0; filter: blur(10px); }
          56% { transform: translateX(7%) scale(1.06); opacity: 1; filter: blur(0); }
          74% { transform: translateX(-3%) scale(0.98); }
          100% { transform: none; opacity: 1; filter: none; }
        }
        .nurs-cover-in { animation: nursCoverIn 0.75s ease both; }
        .nurs-cover-late { animation: nursCoverIn 0.8s 0.15s ease both; }
        .nurs-sweep { animation: nursSweep 1.8s ease-in-out infinite; }
        .nurs-breath { animation: nursBreath 1.6s ease-in-out infinite; }
        .nurs-glow-a { animation: nursGlowA 7s ease-in-out infinite; }
        .nurs-glow-b { animation: nursGlowB 9s ease-in-out infinite; }
        .nurs-spine { animation: nursSpine 1.15s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .nurs-spine-glow { animation: nursSpineGlow 1.7s ease-out both; }
        .nurs-burst-left { animation: nursBurstLeft 1.55s 0.12s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .nurs-burst-right { animation: nursBurstRight 1.55s 0.12s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <section className="relative flex-[1.2] bg-[#F6EFE0] flex items-center justify-center px-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="nurs-glow-a absolute -top-24 right-[-8%] h-80 w-80 rounded-full bg-[#F5D061]/22 blur-3xl" />
          <div className="nurs-glow-b absolute -bottom-28 left-[-10%] h-96 w-96 rounded-full bg-[#E8C96A]/16 blur-3xl" />
        </div>

        <div className="relative z-10 w-[min(92vw,540px)] h-[min(38vw,176px)]" dir="ltr">
          <div className="absolute inset-y-0 left-0 right-[50%] overflow-hidden flex items-center justify-end pr-3.5 sm:pr-5">
            <img
              src="/nurs-wordmark.png?v=pair"
              alt="شعار نادي التمريض"
              className="nurs-burst-left h-[62%] w-auto max-w-[94%] object-contain drop-shadow-[0_8px_18px_rgba(99,5,23,0.12)]"
            />
          </div>
          <div className="absolute inset-y-0 left-[50%] right-0 overflow-hidden flex items-center justify-start pl-3.5 sm:pl-5">
            <img
              src="/uhb-logo.png?v=pair"
              alt="شعار جامعة حفر الباطن"
              className="nurs-burst-right h-[92%] w-auto max-w-[78%] object-contain drop-shadow-[0_8px_18px_rgba(99,5,23,0.12)]"
            />
          </div>
          <div className="nurs-spine pointer-events-none absolute left-1/2 top-[8%] bottom-[8%] w-px origin-center bg-gradient-to-b from-transparent via-[#630517] to-transparent" />
          <div className="nurs-spine-glow pointer-events-none absolute left-1/2 top-[6%] bottom-[6%] w-[2px] origin-center bg-[#F5D061] blur-[1.5px]" />
        </div>
      </section>

      <div className="relative h-[3px] overflow-hidden bg-[#3a020c]">
        <div className="nurs-sweep absolute inset-y-0 w-1/3 bg-gradient-to-l from-transparent via-[#F5D061] to-transparent" />
      </div>

      <section className="flex-1 bg-[#4A030F] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="nurs-cover-late text-white font-black leading-[1.9] text-[clamp(1.15rem,4.8vw,1.85rem)] px-3">
          اللهم صل وسلم على نبينا محمد
        </h1>
        <p className="nurs-cover-late mt-2 text-[#F5D061] text-lg">ﷺ</p>
        <span className="nurs-breath mt-6 inline-block w-2.5 h-2.5 rounded-full bg-[#F5D061] shadow-[0_0_12px_#F5D061]" />
        <p className="nurs-cover-late mt-5 text-[11px] text-[#F5D061]/75 font-semibold px-4">
          نادي التمريض • جامعة حفر الباطن
        </p>
      </section>
    </main>
  );
}
