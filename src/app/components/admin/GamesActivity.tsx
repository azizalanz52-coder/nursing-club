'use client';

import React, { useEffect, useState } from 'react';
import { riyadhDateKey } from '../../lib/dailyWord';
import { formatPlayTime, loadGamePlays, rankPlays, type GameId, type GamePlay } from '../../lib/gameActivity';

const GAME_LABEL = { word: 'تحدي الكلمة', quiz: 'دقيقة إسعاف' };
const STATUS_LABEL = {
  playing: 'بدأ وما خلّص',
  won: 'وصل للكلمة',
  lost: 'خلصت محاولاته',
  finished: 'خلّص الاختبار',
};

export default function GamesActivity() {
  const [day, setDay] = useState(riyadhDateKey());
  const [rows, setRows] = useState<GamePlay[]>([]);
  const [game, setGame] = useState<GameId>('word');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadGamePlays(day)
      .then((list) => {
        if (cancelled) return;
        setRows(list);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  const wordRows = rows.filter((row) => row.game === 'word');
  const quizRows = rows.filter((row) => row.game === 'quiz');
  const visible = game === 'word'
    ? [...rankPlays(rows, 'word'), ...wordRows.filter((row) => row.status !== 'won')]
    : rankPlays(rows, 'quiz');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-900">تفاعل الألعاب اليومي</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">اضغط اللعبة عشان تشوف أسماءها لحاله.</p>
          </div>
          <label className="text-xs font-bold text-slate-600">
            اليوم
            <input
              type="date"
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setGame('word')}
            className={`rounded-2xl px-4 py-4 text-right ${game === 'word' ? 'bg-[#630517] text-[#F5D061] ring-2 ring-[#F5D061]' : 'bg-rose-50 text-[#630517]'}`}
          >
            <p className="text-3xl font-black">{wordRows.length}</p>
            <p className="text-xs font-bold">تحدي الكلمة</p>
          </button>
          <button
            type="button"
            onClick={() => setGame('quiz')}
            className={`rounded-2xl px-4 py-4 text-right ${game === 'quiz' ? 'bg-[#630517] text-[#F5D061] ring-2 ring-[#F5D061]' : 'bg-[#fff6d6] text-[#630517]'}`}
          >
            <p className="text-3xl font-black">{quizRows.length}</p>
            <p className="text-xs font-bold">دقيقة الإسعاف</p>
          </button>
        </div>
      </div>
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-x-auto">
        <h4 className="text-sm font-black text-slate-900 mb-3">{GAME_LABEL[game]}</h4>
        {loading ? <p className="text-xs font-bold text-slate-400">نجمع الأسماء...</p> : null}
        {!loading && visible.length === 0 ? <p className="text-xs font-bold text-slate-400">ما فيه أحد في {GAME_LABEL[game]} هذا اليوم.</p> : null}
        {visible.length > 0 ? (
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold">
                <th className="pb-3 pr-2">الاسم</th>
                <th className="pb-3">الجوال</th>
                <th className="pb-3">النتيجة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-2 font-black text-slate-900">{row.name || 'بدون اسم'}</td>
                  <td className="py-3 font-bold text-slate-600" dir="ltr">{row.phone}</td>
                  <td className="py-3 font-bold text-slate-700">
                    {STATUS_LABEL[row.status] || row.status}
                    {row.game === 'quiz' ? ` · ${row.score}/4` : row.attempts ? ` · من المحاولة ${row.attempts}` : ''}
                    {row.durationMs ? ` · ${formatPlayTime(row.durationMs)}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>
    </div>
  );
}
