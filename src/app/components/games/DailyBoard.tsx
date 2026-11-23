'use client';

import React, { useEffect, useState } from 'react';
import { ClubIcon } from '../icons';
import { riyadhDateKey } from '../../lib/dailyWord';
import { formatPlayTime, loadGamePlays, rankPlays, type GameId, type GamePlay } from '../../lib/gameActivity';

function displayName(row: GamePlay) {
  const name = String(row.name || '').trim();
  if (!name || name === row.phone) return 'لاعب';
  return name;
}

export default function DailyBoard({
  game,
  phone,
  refresh,
}: {
  game: GameId;
  phone: string;
  refresh: number;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GamePlay[]>([]);
  const rule = game === 'word'
    ? 'كل اللي شاركوا. اللي حلها بأقل محاولة يتقدم، ثم الأسرع، والوقت الطويل يبقى في اللوحة.'
    : 'كل اللي شاركوا. الأعلى درجة يتقدم، ثم الأسرع، والوقت الطويل يبقى في اللوحة.';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadGamePlays(riyadhDateKey())
      .then((list) => {
        if (!cancelled) setRows(rankPlays(list, game));
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [game, refresh, open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/20 bg-[#F5D061] px-4 py-3 text-xs font-black text-[#630517] shadow-lg"
      >
        <ClubIcon name="trophy" size={16} />
        الصدارة اليومية
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-right text-[#1a0208] shadow-2xl" dir="rtl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-black text-[#630517]">
                  <ClubIcon name="trophy" size={18} /> الصدارة اليومية
                </h3>
                <p className="mt-1 text-[11px] font-bold text-slate-500">{rule}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[62vh] space-y-2 overflow-y-auto">
              {rows.length === 0 ? <p className="text-sm font-bold text-slate-500">لسا ما فيه أحد في لوحة اليوم.</p> : (
                <p className="text-[11px] font-bold text-slate-400">{rows.length} مشاركين اليوم</p>
              )}
              {rows.map((row, index) => {
                const mine = row.phone === phone;
                const time = formatPlayTime(row.durationMs);
                const detail = game === 'word'
                  ? row.status === 'won'
                    ? `حلها من المحاولة ${row.attempts} · الوقت ${time}`
                    : row.status === 'lost'
                      ? `ما وصل بعد ${row.attempts} محاولات · الوقت ${time}`
                      : 'بدأ وما خلّص'
                  : row.status === 'finished'
                    ? `${row.score}/4 · الوقت ${time}`
                    : 'بدأ وما خلّص';
                return (
                  <div key={`${row.game}-${row.id}`} className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-sm ${mine ? 'bg-[#F5D061] text-[#3b020b]' : 'bg-slate-50 text-[#1a0208]'}`}>
                    <span className="font-black">{index + 1}. {displayName(row)}</span>
                    <span className="text-left text-xs font-bold leading-5">{detail}</span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-2xl bg-[#630517] py-3 text-xs font-black text-[#F5D061]"
            >
              إغلاق
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
