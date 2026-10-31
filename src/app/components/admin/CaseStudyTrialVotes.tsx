'use client';

import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  SATISFIED_LABEL,
  TIMER_CHOICE_LABEL,
  TRIAL_POLL_COPY,
  deleteTrialVote,
  isTrialPollOpen,
  loadTrialVotes,
  summarizeTrialVotes,
  type TrialVote,
} from '../../lib/caseStudyTrialPoll';
import { ClubIcon } from '../icons';

export default function CaseStudyTrialVotes() {
  const [rows, setRows] = useState<TrialVote[]>([]);
  const [loading, setLoading] = useState(true);
  const summary = summarizeTrialVotes(rows);

  const refresh = async () => {
    setLoading(true);
    try {
      setRows(await loadTrialVotes(db));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('حذف هذا الرأي؟')) return;
    await deleteTrialVote(db, id);
    setRows((current) => current.filter((row) => row.id !== id));
  };

  return (
    <div className="rounded-2xl border border-[#630517]/15 bg-[#630517]/[0.03] p-5 space-y-4" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-sm font-black text-[#630517] inline-flex items-center gap-1.5">
            <ClubIcon name="lightbulb" size={15} /> استبيان التجربة: التايمر وصدارة الأسبوع
          </h4>
          <p className="text-[11px] text-slate-500 font-medium leading-6 max-w-xl">
            {TRIAL_POLL_COPY.intro}
          </p>
          <p className="text-[11px] font-bold text-amber-800">
            {isTrialPollOpen() ? 'الاستبيان مفتوح الآن في صفحة دراسة الحالة.' : 'الاستبيان مغلق.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="px-3 py-1.5 rounded-xl bg-white border border-[#630517]/20 text-[11px] font-bold text-[#630517] cursor-pointer"
        >
          تحديث
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] font-black">
        <span className="px-2.5 py-1 rounded-full bg-white border border-[#630517]/20 text-[#630517]">الإجمالي: {summary.total}</span>
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800">45 ثانية: {summary.keep45}</span>
        <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800">دقيقة ونص: {summary.minute90}</span>
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800">راضي: {summary.satisfied}</span>
        <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800">غير راضي: {summary.unsatisfied}</span>
        <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">اقتراحات: {summary.withIdea}</span>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 font-bold py-6 text-center">جاري التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-400 font-bold py-8 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          ما وصل أي صوت بعد. الاستبيان يظهر لكل من يدخل دراسة الحالة.
        </p>
      ) : (
        <div className="space-y-3 max-h-[28rem] overflow-y-auto">
          {rows.map((row) => (
            <article key={row.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-black text-slate-900">{row.name}</p>
                  <p className="text-[10px] font-mono text-slate-400" dir="ltr">{row.phone || 'بدون رقم'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(row.id)}
                  className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 grid place-items-center cursor-pointer"
                  title="حذف"
                >
                  <ClubIcon name="trash" size={13} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#630517]/10 text-[#630517]">
                  {TIMER_CHOICE_LABEL[row.timerChoice]}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                  row.weeklySatisfied === 'yes' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  {SATISFIED_LABEL[row.weeklySatisfied]}
                </span>
              </div>
              {row.idea ? (
                <p className="text-xs text-slate-700 font-medium leading-7 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                  {row.idea}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 font-medium">ما كتب اقتراحاً إضافياً.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
