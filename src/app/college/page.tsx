'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '../lib/firebase';
import {
  emptyCollegeAdministration,
  loadCollegeAdministration,
  officeDisplayName,
  officeProfileHref,
  officesByTier,
  type CollegeAdministration,
  type CollegeOffice,
} from '../lib/collegeAdministration';

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0.14, rootMargin: '0px 0px -48px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`discover-reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function OfficePhoto({ office, tall = false }: { office: CollegeOffice; tall?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-[#630517] ${tall ? 'h-72 sm:h-80' : 'h-56 sm:h-64'}`}>
      {office.photo ? (
        <img
          src={office.photo}
          alt={office.name || office.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/logo.png';
          }}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <img src="/logo.png" alt="" className="w-20 h-20 object-contain opacity-80" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#3a020c]/70 via-transparent to-transparent" />
    </div>
  );
}

function OfficeCard({ office, featured = false, emptyName }: { office: CollegeOffice; featured?: boolean; emptyName: string }) {
  const profileHref = officeProfileHref(office);
  const card = (
    <article
      className={`overflow-hidden rounded-[1.75rem] border bg-white h-full transition-all duration-500 ${
        featured
          ? 'border-[#F5D061] shadow-[0_16px_40px_rgba(99,5,23,0.12)]'
          : 'border-slate-200/80 shadow-sm'
      } ${profileHref ? 'hover:shadow-xl hover:-translate-y-1' : ''}`}
    >
      <OfficePhoto office={office} tall={featured} />
      <div className="p-5 sm:p-6 space-y-2">
        <p className="text-[11px] font-black text-[#630517] bg-[#630517]/10 inline-block px-3 py-1 rounded-full">
          {office.title}
        </p>
        <h3 className={`font-black text-slate-900 leading-snug ${featured ? 'text-2xl' : 'text-lg'}`}>
          {officeDisplayName(office, emptyName)}
        </h3>
        {office.note ? <p className="text-[15px] text-slate-600 leading-8">{office.note}</p> : null}
        {profileHref ? (
          <p className="text-[12px] font-black text-[#0A66C2]">افتح الملف الشخصي ←</p>
        ) : null}
      </div>
    </article>
  );

  if (!profileHref) return card;

  return (
    <a
      href={profileHref}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
      title={`الملف الشخصي: ${officeDisplayName(office, emptyName)}`}
    >
      {card}
    </a>
  );
}

export default function CollegeAdministrationPage() {
  const [page, setPage] = useState<CollegeAdministration>(() => emptyCollegeAdministration());

  useEffect(() => {
    loadCollegeAdministration(db).then(setPage);
  }, []);

  const { copy, offices } = page;
  const dean = officesByTier(offices, 'dean')[0];
  const vices = officesByTier(offices, 'vice');
  const rest = officesByTier(offices, ['department', 'secretariat']);
  const extras = offices.filter((office) => office !== dean && !vices.includes(office) && !rest.includes(office));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 selection:bg-[#630517] selection:text-[#F5D061]" dir="rtl">
      <section className="bg-gradient-to-br from-[#3a020c] via-[#630517] to-[#4A030F] text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-6">
          <Reveal>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5">
                <Image src="/uhb-logo.png" alt="جامعة حفر الباطن" width={48} height={48} className="w-full h-full object-contain" />
              </div>
              <div className="w-[4.6rem] h-12 rounded-2xl bg-white px-1.5 py-1.5">
                <Image src="/logo.png" alt="نادي التمريض" width={74} height={48} className="w-full h-full object-contain" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <p className="text-[#F5D061] text-xs font-black tracking-widest">{copy.kicker}</p>
          </Reveal>
          <Reveal delay={140}>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight">{copy.title}</h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-amber-50/90 text-[15px] leading-8 max-w-2xl">{copy.intro}</p>
          </Reveal>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-16">
        {dean ? (
          <Reveal>
            <OfficeCard office={dean} featured emptyName={copy.emptyName} />
          </Reveal>
        ) : null}

        {vices.length > 0 && (
          <section className="space-y-6">
            <Reveal>
              <h2 className="text-3xl font-black text-slate-900">{copy.vicesTitle}</h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vices.map((office, index) => (
                <Reveal key={office.id} delay={index * 80}>
                  <OfficeCard office={office} emptyName={copy.emptyName} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section className="space-y-6">
            <Reveal>
              <h2 className="text-3xl font-black text-slate-900">{copy.restTitle}</h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rest.map((office, index) => (
                <Reveal key={office.id} delay={index * 80}>
                  <OfficeCard office={office} emptyName={copy.emptyName} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {extras.length > 0 && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {extras.map((office, index) => (
                <Reveal key={office.id} delay={index * 80}>
                  <OfficeCard office={office} emptyName={copy.emptyName} />
                </Reveal>
              ))}
            </div>
          </section>
        )}

        <Reveal>
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 sm:p-8 space-y-3">
            <h2 className="text-xl font-black text-[#630517]">{copy.clubTitle}</h2>
            <p className="text-[15px] text-slate-600 leading-8">{copy.clubBody}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/team" className="px-5 py-2.5 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs">
                قيادة النادي الطلابية
              </Link>
              <Link href="/discover" className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs">
                اكتشف النادي
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
