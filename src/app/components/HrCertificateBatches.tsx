'use client';

import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clubConfirm, clubNotice } from '../lib/clubNotice';
import {
  filterNewRecipients,
  parseEligibleExcel,
  personHasCertificate,
  sameEventTitle,
  suggestedCertTitle,
  type CertEligiblePerson,
  type CertEventBatch,
} from '../lib/hrCertificateBatches';

export default function HrCertificateBatches({
  certificates,
  actorName,
  formAnchorId,
  onIssue,
}: {
  certificates: Array<{ phone?: string; universityId?: string; title?: string; certTitle?: string }>;
  actorName: string;
  formAnchorId: string;
  onIssue: (person: CertEligiblePerson, certTitle: string) => void;
}) {
  const [eventTitle, setEventTitle] = useState('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [batches, setBatches] = useState<CertEventBatch[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'hr_certificate_batches'), (snap) => {
      const list = snap.docs
        .map((item) => ({ id: item.id, ...item.data() } as CertEventBatch))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setBatches(list);
      setOpenId((current) => current || list[0]?.id || null);
    });
    return () => unsub();
  }, []);

  const handleImport = async () => {
    if (!eventTitle.trim()) {
      alert('اكتب اسم الفعالية أولاً.');
      return;
    }
    if (!excelFile) {
      alert('اختر ملف الإكسل.');
      return;
    }

    setIsImporting(true);
    try {
      const buffer = await excelFile.arrayBuffer();
      const incoming = parseEligibleExcel(buffer);
      if (incoming.length === 0) {
        alert('ما لقينا أسماء صالحة في الملف. تأكد من عمود الاسم مع الجوال أو الرقم الجامعي.');
        return;
      }

      const title = eventTitle.trim();
      const existingBatch = batches.find((batch) => sameEventTitle(batch.eventTitle, title));
      const alreadyListed = existingBatch?.recipients || [];
      const uniqueIncoming = filterNewRecipients(incoming, alreadyListed);
      const skipped = incoming.length - uniqueIncoming.length;

      if (uniqueIncoming.length === 0) {
        await clubNotice('لا يوجد اسم جديد.', 'info');
        return;
      }

      if (existingBatch) {
        await updateDoc(doc(db, 'hr_certificate_batches', existingBatch.id), {
          recipients: [...alreadyListed, ...uniqueIncoming],
        });
        setOpenId(existingBatch.id);
      } else {
        const docRef = await addDoc(collection(db, 'hr_certificate_batches'), {
          eventTitle: title,
          createdAt: Date.now(),
          createdBy: actorName || 'لجنة الموارد البشرية',
          recipients: uniqueIncoming,
        });
        setOpenId(docRef.id);
      }
      setExcelFile(null);
      await clubNotice(
        skipped > 0 ? `أُضيف ${uniqueIncoming.length} وتخطّي ${skipped} مكرر.` : `أُضيف ${uniqueIncoming.length} مستحق.`,
        skipped > 0 ? 'info' : 'success'
      );
    } catch (err) {
      console.error(err);
      await clubNotice('تعذر قراءة الملف.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await clubConfirm('حذف قائمة المستحقين هذه؟'))) return;
    await deleteDoc(doc(db, 'hr_certificate_batches', id));
    alert('تم الحذف');
  };

  return (
    <div className="space-y-4 bg-sky-50/50 p-6 rounded-2xl border border-sky-200">
      <div>
        <h4 className="font-extrabold text-sm text-[#630517]">قوائم المستحقين من الإكسل</h4>
        <p className="text-[11px] text-slate-500">ارفع أسماء المشاركين، ثم أضف الشهادة لكل شخص بزر واحد. المكرر ما ينضاف.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">اسم الفعالية</label>
          <input
            type="text"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="مثال: فعالية اليوم العالمي للصحة النفسية"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">ملف الإكسل</label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#630517] file:text-[#F5D061] cursor-pointer"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={isImporting}
        onClick={handleImport}
        className="bg-[#630517] text-[#F5D061] px-5 py-2.5 rounded-xl font-black text-xs shadow hover:brightness-110 cursor-pointer disabled:opacity-60"
      >
        {isImporting ? 'جاري الاستيراد...' : 'رفع قائمة المستحقين'}
      </button>

      {batches.length === 0 ? (
        <p className="text-center text-xs text-slate-400 font-bold py-6">لا توجد قوائم بعد. ارفع إكسل الفعالية.</p>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const issuedCount = (batch.recipients || []).filter((person) =>
              personHasCertificate(person, certificates, batch.eventTitle)
            ).length;
            const open = openId === batch.id;
            const q = queryText.trim();
            const visible = (batch.recipients || []).filter(
              (person) =>
                !q ||
                person.fullName.includes(q) ||
                person.phone.includes(q) ||
                person.universityId.includes(q)
            );

            return (
              <div key={batch.id} className="bg-white rounded-2xl border border-sky-100 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : batch.id)}
                  className="w-full text-right px-4 py-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-black text-xs text-slate-900">{batch.eventTitle}</span>
                  <span className="text-[11px] font-bold text-sky-800">
                    {issuedCount}/{batch.recipients?.length || 0} صدرت
                  </span>
                </button>

                {open ? (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <input
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder="بحث في المستحقين..."
                        className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleDelete(batch.id)}
                        className="text-[11px] font-bold text-red-600 bg-red-50 px-3 py-2 rounded-xl cursor-pointer"
                      >
                        حذف القائمة
                      </button>
                    </div>

                    <div className="space-y-2 max-h-80 overflow-auto">
                      {visible.map((person, index) => {
                        const issued = personHasCertificate(person, certificates, batch.eventTitle);
                        return (
                          <div
                            key={`${person.phone}-${person.universityId}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="font-black text-xs text-slate-900">{person.fullName}</p>
                              <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
                                {[person.phone, person.universityId].filter(Boolean).join('  ')}
                              </p>
                            </div>
                            {issued ? (
                              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">صدرت</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onIssue(person, suggestedCertTitle(batch.eventTitle));
                                  document.getElementById(formAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="text-[11px] font-black bg-[#630517] text-[#F5D061] px-3 py-1.5 rounded-full hover:brightness-110 cursor-pointer"
                              >
                                إضافة شهادة
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
