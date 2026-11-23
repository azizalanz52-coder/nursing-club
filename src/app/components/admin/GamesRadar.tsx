'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { formatPlayTime, loadAllGamePlays, type GamePlay } from '../../lib/gameActivity';
import {
  MERIT_WEIGHTS,
  MIN_ACCURACY,
  MIN_FINISHED_DAYS,
  QUIZ_MAX,
  RADAR_AXES,
  buildGamesRadar,
  type DayMark,
  type PlayerRadar,
  type RaceRow,
  type RadarAxisId,
} from '../../lib/gamesRadar';

const RACES: { id: 'play' | 'correct' | 'solves' | 'speed'; title: string; note: string }[] = [
  { id: 'play', title: 'الأكثر مشاركة', note: 'جلسة مكتملة' },
  { id: 'correct', title: 'الأكثر إجابات صحيحة', note: 'صح في الإسعاف' },
  { id: 'solves', title: 'الأكثر حلًا', note: 'كلمة + إسعاف ٤/٤' },
  { id: 'speed', title: 'الأسرع', note: 'متوسط الزمن' },
];

export default function GamesRadar() {
  const [raw, setRaw] = useState<GamePlay[] | null>(null);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadAllGamePlays()
      .then((rows) => {
        if (!cancelled) setRaw(rows);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('ما قدرنا نقرأ سجل الألعاب.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bounds = useMemo(() => {
    const days = (raw || []).map((row) => row.day).filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)).sort();
    return { min: days[0] || '', max: days.at(-1) || '' };
  }, [raw]);

  const report = useMemo(
    () => buildGamesRadar(raw || [], from || bounds.min, to || bounds.max),
    [raw, from, to, bounds.min, bounds.max],
  );

  const query = search.trim();
  const visible = report.players.filter((player) => {
    if (!query) return true;
    return player.name.includes(query) || player.phone.includes(query);
  });
  const focus = visible.find((player) => player.phone === selected) || visible[0] || null;

  if (raw == null && !error) return <p className="text-sm font-bold text-slate-500">نجمع سجل اللعبتين...</p>;
  if (error) return <p className="text-sm font-bold text-rose-700">{error}</p>;

  return (
    <div className="space-y-6" dir="rtl">
      <section className="rounded-3xl bg-[#1a0208] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-[10px] font-black tracking-[0.18em] text-[#F5D061]">رادار داخلي • تحدي الكلمة • دقيقة الإسعاف</p>
            <h3 className="text-2xl font-black">رادار اللاعبين</h3>
            <p className="text-xs leading-relaxed text-[#fff6d6]">
              الأرقام من اللي انحفظ في السجل. اللي خلّص على جواله وما وصل اسمه ما يظهر هنا.
              التكريم يتقرر من الحد الظاهر، مو من انطباع.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="أشخاص" value={String(report.summary.people)} />
            <Stat label="أيام فيها لعب" value={String(report.summary.clubDayCount)} />
            <Stat label="وصول للكلمة" value={String(report.summary.totalWins)} />
            <Stat label="إجابات صحيحة" value={String(report.summary.totalCorrect)} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-bold text-[#F5D061]">
            من
            <input type="date" value={from || bounds.min} min={bounds.min} max={bounds.max} onChange={(event) => setFrom(event.target.value)} className="mt-1 block rounded-xl border border-white/20 bg-white px-3 py-2 text-sm font-bold text-slate-900" />
          </label>
          <label className="text-[11px] font-bold text-[#F5D061]">
            إلى
            <input type="date" value={to || bounds.max} min={bounds.min} max={bounds.max} onChange={(event) => setTo(event.target.value)} className="mt-1 block rounded-xl border border-white/20 bg-white px-3 py-2 text-sm font-bold text-slate-900" />
          </label>
          <button type="button" onClick={() => { setFrom(''); setTo(''); }} className="rounded-xl bg-[#F5D061] px-4 py-2 text-xs font-black text-[#630517]">
            كل السجل
          </button>
          <label className="min-w-[12rem] flex-1 text-[11px] font-bold text-[#F5D061]">
            بحث
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم أو جوال" className="mt-1 block w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-sm font-bold text-slate-900" />
          </label>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Mini label="طلاب في السجل" value={report.summary.students} />
        <Mini label="لعب اللعبتين" value={report.summary.bothPeople} />
        <Mini label="كلمة فقط / إسعاف فقط" value={`${report.summary.wordOnly} / ${report.summary.quizOnly}`} />
        <Mini label="إسعاف كامل ٤/٤" value={report.summary.totalPerfect} />
      </section>

      {report.summary.students === 0 && report.summary.people > 0 ? (
        <p className="rounded-2xl bg-[#fff6d6] px-4 py-3 text-xs font-bold text-[#630517]">ما فيه طلاب في هالفترة. الأسماء الظاهرة حساب إدارة ومو داخلة التكريم.</p>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {RACES.map((race) => (
          <RaceCard
            key={race.id}
            title={race.title}
            note={race.note}
            rows={report.races[race.id]}
            speed={race.id === 'speed'}
            onPick={setSelected}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="font-black text-slate-900">حد النظر في التكريم</h4>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
            <li>{MIN_FINISHED_DAYS} أيام مكتملة على الأقل.</li>
            <li>لعب تحدي الكلمة ودقيقة الإسعاف، مو لعبة واحدة.</li>
            <li>الدقة {Math.round(MIN_ACCURACY * 100)}٪ أو أعلى. الدقة = متوسط نسبة صح الإسعاف ونسبة الوصول للكلمة.</li>
            <li>حساب الإدارة خارج السباق حتى لو لعب.</li>
          </ul>
          <div className="mt-4 space-y-1 text-[11px] text-slate-500">
            {RADAR_AXES.map((axis) => (
              <p key={axis.id}><span className="font-black text-slate-800">{axis.label} {MERIT_WEIGHTS[axis.id]}٪.</span> {axis.hint}</p>
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
            الاستحقاق ترتيب بين اللي في الفترة، مو درجة شهادة. الاسم يعدّي الحد أول، وبعدين تشوف مركزه.
            إجابات الكلمة حرفًا حرفًا ما تنحفظ، فالصح المحسوب هو صح دقيقة الإسعاف.
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="font-black text-slate-900">يعدّون الحد ({report.passed.length})</h4>
          {report.passed.length === 0 ? (
            <p className="mt-3 text-xs font-bold text-slate-500">ما فيه أحد عدّى الحد في هالفترة. الأقرب وأسباب وقوفهم تحت.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {report.passed.map((player) => (
                <li key={player.phone}>
                  <PersonButton player={player} onPick={setSelected} extra={player.flags.slice(0, 2).join(' · ')} />
                </li>
              ))}
            </ul>
          )}
          <h4 className="mt-5 font-black text-slate-900">ما عدّوا الحد ({report.held.length})</h4>
          <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {report.held.map((player) => (
              <li key={player.phone}>
                <PersonButton player={player} onPick={setSelected} extra={player.holdReasons.join(' · ')} muted />
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="mb-1 font-black text-slate-900">مصفوفة الأيام</h4>
        <p className="mb-3 text-[11px] text-slate-500">و وصول للكلمة، × خلصت محاولاته، الرقم درجة الإسعاف من {QUIZ_MAX}، … بدأ وما خلّص، — ما لعب.</p>
        {report.clubDays.length === 0 ? <p className="text-xs font-bold text-slate-400">ما فيه لعب في هالفترة.</p> : (
          <table className="w-full min-w-max border-separate border-spacing-1 text-center text-[11px]">
            <thead>
              <tr>
                <th className="sticky right-0 bg-white px-2 text-right font-black text-slate-500">الاسم</th>
                {report.clubDays.map((day) => (
                  <th key={day} title={day} className="whitespace-nowrap px-1 font-bold text-slate-400">{`${day.slice(8)}/${day.slice(5, 7)}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((player) => (
                <tr key={player.phone}>
                  <td className="sticky right-0 bg-white px-2 text-right">
                    <button type="button" onClick={() => setSelected(player.phone)} className="font-black text-slate-900">{player.name}</button>
                  </td>
                  {report.clubDays.map((day) => {
                    const mark = player.days.find((item) => item.day === day);
                    const cell = dayCell(mark);
                    return <td key={day} title={cell.title} className={`h-8 w-8 rounded-lg font-black ${cell.className}`}>{cell.text}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="px-4 py-3">الاسم</th>
              <th className="px-2 py-3">مشاركة</th>
              <th className="px-2 py-3">صح</th>
              <th className="px-2 py-3">حلول</th>
              <th className="px-2 py-3">دقة</th>
              <th className="px-2 py-3">متوسط الزمن</th>
              <th className="px-2 py-3">اللعبتين</th>
              <th className="px-2 py-3">استحقاق</th>
              <th className="px-4 py-3">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((player) => (
              <tr key={player.phone} onClick={() => setSelected(player.phone)} className={`cursor-pointer border-b border-slate-100 ${focus?.phone === player.phone ? 'bg-[#fff6d6]' : 'hover:bg-slate-50'}`}>
                <td className="px-4 py-3">
                  <p className="font-black text-slate-900">{player.name}</p>
                  <p className="font-bold text-slate-400" dir="ltr">{player.phone}</p>
                </td>
                <td className="px-2 py-3 font-black">{player.playCount}<span className="block text-[10px] font-bold text-slate-400">{player.finishedDays} يوم</span></td>
                <td className="px-2 py-3 font-black">{player.quizCorrect}<span className="block text-[10px] font-bold text-slate-400">من {player.quizPossible}</span></td>
                <td className="px-2 py-3 font-black">{player.solves}<span className="block text-[10px] font-bold text-slate-400">{player.wordWins} كلمة · {player.quizPerfect} كامل</span></td>
                <td className="px-2 py-3 font-black">{player.accuracy == null ? '—' : `${Math.round(player.accuracy * 100)}٪`}</td>
                <td className="px-2 py-3 font-black">{formatPlayTime(player.avgSpeedMs || undefined)}<span className="block text-[10px] font-bold text-slate-400">أفضل {formatPlayTime(player.bestSpeedMs || undefined)}</span></td>
                <td className="px-2 py-3 font-black">{player.bothDays}</td>
                <td className="px-2 py-3 font-black text-[#630517]">{player.merit}</td>
                <td className="px-4 py-3 font-bold">{player.qualifies ? <span className="text-emerald-700">يعدّي الحد</span> : <span className="text-slate-500">{player.holdReasons[0]}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? <p className="p-5 text-xs font-bold text-slate-400">ما فيه اسم يطابق البحث.</p> : null}
      </section>

      {focus ? <PlayerCard player={focus} median={report.median} showMedian={report.cohort.length > 1} clubDays={report.clubDays.length} /> : null}
    </div>
  );
}

function PlayerCard({
  player,
  median,
  showMedian,
  clubDays,
}: {
  player: PlayerRadar;
  median: Record<RadarAxisId, number>;
  showMedian: boolean;
  clubDays: number;
}) {
  const avgTries = player.wordWins ? (player.wordWinAttempts / player.wordWins).toFixed(1) : '—';
  return (
    <section className="grid gap-4 rounded-3xl border border-[#F5D061] bg-white p-5 shadow-sm lg:grid-cols-[280px_1fr]">
      <div>
        <RadarShape player={player} median={median} showMedian={showMedian} />
        <p className="mt-2 text-center text-[10px] font-bold text-slate-400">
          {showMedian ? 'الخط المتقطع وسيط الباقين' : 'شكل الشخص على محاور الفترة'}
        </p>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-xl font-black text-slate-900">{player.name}</h4>
            <p className="text-xs font-bold text-slate-400" dir="ltr">{player.phone}</p>
          </div>
          <div className="text-left">
            <p className="text-3xl font-black text-[#630517]">{player.merit}</p>
            <p className="text-[11px] font-black text-slate-500">{placeText(player.ranks.merit, 'الاستحقاق')}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {RADAR_AXES.map((axis) => (
            <div key={axis.id} className="rounded-2xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold text-slate-400">{axis.label}</p>
              <p className="text-lg font-black text-slate-900">{player.axes[axis.id] == null ? '—' : player.axes[axis.id]}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#1a0208] p-4 text-[#fff6d6]">
            <p className="text-xs font-black text-[#F5D061]">تحدي الكلمة</p>
            <p className="mt-2 text-sm font-black text-white">{player.wordWins} وصول · {player.wordLosses} ما وصل · {player.wordOpen} ناقص</p>
            <p className="mt-1 text-[11px]">متوسط محاولات الوصول {avgTries}</p>
            <p className="text-[11px]">أسرع فوز {formatPlayTime(player.bestWordMs || undefined)} · المتوسط {formatPlayTime(player.avgWordMs || undefined)}</p>
            <p className="mt-1 text-[11px] text-[#F5D061]">{placeText(player.ranks.solves, 'الحلول')}</p>
          </div>
          <div className="rounded-2xl bg-[#fff6d6] p-4 text-[#1a0208]">
            <p className="text-xs font-black text-[#630517]">دقيقة الإسعاف</p>
            <p className="mt-2 text-sm font-black">{player.quizCorrect} صح من {player.quizPossible} · {player.quizPerfect} مرة كاملة</p>
            <p className="mt-1 text-[11px]">أكمل الاختبار {player.quizFinished} يوم</p>
            <p className="text-[11px]">أسرع {formatPlayTime(player.bestQuizMs || undefined)} · المتوسط {formatPlayTime(player.avgQuizMs || undefined)}</p>
            <p className="mt-1 text-[11px] font-bold text-[#630517]">{placeText(player.ranks.correct, 'الإجابات')} · {placeText(player.ranks.speed, 'السرعة')}</p>
          </div>
        </div>
        <p className="text-[11px] font-bold text-slate-500">
          {player.finishedDays} يوم مكتمل من {clubDays} · أطول تتابع {player.streak} · غاب {player.absentDays} يوم · {placeText(player.ranks.play, 'المشاركة')}
        </p>
        <div className="flex flex-wrap gap-2">
          {(player.qualifies ? player.flags : [...player.holdReasons, ...player.flags]).map((note) => (
            <span key={note} className={`rounded-full px-3 py-1 text-[11px] font-black ${player.qualifies ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{note}</span>
          ))}
          {player.qualifies ? <span className="rounded-full bg-emerald-700 px-3 py-1 text-[11px] font-black text-white">يعدّي حد النظر</span> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          {player.days.map((day) => {
            const cell = dayCell(day);
            return <span key={day.day} title={cell.title} className={`rounded-lg px-2 py-1 text-[10px] font-black ${cell.className}`}>{day.day.slice(5)} {cell.text}</span>;
          })}
        </div>
      </div>
    </section>
  );
}

function RaceCard({
  title,
  note,
  rows,
  speed,
  onPick,
}: {
  title: string;
  note: string;
  rows: RaceRow[];
  speed: boolean;
  onPick: (phone: string) => void;
}) {
  const top = rows[0]?.value || 0;
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="font-black text-slate-900">{title}</h4>
      <p className="text-[10px] font-bold text-slate-400">{note}</p>
      {rows.length === 0 ? <p className="mt-3 text-[11px] font-bold text-slate-400">ما فيه نتيجة.</p> : null}
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {rows.map((row) => {
          const width = speed
            ? (row.value > 0 && top > 0 ? Math.max(8, Math.round((100 * top) / row.value)) : 0)
            : (top > 0 ? Math.round((100 * row.value) / top) : 0);
          return (
            <li key={row.player.phone}>
              <button type="button" onClick={() => onPick(row.player.phone)} className="w-full text-right">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-900">{row.place}. {row.player.name}</span>
                  <span className="font-black text-[#630517]">{speed ? formatPlayTime(row.value) : row.value}</span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span className="block h-full rounded-full bg-[#630517]" style={{ width: `${Math.min(100, width)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function PersonButton({ player, extra, muted, onPick }: { player: PlayerRadar; extra: string; muted?: boolean; onPick: (phone: string) => void }) {
  return (
    <button type="button" onClick={() => onPick(player.phone)} className={`w-full rounded-2xl px-3 py-2 text-right ${muted ? 'bg-slate-50' : 'bg-emerald-50'}`}>
      <span className="flex items-center justify-between gap-2">
        <span className="font-black text-slate-900">{player.name}</span>
        <span className="font-black text-[#630517]">{player.merit}</span>
      </span>
      {extra ? <span className="mt-1 block text-[11px] font-bold text-slate-500">{extra}</span> : null}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-center">
      <p className="text-2xl font-black text-[#F5D061]">{value}</p>
      <p className="text-[10px] font-bold text-[#fff6d6]">{label}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-2xl font-black text-[#630517]">{value}</p>
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
    </div>
  );
}

function placeText(rank: { place: number; of: number } | null, label: string) {
  if (!rank) return `${label}: خارج السباق`;
  return `${label}: المركز ${rank.place} من ${rank.of}`;
}

function dayCell(mark?: DayMark) {
  if (!mark) return { text: '—', title: 'ما لعب', className: 'bg-slate-50 text-slate-300' };
  const word = mark.word;
  const quiz = mark.quiz;
  const wordBit = !word ? '' : word.status === 'won' ? 'و' : word.status === 'lost' ? '×' : '…';
  const quizBit = !quiz ? '' : quiz.status === 'finished' ? String(quiz.score ?? 0) : '…';
  const title = [
    word ? (word.status === 'won' ? `وصل للكلمة من المحاولة ${word.attempts}` : word.status === 'lost' ? 'خلصت محاولات الكلمة' : 'بدأ الكلمة وما خلّص') : '',
    quiz?.status === 'finished' ? `الإسعاف ${quiz.score}/${QUIZ_MAX}` : quiz ? 'بدأ الإسعاف وما خلّص' : '',
  ].filter(Boolean).join(' · ') || 'سجل ناقص';
  const both = (word?.status === 'won' || word?.status === 'lost') && quiz?.status === 'finished';
  const className = both
    ? 'bg-[#F5D061] text-[#630517]'
    : word?.status === 'won'
      ? 'bg-[#630517] text-[#F5D061]'
      : quiz?.status === 'finished'
        ? 'bg-[#fff6d6] text-[#630517]'
        : 'bg-slate-100 text-slate-500';
  return { text: `${wordBit}${quizBit}` || '—', title, className };
}

function RadarShape({
  player,
  median,
  showMedian,
}: {
  player: PlayerRadar;
  median: Record<RadarAxisId, number>;
  showMedian: boolean;
}) {
  const cx = 140;
  const cy = 140;
  const maxR = 92;
  const scores = RADAR_AXES.map((axis) => player.axes[axis.id] ?? 0);
  const mid = RADAR_AXES.map((axis) => median[axis.id] || 0);
  return (
    <svg viewBox="0 0 280 280" className="mx-auto w-full max-w-[280px]">
      {[25, 50, 75, 100].map((level) => (
        <polygon key={level} points={ring(level, cx, cy, maxR)} fill="none" stroke="#f3e8c8" strokeWidth="1" />
      ))}
      {RADAR_AXES.map((axis, index) => {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / RADAR_AXES.length;
        const x = cx + maxR * Math.cos(angle);
        const y = cy + maxR * Math.sin(angle);
        const lx = cx + (maxR + 22) * Math.cos(angle);
        const ly = cy + (maxR + 22) * Math.sin(angle);
        return (
          <g key={axis.id}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#f3e8c8" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#630517">{axis.label}</text>
          </g>
        );
      })}
      {showMedian ? <polygon points={shape(mid, cx, cy, maxR)} fill="none" stroke="#b45309" strokeDasharray="4 3" strokeWidth="1.5" /> : null}
      <polygon points={shape(scores, cx, cy, maxR)} fill="rgba(99,5,23,0.28)" stroke="#630517" strokeWidth="2.5" />
    </svg>
  );
}

function ring(level: number, cx: number, cy: number, maxR: number) {
  return shape(Array(RADAR_AXES.length).fill(level), cx, cy, maxR);
}

function shape(scores: number[], cx: number, cy: number, maxR: number) {
  return scores.map((score, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / scores.length;
    const r = (Math.max(0, Math.min(100, score)) / 100) * maxR;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}
