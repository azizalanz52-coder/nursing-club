'use client';

import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase';
import { notifyLeadership } from '../lib/userAccounts';
import { clubConfirm } from '../lib/clubNotice';
import { filterFilesWithinLimit, uploadClubFiles, uploadLimitMessage, uploadingLabel } from '../lib/uploadFile';
import {
  DESIGN_KINDS,
  DESIGN_STORAGE_FOLDER,
  deleteDesignWork,
  designFileUrls,
  designParticipantCountLabel,
  designWorkCountLabel,
  groupDesignWorksByEvent,
  groupEventContributors,
  isDesignPdf,
  saveDesignWork,
  subscribeDesignWorks,
  uniqueDesignEvents,
  type DesignContributor,
  type DesignWork,
} from '../lib/designWorks';

type Props = {
  actorName: string;
  actorPhone: string;
  source: string;
  uploaderRole: string;
  eventSuggestions?: string[];
  canUpload?: boolean;
  canDelete?: boolean;
};

export default function DesignWorksBoard({
  actorName,
  actorPhone,
  source,
  uploaderRole,
  eventSuggestions = [],
  canUpload = true,
  canDelete = true,
}: Props) {
  const OTHER_EVENT = '__other__';
  const [works, setWorks] = useState<DesignWork[]>([]);
  const [eventPick, setEventPick] = useState('');
  const [eventCustom, setEventCustom] = useState('');
  const [kind, setKind] = useState<string>(DESIGN_KINDS[0]);
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ eventName: string; contributor: DesignContributor } | null>(null);
  const [preview, setPreview] = useState<{ src: string; title: string; pdf: boolean } | null>(null);

  useEffect(() => subscribeDesignWorks(db, setWorks), []);

  const grouped = useMemo(() => groupDesignWorksByEvent(works), [works]);
  const suggestionList = useMemo(() => {
    const fromWorks = works.map((item) => item.eventTitle).filter(Boolean);
    return Array.from(new Set([...eventSuggestions, ...fromWorks].map((item) => item.trim()).filter(Boolean)));
  }, [eventSuggestions, works]);
  const eventTitle = eventPick === OTHER_EVENT || suggestionList.length === 0 ? eventCustom : eventPick;

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      alert('اكتب اسم الفعالية التي صُمم لها العمل.');
      return;
    }
    if (files.length === 0) {
      alert('اختر ملف التصميم أولاً.');
      return;
    }
    try {
      setIsUploading(true);
      setProgress(0);
      const urls = await uploadClubFiles(files, DESIGN_STORAGE_FOLDER, setProgress);
      await saveDesignWork(db, {
        eventTitle,
        kind,
        title,
        urls,
        addedBy: actorName,
        addedByPhone: actorPhone,
        source,
        uploaderRole,
      });
      notifyLeadership(db, `🎨 رفع ${actorName || 'عضو التصميم'} تصميماً لفعالية: ${eventTitle.trim()}`).catch(() => undefined);
      setTitle('');
      setFiles([]);
      alert('تم رفع التصميم. ظهر في أرشيف اللجنة ولوحة الأدمن، ويُحتسب في رادار الأداء.');
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'تعذر رفع التصميم. أعد المحاولة.');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await clubConfirm('حذف هذا التصميم من سجل اللجنة؟'))) return false;
    try {
      await deleteDesignWork(db, id);
      return true;
    } catch (err) {
      console.error(err);
      alert('تعذر حذف التصميم.');
      return false;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F5D061]/50 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">🎨 تصاميم اللجنة لكل فعالية</h2>
          <p className="text-xs text-slate-500 mt-1">
            {canUpload
              ? 'ارفع البوستر أو الستوري باسم الفعالية. اضغط اسم الفعالية لترى من شارك وكم رفع، ثم استعراض أعماله. النقاط ولوحة الشرف تُضاف يدوياً من لوحة القادة.'
              : 'اضغط اسم الفعالية لفتح قائمة المشاركين وعدد أعمال كل شخص، ثم استعراض أعماله. النقاط ولوحة الشرف تُدار يدوياً من لوحة القادة.'}
          </p>
        </div>
        <div className="flex gap-2 text-[11px] font-black">
          <span className="px-3 py-1.5 rounded-xl bg-[#630517] text-[#F5D061]">{works.length} تصميم</span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">{uniqueDesignEvents(works)} فعالية</span>
        </div>
      </div>

      {canUpload && (
        <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#630517]/5 p-5 rounded-2xl border border-[#F5D061]/40">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">اسم الفعالية *</label>
            {suggestionList.length > 0 ? (
              <select
                value={eventPick}
                onChange={(e) => setEventPick(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 font-bold"
                required
              >
                <option value="" disabled>اختر اسم الفعالية</option>
                {suggestionList.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
                <option value={OTHER_EVENT}>فعالية أخرى — اكتب الاسم</option>
              </select>
            ) : null}
            {suggestionList.length === 0 || eventPick === OTHER_EVENT ? (
              <input
                type="text"
                placeholder="اكتب اسم الفعالية"
                value={eventCustom}
                onChange={(e) => {
                  setEventCustom(e.target.value);
                  if (suggestionList.length === 0) setEventPick(OTHER_EVENT);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
                required
              />
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">نوع التصميم</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 font-bold"
            >
              {DESIGN_KINDS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">وصف قصير (اختياري)</label>
            <input
              type="text"
              placeholder="مثال: بوستر الدعوة النهائي"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">ملفات التصميم (صور أو PDF — حد 8 ميغابايت)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const picked = Array.from(e.target.files || []);
                e.target.value = '';
                if (!picked.length) return;
                const { accepted, rejected } = filterFilesWithinLimit(picked);
                if (rejected.length > 0) alert(uploadLimitMessage());
                if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white cursor-pointer"
            />
            {files.length > 0 ? (
              <p className="text-[11px] font-bold text-[#630517]">جاهز للرفع: {files.map((file) => file.name).join('، ')}</p>
            ) : (
              <p className="text-[11px] text-slate-500">ارفع العمل النهائي للفعالية. اسمك يُسجَّل مع الملف.</p>
            )}
          </div>
          <div className="sm:col-span-2 space-y-2">
            <button
              type="submit"
              disabled={isUploading || files.length === 0}
              className="px-8 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow disabled:bg-slate-400"
            >
              {uploadingLabel(isUploading, progress, '+ رفع تصميم للفعالية')}
            </button>
            {isUploading ? (
              <div className="h-2 rounded-full bg-amber-100 overflow-hidden" dir="ltr">
                <div
                  className={`h-full bg-[#630517] ${progress <= 0 ? 'w-1/3 animate-pulse' : 'transition-all duration-200'}`}
                  style={progress > 0 ? { width: `${progress}%` } : undefined}
                />
              </div>
            ) : null}
          </div>
        </form>
      )}

      <div className="space-y-2">
        {grouped.length === 0 ? (
          <p className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">لم تُرفع تصاميم بعد. أول رفع يظهر هنا للأدمن وللرادار.</p>
        ) : grouped.map(([eventName, items]) => {
          const contributors = groupEventContributors(items);
          const open = expandedEvent === eventName;
          return (
            <section key={eventName} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setExpandedEvent(open ? null : eventName)}
                aria-expanded={open}
                className="w-full text-right px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 truncate">{eventName}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {designWorkCountLabel(items.length)} • {designParticipantCountLabel(contributors.length)}
                  </p>
                </div>
                <span className={`shrink-0 text-slate-400 text-xs font-black transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {open ? (
                <div className="border-t border-slate-100 bg-slate-50/80 p-3 space-y-2">
                  {contributors.map((person) => (
                    <div key={person.key} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{person.name}</p>
                        <p className="text-[10px] text-slate-500">{designWorkCountLabel(person.works.length)}{person.phone ? ` • ${person.phone}` : ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewing({ eventName, contributor: person })}
                        className="shrink-0 px-4 py-2 rounded-xl bg-[#630517] text-[#F5D061] text-[11px] font-black"
                      >
                        استعراض
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {reviewing ? (
        <div className="fixed inset-0 z-[400] bg-black/70 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#630517] text-[#F5D061] font-black text-sm flex justify-between gap-3">
              <span className="truncate">أعمال {reviewing.contributor.name} — {reviewing.eventName}</span>
              <button type="button" onClick={() => setReviewing(null)} className="text-white text-xs">إغلاق</button>
            </div>
            <div className="flex-1 overflow-auto p-4 grid sm:grid-cols-2 gap-3">
              {reviewing.contributor.works.map((item) => {
                const sources = designFileUrls(item);
                const primary = sources[0] || item.fileUrl;
                return (
                  <article key={item.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-2">
                    <span className="text-[10px] font-black bg-[#630517]/10 text-[#630517] px-2 py-0.5 rounded-full">{item.kind}</span>
                    {item.title && item.title !== item.eventTitle ? (
                      <p className="text-xs font-extrabold text-slate-900">{item.title}</p>
                    ) : null}
                    <p className="text-[10px] text-slate-500">{item.createdAt || ''}</p>
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white min-h-[120px] grid place-items-center">
                      {!primary ? (
                        <p className="text-[11px] text-slate-400 font-bold">لا يوجد ملف</p>
                      ) : isDesignPdf(primary) ? (
                        <a href={primary} target="_blank" rel="noreferrer" className="text-xs font-black text-[#630517] py-8">فتح ملف PDF</a>
                      ) : (
                        <img src={primary} alt={item.title} className="w-full h-auto max-h-56 object-contain" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      {primary ? (
                        <button
                          type="button"
                          onClick={() => setPreview({ src: primary, title: item.title || reviewing.eventName, pdf: isDesignPdf(primary) })}
                          className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-bold"
                        >
                          تكبير
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={async () => {
                            const removed = await handleDelete(item.id);
                            if (!removed) return;
                            const nextWorks = reviewing.contributor.works.filter((row) => row.id !== item.id);
                            if (nextWorks.length === 0) setReviewing(null);
                            else setReviewing({ ...reviewing, contributor: { ...reviewing.contributor, works: nextWorks } });
                          }}
                          className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[11px] font-bold"
                        >
                          حذف
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-[410] bg-black/80 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-[#630517] text-[#F5D061] font-black text-sm flex justify-between gap-3">
              <span className="truncate">{preview.title}</span>
              <button type="button" onClick={() => setPreview(null)} className="text-white text-xs">إغلاق</button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100 p-3 grid place-items-center min-h-[16rem]">
              {preview.pdf ? (
                <iframe title={preview.title} src={preview.src} className="w-full h-[70dvh] rounded-xl bg-white" />
              ) : (
                <img src={preview.src} alt={preview.title} className="max-w-full max-h-[70dvh] object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
