'use client';

import React, { useState } from 'react';
import {
  formatScientificDate,
  groupTextsByArchiveTitle,
  isArchivedScientificText,
  isApprovedScientificText,
  scientificArchiveTitle,
  scientificPdfUrl,
  scientificStatusLabel,
} from '../lib/scientificTexts';

type ScientificShelfItem = {
  id: string;
  title?: string;
  content?: string;
  author?: string;
  status?: string;
  archiveTitle?: string;
  archived?: boolean;
  fileName?: string;
  pdfUrl?: string;
  fileUrl?: string;
  createdAt?: string | number;
  createdAtMs?: number;
};

type Props = {
  texts: ScientificShelfItem[];
  canManage: boolean;
  isDesignOnly: boolean;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onArchiveGroup: (archiveTitle: string) => void;
  onRestoreGroup: (archiveTitle: string) => void;
};

export default function ScientificTextsShelf({
  texts,
  canManage,
  isDesignOnly,
  onArchive,
  onRestore,
  onArchiveGroup,
  onRestoreGroup,
}: Props) {
  const [shelf, setShelf] = useState<'current' | 'archive'>('current');

  const visibleBase = isDesignOnly ? texts.filter((item) => isApprovedScientificText(item)) : texts;
  const currentTexts = visibleBase.filter((item) => !isArchivedScientificText(item));
  const archivedTexts = visibleBase.filter((item) => isArchivedScientificText(item));
  const shown = shelf === 'archive' ? archivedTexts : currentTexts;
  const groups = groupTextsByArchiveTitle(shown);

  return (
    <div className="space-y-5 pt-4 border-t border-slate-100">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShelf('current')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black ${
              shelf === 'current' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            النصوص الحالية ({currentTexts.length})
          </button>
          <button
            type="button"
            onClick={() => setShelf('archive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black ${
              shelf === 'archive' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            الأرشيف ({archivedTexts.length})
          </button>
        </div>
        <p className="text-[11px] text-slate-500 font-bold">
          {shelf === 'archive'
            ? 'كل أرشيف له عنوان واضح، مثل نصوص فعالية الصحة النفسية.'
            : 'النصوص الحالية للعمل. بعد انتهاء الفعالية أرشفوها ولا تحذفوها.'}
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="text-center py-8 text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
          {shelf === 'archive'
            ? 'لا يوجد أرشيف بعد. بعد انتهاء الفعالية استخدم زر الأرشفة.'
            : isDesignOnly
              ? 'لا توجد نصوص معتمدة من الإدارة حتى الآن.'
              : 'لا توجد نصوص حالية. ارفع نصاً جديداً أو أرجع نصاً من الأرشيف.'}
        </p>
      ) : (
        groups.map(([archiveTitle, items]) => (
          <section key={archiveTitle} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h4 className="font-black text-slate-900 text-sm">{archiveTitle}</h4>
                <p className="text-[10px] text-slate-500 font-bold">{items.length} نص محفوظ تحت هذا العنوان</p>
              </div>
              {canManage && (
                <button
                  type="button"
                  onClick={() => (shelf === 'archive' ? onRestoreGroup(archiveTitle) : onArchiveGroup(archiveTitle))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    shelf === 'archive'
                      ? 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {shelf === 'archive' ? 'إرجاع كل نصوص هذا الأرشيف' : 'أرشفة هذه الفعالية'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((txt) => (
                <div key={txt.id} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        txt.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : txt.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {scientificStatusLabel(txt.status)}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatScientificDate(txt.createdAtMs || txt.createdAt)}</span>
                    </div>
                    <p className="text-[10px] font-black text-[#630517] bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg inline-block">
                      {scientificArchiveTitle(txt)}
                    </p>
                    <h5 className="font-black text-slate-900 text-sm">{txt.title}</h5>
                    {txt.content ? (
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-semibold">"{txt.content}"</p>
                    ) : null}
                    {scientificPdfUrl(txt) ? (
                      <a
                        href={scientificPdfUrl(txt)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
                      >
                        فتح ملف PDF {txt.fileName ? `(${txt.fileName})` : ''}
                      </a>
                    ) : null}
                    {txt.author ? <p className="text-[10px] text-slate-400">بواسطة: {txt.author}</p> : null}
                  </div>
                  {canManage && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => (isArchivedScientificText(txt) ? onRestore(txt.id) : onArchive(txt.id))}
                        className={`px-3 py-1.5 font-bold text-xs rounded-lg cursor-pointer ${
                          isArchivedScientificText(txt)
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isArchivedScientificText(txt) ? 'إرجاع للحالية' : 'أرشفة'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
