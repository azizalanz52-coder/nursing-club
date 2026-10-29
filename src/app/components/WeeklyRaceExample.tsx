'use client';

import type { ReactNode, RefObject } from 'react';
import { ClubIcon } from './icons';
import { CASE_STUDY_DISTINGUISHED_COUNT } from '../lib/caseStudy';
import { WEEKLY_COPY, type OverallBoardRow, type WeeklyBoardRow } from '../lib/caseStudyWeekly';

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

function rankClass(rank: number, highlight: boolean) {
  if (highlight) return 'bg-[#F5D061] text-[#630517]';
  if (rank === 1) return 'bg-amber-400 text-slate-900';
  if (rank === 2) return 'bg-slate-300 text-slate-800';
  if (rank === 3) return 'bg-amber-700 text-white';
  return 'bg-[#F5D061]/40 text-[#630517]';
}

export function OverallRaceBoard({
  rows,
  myPhone,
  myName,
  myRef,
}: {
  rows: OverallBoardRow[];
  myPhone: string;
  myName: string;
  myRef: RefObject<HTMLDivElement | null>;
}) {
  if (!rows.length) {
    return <p className="text-center text-xs text-slate-400 py-8 font-medium">لا توجد سجلات صدارة حتى الآن، كن أول المشاركين!</p>;
  }

  return (
    <>
      {rows.map((item, idx) => {
        const isMe = Boolean(
          (myPhone && item.phone === myPhone) ||
          (!myPhone && myName && item.studentName === myName)
        );
        return (
          <div
            key={item.phone || `${item.studentName}-${idx}`}
            ref={isMe ? myRef : undefined}
            className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold ${
              isMe
                ? 'bg-[#630517] text-white border-2 border-[#F5D061] shadow-md'
                : 'bg-[#630517]/5 border border-[#630517]/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${rankClass(idx + 1, isMe)}`}>
                {idx + 1}
              </span>
              <div className="min-w-0 space-y-1">
                <span className={`block truncate ${isMe ? 'text-white' : 'text-slate-800'}`}>{item.studentName}</span>
                <div className="flex flex-wrap items-center gap-1">
                  {idx < CASE_STUDY_DISTINGUISHED_COUNT ? (
                    <Pill tone="gold"><ClubIcon name="medal" size={10} /> عضو مميز</Pill>
                  ) : null}
                  {item.lastWeekChampion ? (
                    <Pill tone="burgundy"><ClubIcon name="crown" size={10} /> متصدر الأسبوع الماضي</Pill>
                  ) : null}
                  {item.longestStreak ? (
                    <Pill tone={isMe ? 'soft' : 'burgundy'}><ClubIcon name="zap" size={10} /> أطول سلسلة · {item.streak} أيام</Pill>
                  ) : null}
                  {item.specialCert ? (
                    <Pill tone="gold"><ClubIcon name="scroll" size={10} /> شهادة خاصة · 3 صدارات</Pill>
                  ) : item.titles >= 2 ? (
                    <span className={`text-[9px] font-bold ${isMe ? 'text-amber-100' : 'text-slate-500'}`}>باقي صدارة واحدة على الشهادة</span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="text-left shrink-0 space-y-1">
              <span className={`block px-3 py-1 rounded-full text-[11px] font-mono font-bold ${
                isMe ? 'bg-[#F5D061] text-[#630517]' : 'bg-[#630517] text-[#F5D061]'
              }`}>
                {item.totalScore} نقطة
              </span>
              <p className={`text-[9px] font-bold ${isMe ? 'text-amber-100' : 'text-slate-500'}`}>
                {item.titles} {item.titles === 1 ? 'صدارة أسبوعية' : 'صدارات أسبوعية'}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function WeeklyRaceBoard({
  rows,
  weekLabel,
  locked,
  live,
  myPhone,
  myName,
}: {
  rows: WeeklyBoardRow[];
  weekLabel: string;
  locked: boolean;
  live: boolean;
  myPhone: string;
  myName: string;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold text-slate-500 leading-6">
        {weekLabel}{locked ? ' · الأسبوع مقفل' : ''}
      </p>
      <p className="text-[10px] font-bold text-[#630517] leading-6 bg-[#630517]/5 rounded-xl px-3 py-2">
        {live ? WEEKLY_COPY.boardLive : WEEKLY_COPY.boardBefore} {WEEKLY_COPY.lockNote}
      </p>
      {rows.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-8 font-medium">
          {live ? WEEKLY_COPY.emptyLive : WEEKLY_COPY.emptyBefore}
        </p>
      ) : rows.map((row) => {
        const isMe = Boolean(
          (myPhone && row.phone === myPhone) ||
          (!myPhone && myName && row.studentName === myName)
        );
        const highlight = row.isWeeklyLeader || isMe;
        return (
          <div
            key={row.key}
            className={`flex items-center justify-between p-3 rounded-2xl text-xs font-bold ${
              highlight
                ? 'bg-[#630517] text-white border-2 border-[#F5D061] shadow-md'
                : 'bg-[#630517]/5 border border-[#630517]/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${rankClass(row.rank, highlight)}`}>
                {row.rank}
              </span>
              <div className="min-w-0 space-y-1">
                <span className={`block truncate ${highlight ? 'text-white' : 'text-slate-800'}`}>{row.studentName}</span>
                <div className="flex flex-wrap items-center gap-1">
                  {row.isWeeklyLeader ? (
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
