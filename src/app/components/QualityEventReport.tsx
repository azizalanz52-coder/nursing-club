'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clubConfirm, clubNotice } from '../lib/clubNotice';
import {
  QUALITY_EVENT_REPORTS,
  RECOMMENDATIONS,
  activeStudentRate,
  chartItems,
  computedSuccessIndex,
  costPerBeneficiary,
  emptyEventReport,
  emptyExpense,
  emptySponsor,
  emptySurveyItem,
  expenseTotal,
  expensesSum,
  filledExpenses,
  filledSponsors,
  normalizeExpense,
  normalizeSponsor,
  parseEventParticipantsExcel,
  printQualityEventReport,
  splitParticipants,
  targetAchievementRate,
  type ExpenseRow,
  type QualityEventReport,
  type RecommendationId,
  type SponsorRow,
} from '../lib/qualityEventReport';

function num(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function MetricBar({ label, value, gold = false }: { label: string; value: number; gold?: boolean }) {
  const width = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-black">
        <span className="text-slate-700">{label}</span>
        <span className="text-[#630517]">{width}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#f1e7ea] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, background: gold ? '#F5D061' : '#630517' }}
        />
      </div>
    </div>
  );
}

export default function QualityEventReportForm({
  actorName,
  onSaved,
}: {
  actorName: string;
  onSaved?: (title: string) => void;
}) {
  const [reports, setReports] = useState<QualityEventReport[]>([]);
  const [draft, setDraft] = useState(emptyEventReport);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, QUALITY_EVENT_REPORTS), (snap) => {
      const list = snap.docs
        .map((item) => ({ id: item.id, ...item.data() } as QualityEventReport))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setReports(list);
    });
    return () => unsub();
  }, []);

  const achievement = targetAchievementRate(draft);
  const studentRate = activeStudentRate(draft);
  const costEach = costPerBeneficiary(draft);
  const success = computedSuccessIndex(draft);
  const charts = useMemo(() => chartItems({ ...draft, id: '', createdAt: 0, createdBy: '' } as QualityEventReport), [draft]);
  const groups = splitParticipants(draft.participants);

  const patch = (partial: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...partial }));
  const patchExpense = (index: number, partial: Partial<ExpenseRow>) => {
    const expenses = [...draft.expenses];
    expenses[index] = { ...expenses[index], ...partial };
    patch({ expenses });
  };
  const patchSponsor = (index: number, partial: Partial<SponsorRow>) => {
    const sponsors = [...draft.sponsors];
    sponsors[index] = { ...sponsors[index], ...partial };
    patch({ sponsors });
  };

  const loadReport = (report: QualityEventReport) => {
    const { id: _id, createdAt: _createdAt, createdBy: _createdBy, ...rest } = report;
    setDraft({
      ...emptyEventReport(),
      ...rest,
      expenses: rest.expenses?.length ? rest.expenses.map((row) => normalizeExpense(row)) : [emptyExpense()],
      sponsors: rest.sponsors?.length ? rest.sponsors.map((row) => normalizeSponsor(row)) : [emptySponsor()],
      surveyItems: rest.surveyItems?.length ? rest.surveyItems : emptyEventReport().surveyItems,
    });
    setEditingId(report.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setDraft(emptyEventReport());
    setEditingId(null);
  };

  const handleExcel = async (file: File | null) => {
    if (!file) return;
    try {
      const people = parseEventParticipantsExcel(await file.arrayBuffer());
      if (!people.length) {
        await clubNotice('ما لقينا أسماء في الملف. عمود الاسم وعمود منظم أو زائر.', 'info');
        return;
      }
      patch({ participants: people });
      await clubNotice(`أُضيف ${people.length} اسم.`, 'info', `المنظمون والزوار`);
    } catch (err) {
      console.error(err);
      await clubNotice('تعذر قراءة ملف المشاركين.', 'error');
    }
  };

  const handleSave = async () => {
    if (!draft.eventTitle.trim()) {
      await clubNotice('اكتب عنوان الفعالية أولاً.', 'info');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...draft,
        expenses: filledExpenses(draft.expenses || []),
        sponsors: filledSponsors(draft.sponsors || []),
        createdBy: 'لجنة الجودة والتطوير',
        createdAt: editingId ? reports.find((item) => item.id === editingId)?.createdAt || Date.now() : Date.now(),
      };
      if (editingId) {
        await updateDoc(doc(db, QUALITY_EVENT_REPORTS, editingId), payload);
        await clubNotice('تم تحديث التقرير الشامل.', 'success');
      } else {
        await addDoc(collection(db, QUALITY_EVENT_REPORTS), payload);
        await clubNotice('تم حفظ التقرير الشامل للفعالية.', 'success');
        onSaved?.(draft.eventTitle.trim());
      }
      resetForm();
    } catch (err) {
      console.error(err);
      await clubNotice('تعذر حفظ التقرير.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await clubConfirm('حذف التقرير الشامل لهذه الفعالية؟'))) return;
    await deleteDoc(doc(db, QUALITY_EVENT_REPORTS, id));
    if (editingId === id) resetForm();
    await clubNotice('تم الحذف.', 'success');
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white';
  const labelClass = 'text-xs font-bold text-slate-700';

  return (
    <div className="bg-white rounded-3xl p-8 border-2 border-[#630517] shadow-md space-y-6">
      <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-black text-[#630517]">التقرير الشامل للفعالية</h3>
          <p className="text-xs text-slate-500 mt-1">
            النصوص تُكتب يدوياً، والنسب والرسوم تُحسب تلقائياً.
          </p>
        </div>
        <span className="px-3 py-1 bg-[#630517] text-[#F5D061] rounded-xl font-bold text-xs">
          {reports.length} تقرير
        </span>
      </div>

      <section className="space-y-3">
        <h4 className="font-black text-sm text-slate-900">بيانات الفعالية</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <label className={labelClass}>عنوان الفعالية</label>
            <input className={inputClass} value={draft.eventTitle} onChange={(e) => patch({ eventTitle: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>الجهة</label>
            <input className={inputClass} value={draft.organizer} onChange={(e) => patch({ organizer: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>تاريخ التنفيذ</label>
            <input type="date" className={inputClass} value={draft.eventDate} onChange={(e) => patch({ eventDate: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>موقع التنفيذ</label>
            <input className={inputClass} value={draft.location} onChange={(e) => patch({ location: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>الفئة المستهدفة</label>
            <input className={inputClass} value={draft.targetAudience} onChange={(e) => patch({ targetAudience: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="font-black text-sm text-slate-900">الأرقام والمؤشرات</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className={labelClass}>عدد المستفيدين المستهدف</label>
            <input type="number" className={inputClass} value={draft.targetBeneficiaries || ''} onChange={(e) => patch({ targetBeneficiaries: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>عدد المستفيدين الفعلي</label>
            <input type="number" className={inputClass} value={draft.actualBeneficiaries || ''} onChange={(e) => patch({ actualBeneficiaries: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>طلبة الإعداد المستهدف</label>
            <input type="number" className={inputClass} value={draft.targetStudentOrganizers || ''} onChange={(e) => patch({ targetStudentOrganizers: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>طلبة الإعداد الفعلي</label>
            <input type="number" className={inputClass} value={draft.actualStudentOrganizers || ''} onChange={(e) => patch({ actualStudentOrganizers: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>عدد المستجيبين للاستبيان</label>
            <input type="number" className={inputClass} value={draft.surveyRespondents || ''} onChange={(e) => patch({ surveyRespondents: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>نسبة الرضا %</label>
            <input type="number" className={inputClass} value={draft.satisfactionRate || ''} onChange={(e) => patch({ satisfactionRate: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>نسبة الاستفادة %</label>
            <input type="number" className={inputClass} value={draft.benefitRate || ''} onChange={(e) => patch({ benefitRate: num(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>التكلفة الفعلية (ر.س)</label>
            <input type="number" className={inputClass} value={draft.actualCost || ''} onChange={(e) => patch({ actualCost: num(e.target.value) })} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['نسبة تحقيق المستهدف', `${achievement}%`],
            ['نسبة مشاركة الطلاب الفاعلة', `${studentRate}%`],
            ['التكلفة لكل مستفيد', `${costEach} ر.س`],
            ['مؤشر نجاح النشاط', `${success}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-[#630517] text-[#F5D061] px-4 py-3 text-center">
              <p className="text-[10px] font-bold opacity-80">{label}</p>
              <p className="text-xl font-black mt-1">{value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="font-black text-sm text-slate-900">التوصية</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {RECOMMENDATIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => patch({ recommendation: item.id as RecommendationId })}
              className={`rounded-2xl border px-3 py-3 text-right cursor-pointer ${
                draft.recommendation === item.id
                  ? 'bg-[#630517] text-[#F5D061] border-[#630517]'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <p className="font-black text-xs">{item.label}</p>
              <p className="text-[10px] mt-1 opacity-80">{item.hint}</p>
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <label className={labelClass}>سبب التوصية (سطر واحد)</label>
          <input className={inputClass} value={draft.recommendationReason} onChange={(e) => patch({ recommendationReason: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={labelClass}>رابط صور النشاط</label>
            <input className={inputClass} dir="ltr" value={draft.photosLink} onChange={(e) => patch({ photosLink: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>استكمال المتطلبات المالية</label>
            <select
              className={inputClass}
              value={draft.financeStatus}
              onChange={(e) => patch({ financeStatus: e.target.value as 'complete' | 'na' })}
            >
              <option value="complete">مكتمل</option>
              <option value="na">لا ينطبق</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className={labelClass}>أبرز التحديات أو الملاحظات إن وجدت</label>
          <textarea rows={2} className={inputClass} value={draft.challenges} onChange={(e) => patch({ challenges: e.target.value })} />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="font-black text-sm text-slate-900">الميزانية والدعم</h4>
        <p className="text-[11px] text-slate-500">جدول المصروفات التفصيلي</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] text-[11px]">
            <thead className="bg-[#630517] text-[#F5D061]">
              <tr>
                {['الرقم', 'الصرف', 'التفاصيل', 'الكمية', 'سعر الوحدة ر.س', 'الإجمالي ر.س', 'الجهة'].map((label) => (
                  <th key={label} className="px-2 py-2 font-black text-right whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(draft.expenses || []).map((row, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-black text-slate-500">{index + 1}</td>
                  <td className="px-1 py-1"><input className={inputClass} value={row.spend} onChange={(e) => patchExpense(index, { spend: e.target.value })} /></td>
                  <td className="px-1 py-1"><input className={inputClass} value={row.details} onChange={(e) => patchExpense(index, { details: e.target.value })} /></td>
                  <td className="px-1 py-1 w-20"><input type="number" className={inputClass} value={row.qty || ''} onChange={(e) => patchExpense(index, { qty: num(e.target.value) })} /></td>
                  <td className="px-1 py-1 w-24"><input type="number" className={inputClass} value={row.unitPrice || ''} onChange={(e) => patchExpense(index, { unitPrice: num(e.target.value) })} /></td>
                  <td className="px-2 py-1.5 font-black text-[#630517] whitespace-nowrap">{expenseTotal(row)}</td>
                  <td className="px-1 py-1"><input className={inputClass} value={row.party} onChange={(e) => patchExpense(index, { party: e.target.value })} /></td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-50">
                <td colSpan={5} className="px-2 py-2 font-black text-slate-700">المجموع</td>
                <td className="px-2 py-2 font-black text-[#630517]">{expensesSum(draft.expenses || [])}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <button type="button" className="text-[11px] font-black text-[#630517] cursor-pointer" onClick={() => patch({ expenses: [...draft.expenses, emptyExpense()] })}>
          + إضافة بند مصروف
        </button>

        <p className="text-[11px] text-slate-500 pt-2">جدول الجهات الداعمة</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[560px] text-[11px]">
            <thead className="bg-[#630517] text-[#F5D061]">
              <tr>
                {['الرقم', 'الجهة', 'نوع الدعم', 'التفاصيل', 'الكمية'].map((label) => (
                  <th key={label} className="px-2 py-2 font-black text-right whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(draft.sponsors || []).map((row, index) => (
                <tr key={index} className="border-t border-slate-100">
                  <td className="px-2 py-1.5 font-black text-slate-500">{index + 1}</td>
                  <td className="px-1 py-1"><input className={inputClass} value={row.name} onChange={(e) => patchSponsor(index, { name: e.target.value })} /></td>
                  <td className="px-1 py-1"><input className={inputClass} value={row.type} onChange={(e) => patchSponsor(index, { type: e.target.value })} /></td>
                  <td className="px-1 py-1"><input className={inputClass} value={row.details} onChange={(e) => patchSponsor(index, { details: e.target.value })} /></td>
                  <td className="px-1 py-1 w-24"><input type="number" className={inputClass} value={row.qty || ''} onChange={(e) => patchSponsor(index, { qty: num(e.target.value) })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="text-[11px] font-black text-[#630517] cursor-pointer" onClick={() => patch({ sponsors: [...draft.sponsors, emptySponsor()] })}>
          + إضافة جهة داعمة
        </button>
        <div className="space-y-1 pt-2">
          <label className={labelClass}>رابط صور الفواتير الأصل</label>
          <input className={inputClass} dir="ltr" value={draft.invoicesLink} onChange={(e) => patch({ invoicesLink: e.target.value })} />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="font-black text-sm text-slate-900">تقييم ومراجعة الفعالية</h4>
        <div className="space-y-1">
          <label className={labelClass}>ملخص الفعالية</label>
          <textarea rows={3} className={inputClass} value={draft.summary} onChange={(e) => patch({ summary: e.target.value })} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-black text-slate-800">نتائج الاستبيان</p>
          {charts.map((item, index) => (
            <MetricBar key={`${item.question}-${index}`} label={item.question} value={item.percent} gold={index % 2 === 1} />
          ))}
          {(draft.surveyItems || []).map((item, index) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <input className={`${inputClass} sm:col-span-4`} placeholder="سؤال الاستبيان" value={item.question} onChange={(e) => {
                const surveyItems = [...draft.surveyItems];
                surveyItems[index] = { ...item, question: e.target.value };
                patch({ surveyItems });
              }} />
              <input type="number" className={inputClass} placeholder="%" value={item.percent || ''} onChange={(e) => {
                const surveyItems = [...draft.surveyItems];
                surveyItems[index] = { ...item, percent: num(e.target.value) };
                patch({ surveyItems });
              }} />
            </div>
          ))}
          <button type="button" className="text-[11px] font-black text-[#630517] cursor-pointer" onClick={() => patch({ surveyItems: [...draft.surveyItems, emptySurveyItem()] })}>
            + إضافة سؤال استبيان
          </button>
        </div>

        <div className="space-y-2">
          <label className={labelClass}>المشاركون (إكسل: عمود الاسم + عمود منظم أو زائر)</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handleExcel(e.target.files?.[0] || null)}
            className={`${inputClass} file:ml-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#630517] file:text-[#F5D061]`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-black text-[#630517] mb-2">المنظمون ({groups.organizers.length})</p>
              <ul className="text-[11px] space-y-1 max-h-40 overflow-auto">
                {groups.organizers.length ? groups.organizers.map((person, i) => <li key={i}>{person.fullName}</li>) : <li className="text-slate-400">لا يوجد</li>}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-black text-[#630517] mb-2">الزوار ({groups.visitors.length})</p>
              <ul className="text-[11px] space-y-1 max-h-40 overflow-auto">
                {groups.visitors.length ? groups.visitors.map((person, i) => <li key={i}>{person.fullName}</li>) : <li className="text-slate-400">لا يوجد</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>أبرز الجوانب الإيجابية</label>
          <textarea rows={2} className={inputClass} value={draft.positives} onChange={(e) => patch({ positives: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label className={labelClass}>مقترحات التحسين والتطوير</label>
          <textarea rows={2} className={inputClass} value={draft.improvements} onChange={(e) => patch({ improvements: e.target.value })} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="bg-[#630517] text-[#F5D061] px-5 py-2.5 rounded-xl font-black text-xs shadow hover:brightness-110 cursor-pointer disabled:opacity-60"
        >
          {saving ? 'جاري الحفظ...' : editingId ? 'تحديث التقرير' : 'حفظ التقرير الشامل'}
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              printQualityEventReport({
                ...draft,
                id: editingId || 'preview',
                createdAt: Date.now(),
                createdBy: 'لجنة الجودة والتطوير',
              });
            } catch (err) {
              void clubNotice(err instanceof Error ? err.message : 'تعذر فتح المعاينة.', 'error');
            }
          }}
          className="bg-slate-100 text-slate-800 px-5 py-2.5 rounded-xl font-black text-xs cursor-pointer"
        >
          معاينة / طباعة
        </button>
        {editingId ? (
          <button type="button" onClick={resetForm} className="text-xs font-bold text-slate-500 px-3 cursor-pointer">
            تقرير جديد
          </button>
        ) : null}
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-100">
        {reports.length === 0 ? (
          <p className="text-center text-xs text-slate-400 font-bold py-6">لا توجد تقارير شاملة بعد.</p>
        ) : (
          reports.map((report) => {
            const open = openId === report.id;
            return (
              <div key={report.id} className="rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : report.id)}
                  className="w-full text-right px-4 py-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-black text-xs text-slate-900">{report.eventTitle}</span>
                  <span className="text-[11px] font-bold text-[#630517]">{successIndexSafe(report)}% نجاح</span>
                </button>
                {open ? (
                  <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button type="button" onClick={() => loadReport(report)} className="text-[11px] font-black bg-slate-100 px-3 py-2 rounded-xl cursor-pointer">
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          printQualityEventReport(report);
                        } catch (err) {
                          void clubNotice(err instanceof Error ? err.message : 'تعذر فتح التقرير.', 'error');
                        }
                      }}
                      className="text-[11px] font-black bg-[#630517] text-[#F5D061] px-3 py-2 rounded-xl cursor-pointer"
                    >
                      طباعة
                    </button>
                    <button type="button" onClick={() => handleDelete(report.id)} className="text-[11px] font-black text-red-600 bg-red-50 px-3 py-2 rounded-xl cursor-pointer">
                      حذف
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function successIndexSafe(report: QualityEventReport) {
  return computedSuccessIndex(report);
}
