'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { buildCommitteeRadar, CommitteeRadarCard, openCommitteeRadarPrint } from '../../lib/committeeRadar';

type Props = {
  committees: any[];
  requests: Record<string, any>[];
  mediaUploads: any[];
  certificates: any[];
  partners: any[];
  events: any[];
  scientificTexts: any[];
  qualityEvaluationReports: any[];
  qualityUploadedFiles: any[];
  escalatedReports: any[];
  matchesCommittee: (choice: string, target: string) => boolean;
};

function radarPoints(scores: number[], cx: number, cy: number, maxR: number) {
  const n = scores.length;
  return scores.map((score, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = (Math.max(0, Math.min(100, score)) / 100) * maxR;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

function ringPoints(level: number, n: number, cx: number, cy: number, maxR: number) {
  return radarPoints(Array(n).fill(level), cx, cy, maxR);
}

export default function CommitteePerformanceRadar({
  committees,
  requests,
  mediaUploads,
  certificates,
  partners,
  events,
  scientificTexts,
  qualityEvaluationReports,
  qualityUploadedFiles,
  escalatedReports,
  matchesCommittee,
}: Props) {
  const [hrCertificates, setHrCertificates] = useState(certificates.length);
  const [fieldPartners, setFieldPartners] = useState(partners.length);
  const [committeeTexts, setCommitteeTexts] = useState(0);

  useEffect(() => {
    const loadExtra = async () => {
      try {
        const [hrSnap, partnerSnap, textSnap] = await Promise.all([
          getDocs(collection(db, 'certificates')),
          getDocs(collection(db, 'public_partners_relations')),
          getDocs(collection(db, 'scientific_committee_texts')),
        ]);
        setHrCertificates(Math.max(certificates.length, hrSnap.size));
        setFieldPartners(Math.max(partners.length, partnerSnap.size));
        setCommitteeTexts(textSnap.size);
      } catch (err) {
        console.error(err);
        setHrCertificates(certificates.length);
        setFieldPartners(partners.length);
      }
    };
    loadExtra();
  }, [certificates.length, partners.length]);

  const cards = useMemo(() => {
    const acceptedMembersByCommittee: Record<string, number> = {};
    const escalatedByCommittee: Record<string, number> = {};

    committees.forEach((comm) => {
      acceptedMembersByCommittee[comm.name] = requests.filter(
        (r) => r.status === 'مقبول' && matchesCommittee(r.acceptedCommittee || '', comm.name)
      ).length;
      escalatedByCommittee[comm.name] = escalatedReports.filter((rep) =>
        matchesCommittee(rep.targetCommittee || '', comm.name)
      ).length;
    });

    return buildCommitteeRadar(committees, {
      mediaCount: mediaUploads.length,
      hrCertificates,
      partnersCount: fieldPartners,
      scientificTexts: Math.max(scientificTexts.length, committeeTexts),
      eventsCount: events.length,
      qualityEvaluations: qualityEvaluationReports.length,
      qualityFiles: qualityUploadedFiles.length,
      escalatedByCommittee,
      acceptedMembersByCommittee,
    });
  }, [
    committees,
    requests,
    mediaUploads.length,
    hrCertificates,
    fieldPartners,
    scientificTexts.length,
    committeeTexts,
    events.length,
    qualityEvaluationReports.length,
    qualityUploadedFiles.length,
    escalatedReports,
    matchesCommittee,
  ]);

  const clubScore = cards.length
    ? Math.round(cards.reduce((sum, card) => sum + card.score, 0) / cards.length)
    : 0;
  const issueCount = cards.reduce((sum, card) => sum + card.negatives.length, 0);
  const strengthCount = cards.reduce((sum, card) => sum + card.positives.length, 0);
  const today = new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' });

  return (
    <div className="space-y-6 print:text-black">
      <div className="bg-[#1e1b4b] text-white rounded-3xl p-8 shadow-xl space-y-5 print:bg-white print:text-black print:border print:border-slate-300">
        <div className="flex flex-wrap justify-between gap-4 items-start">
          <div className="space-y-2 max-w-2xl">
            <p className="text-[10px] font-black tracking-[0.2em] text-amber-300 print:text-[#630517]">
              وثيقة رقابية داخلية • نادي التمريض • جامعة حفر الباطن
            </p>
            <h3 className="text-2xl font-black">رادار أداء اللجان الشامل</h3>
            <p className="text-xs text-indigo-100 leading-relaxed print:text-slate-600">
              أداة إدارية لرصد الإنتاج المسجّل، جاهزية القيادة، والانضباط. تُستخدم لإثبات أن إدارة النادي تتابع السلبيات والإيجابيات ولا تكتفي بالنشاط الشكلي.
            </p>
            <p className="text-[11px] text-indigo-200 print:text-slate-500">تاريخ الاستخراج: {today}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <StatBox label="مؤشر النادي" value={`${clubScore}%`} />
            <StatBox label="إيجابيات مرصودة" value={String(strengthCount)} />
            <StatBox label="سلبيات للمتابعة" value={String(issueCount)} />
            <button
              type="button"
              onClick={() => openCommitteeRadarPrint({
                cards,
                clubScore,
                strengthCount,
                issueCount,
                extractedAt: today,
              })}
              className="px-4 py-3 rounded-2xl bg-amber-300 text-indigo-950 font-black text-xs hover:bg-amber-200 print:hidden"
            >
              طباعة التقرير للكلية
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-white rounded-3xl border border-indigo-100 p-6 shadow-sm">
          <h4 className="font-black text-slate-900 mb-1">خريطة الرادار</h4>
          <p className="text-[11px] text-slate-500 mb-4">كل محور لجنة. كلما اتسع الشكل كان الأداء أشمل وأكثر توازنًا.</p>
          <RadarSvg cards={cards} />
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h4 className="font-black text-slate-900">منهج القياس</h4>
          <ul className="text-[12px] text-slate-600 space-y-2 leading-relaxed">
            <li><strong>الإعلام:</strong> الصور والفيديوهات المرفوعة.</li>
            <li><strong>الموارد البشرية:</strong> الشهادات الصادرة.</li>
            <li><strong>العلاقات العامة:</strong> سجل الشراكات والرعاة.</li>
            <li><strong>المحتوى العلمي:</strong> النصوص المعتمدة.</li>
            <li><strong>الجودة:</strong> التقارير والتقييمات. جهاز رقابي بلا أعضاء.</li>
            <li><strong>التصميم وتنظيم الفعاليات:</strong> عملهما ميداني/تنسيقي؛ يُقاسان بالقيادة والكادر والانضباط وما يُوثَّق على المنصة.</li>
          </ul>
          <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-3">
            الدرجة = إنتاج المنصة + جاهزية القيادة والكادر + الانضباط (بلاغات الجودة). ليست تقييمًا شخصيًا، بل سجل تشغيلي.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((card) => (
          <article key={card.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h4 className="font-black text-slate-900">{card.name}</h4>
                <p className="text-[11px] text-slate-500">{card.kpiLabel}: {card.kpiValue}</p>
              </div>
              <div className="text-left">
                <p className="text-2xl font-black text-indigo-800">{card.score}%</p>
                <p className={`text-[10px] font-black ${
                  card.status === 'صارم ومستقر' ? 'text-emerald-600' : card.status === 'تحت المتابعة' ? 'text-amber-600' : 'text-red-600'
                }`}>{card.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniMeter label="إنتاج" value={card.output} />
              <MiniMeter label="جاهزية" value={card.readiness} />
              <MiniMeter label="انضباط" value={card.discipline} />
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-black text-emerald-800">الإيجابيات</p>
              {card.positives.map((item) => (
                <p key={item} className="text-[11px] text-emerald-900 bg-emerald-50 rounded-lg px-2.5 py-1.5">+ {item}</p>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-black text-red-800">السلبيات للمتابعة</p>
              {card.negatives.length === 0 ? (
                <p className="text-[11px] text-slate-500">لا توجد سلبيات تشغيلية مسجّلة.</p>
              ) : card.negatives.map((item) => (
                <p key={item} className="text-[11px] text-red-900 bg-red-50 rounded-lg px-2.5 py-1.5">− {item}</p>
              ))}
            </div>
            {card.note ? <p className="text-[11px] text-slate-500 leading-relaxed">{card.note}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 min-w-[7rem] text-center print:bg-slate-50 print:border-slate-200">
      <p className="block text-2xl font-black text-amber-300 print:text-[#630517]">{value}</p>
      <p className="text-[10px] font-bold text-indigo-100 print:text-slate-500">{label}</p>
    </div>
  );
}

function MiniMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-xl px-2 py-2">
      <p className="text-[10px] text-slate-500 font-bold">{label}</p>
      <p className="text-sm font-black text-slate-800">{value}%</p>
    </div>
  );
}

function RadarSvg({ cards }: { cards: CommitteeRadarCard[] }) {
  const cx = 210;
  const cy = 210;
  const maxR = 140;
  const n = cards.length || 1;
  const scores = cards.map((card) => card.score);
  const shortName = (name: string) => name.replace('لجنة ', '');

  return (
    <svg viewBox="0 0 420 420" className="w-full max-w-[420px] mx-auto">
      {[25, 50, 75, 100].map((level) => (
        <polygon
          key={level}
          points={ringPoints(level, n, cx, cy, maxR)}
          fill="none"
          stroke="#c7d2fe"
          strokeWidth="1"
        />
      ))}
      {cards.map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = cx + maxR * Math.cos(angle);
        const y = cy + maxR * Math.sin(angle);
        const lx = cx + (maxR + 28) * Math.cos(angle);
        const ly = cy + (maxR + 28) * Math.sin(angle);
        return (
          <g key={cards[i].id}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#e0e7ff" strokeWidth="1" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="700"
              fill="#312e81"
            >
              {shortName(cards[i].name)}
            </text>
          </g>
        );
      })}
      <polygon
        points={radarPoints(scores, cx, cy, maxR)}
        fill="rgba(79, 70, 229, 0.28)"
        stroke="#4338ca"
        strokeWidth="2.5"
      />
      {scores.map((score, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const r = (score / 100) * maxR;
        return <circle key={cards[i].id} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} r="4" fill="#312e81" />;
      })}
    </svg>
  );
}
