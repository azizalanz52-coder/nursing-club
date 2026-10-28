'use client';

import type { ReactNode } from 'react';
import { WEEKLY_RACE_EXAMPLE } from '../lib/caseStudyCompetitionPoll';
import { ClubIcon } from './icons';

function Pill({
  children,
  tone = 'gold',
}: {
  children: ReactNode;
  tone?: 'gold' | 'burgundy' | 'soft';
}) {
  const cls =
    tone === 'gold' ? 'bg-[#F5D061] text-[#630517]' :
    tone === 'burgundy' ? 'bg-[#630517] text-[#F5D061]' :
    'bg-white/90 text-[#630517] border border-[#630517]/15';
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full ${cls}`}>
      {children}
    </span>
  );
}

export function OverallRaceExample() {
  return (
    <div className="space-y-2.5 pb-3 mb-3 border-b border-slate-100">
      <p className="text-[10px] font-bold text-slate-500 leading-6">
        مثال اللوحة العامة: النقاط الكلية + عدد الصدارات الأسبوعية. الشهادة الخاصة بعد 3 صدارات خلال الفصل، مو شرط متتالية.
      </p>
      {WEEKLY_RACE_EXAMPLE.overall.map((row, idx) => (
        <div key={row.name} className="flex items-center justify-between p-3 rounded-2xl text-xs font-bold bg-amber-50 border border-[#F5D061]/50">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
              idx === 0 ? 'bg-amber-400 text-slate-900' :
              idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700 text-white'
            }`}>
              {idx + 1}
            </span>
            <div className="min-w-0 space-y-1">
              <span className="block truncate text-slate-800">{row.name}</span>
              <div className="flex flex-wrap items-center gap-1">
                {row.distinguished ? (
                  <Pill tone="gold"><ClubIcon name="medal" size={10} /> عضو مميز</Pill>
                ) : null}
                {row.lastWeekChampion ? (
                  <Pill tone="burgundy"><ClubIcon name="crown" size={10} /> متصدر الأسبوع الماضي</Pill>
                ) : null}
                {row.specialCert ? (
                  <Pill tone="gold"><ClubIcon name="scroll" size={10} /> شهادة خاصة · 3 صدارات</Pill>
                ) : row.titles >= 2 ? (
                  <span className="text-[9px] font-bold text-slate-500">باقي صدارة واحدة على الشهادة</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="text-left shrink-0 space-y-1">
            <span className="block px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-[#630517] text-[#F5D061]">
              {row.total} نقطة
            </span>
            <p className="text-[9px] font-bold text-slate-600">
              {row.titles} {row.titles === 1 ? 'صدارة أسبوعية' : 'صدارات أسبوعية'}
            </p>
          </div>
        </div>
      ))}
      <p className="text-[10px] font-black text-[#630517] pt-1">اللوحة الحالية الحقيقية</p>
    </div>
  );
}

export default function WeeklyRaceExample() {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold text-slate-500 leading-6">
        {WEEKLY_RACE_EXAMPLE.caption} · {WEEKLY_RACE_EXAMPLE.weekLabel} · النقاط تبدأ من الصفر كل أحد
      </p>
      <p className="text-[10px] font-bold text-[#630517] leading-6 bg-[#630517]/5 rounded-xl px-3 py-2">
        الأسبوع يُقفل السبت 11:59 م الرياض. عند تعادل النقاط يتقدم من كان الأسرع في أكثر أيام الأسبوع.
      </p>
      {WEEKLY_RACE_EXAMPLE.weekly.map((row, idx) => {
        const highlight = row.podium === 'gold';
        return (
          <div
            key={row.name}
            className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold border ${
              highlight
                ? 'bg-[#630517] text-white border-[#F5D061]'
                : 'bg-[#630517]/5 border-[#630517]/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                row.podium === 'gold' ? 'bg-[#F5D061] text-[#630517]' :
                row.podium === 'silver' ? 'bg-slate-300 text-slate-800' :
                row.podium === 'bronze' ? 'bg-amber-800 text-white' : 'bg-[#F5D061]/40 text-[#630517]'
              }`}>
                {idx + 1}
              </span>
              <div className="min-w-0 space-y-1">
                <span className={`block truncate ${highlight ? 'text-white' : 'text-slate-800'}`}>{row.name}</span>
                <div className="flex flex-wrap items-center gap-1">
                  {row.podium === 'gold' ? (
                    <Pill tone="gold"><ClubIcon name="crown" size={10} /> متصدر الأسبوع</Pill>
                  ) : null}
                  {row.perfectWeek ? (
                    <Pill tone={highlight ? 'soft' : 'gold'}><ClubIcon name="sparkles" size={10} /> أسبوع كامل · 3/3</Pill>
                  ) : null}
                  {row.lastWeekChampion ? (
                    <Pill tone="burgundy"><ClubIcon name="star" size={10} /> متصدر الأسبوع الماضي</Pill>
                  ) : null}
                  {row.longestStreak ? (
                    <Pill tone={highlight ? 'soft' : 'burgundy'}><ClubIcon name="zap" size={10} /> أطول سلسلة · {row.streak} أيام</Pill>
                  ) : (
                    <span className={`text-[9px] font-bold ${highlight ? 'text-amber-100' : 'text-slate-500'}`}>
                      سلسلة {row.streak} {row.streak === 1 ? 'يوم' : 'أيام'}
                    </span>
                  )}
                </div>
                {row.tieNote ? (
                  <p className={`text-[9px] font-bold ${highlight ? 'text-[#F5D061]' : 'text-amber-800'}`}>
                    {row.tieNote}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="text-left shrink-0 space-y-1">
              <span className={`block px-3 py-1 rounded-full text-[11px] font-mono font-bold ${
                highlight ? 'bg-[#F5D061] text-[#630517]' : 'bg-[#630517] text-[#F5D061]'
              }`}>
                {row.weekPoints} نقطة
              </span>
              <p className={`text-[9px] font-bold ${highlight ? 'text-amber-100' : 'text-slate-500'}`}>
                {row.titles} {row.titles === 1 ? 'صدارة' : 'صدارات'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
