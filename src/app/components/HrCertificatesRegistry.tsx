'use client';

import React, { useMemo, useState } from 'react';
import { canonicalPhone, normalizeUniversityId } from '../lib/certificatesLookup';

type CertRecord = {
  id: string;
  phone?: string;
  universityId?: string;
  fullName?: string;
  recipientName?: string;
  title?: string;
  certTitle?: string;
  category?: string;
  dateStr?: string;
  issueDate?: string;
  createdAt?: number;
};

function categoryCount(certs: CertRecord[]) {
  const counts: Record<string, number> = {};
  certs.forEach((cert) => {
    const name = cert.category || 'بدون تصنيف';
    counts[name] = (counts[name] || 0) + 1;
  });
  return counts;
}

export default function HrCertificatesRegistry({
  certificates,
  onDelete,
}: {
  certificates: CertRecord[];
  onDelete: (id: string) => void;
}) {
  const [queryText, setQueryText] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const groups = useMemo(() => {
    const parent = new Map<string, string>();
    const find = (key: string): string => {
      const current = parent.get(key) || key;
      if (current === key) return key;
      const root = find(current);
      parent.set(key, root);
      return root;
    };
    const union = (a: string, b: string) => {
      if (!a || !b) return;
      const left = find(a);
      const right = find(b);
      if (left !== right) parent.set(right, left);
    };

    certificates.forEach((cert) => {
      const id = `c:${cert.id}`;
      parent.set(id, parent.get(id) || id);
      const phone = canonicalPhone(String(cert.phone || ''));
      const universityId = normalizeUniversityId(cert.universityId);
      if (phone) union(id, `p:${phone}`);
      if (universityId) union(id, `u:${universityId}`);
    });

    const map = new Map<string, { key: string; name: string; phone: string; universityId: string; certs: CertRecord[] }>();
    certificates.forEach((cert) => {
      const phone = canonicalPhone(String(cert.phone || '')) || String(cert.phone || '').trim();
      const universityId = normalizeUniversityId(cert.universityId) || String(cert.universityId || '').trim();
      const name = cert.fullName || cert.recipientName || 'بدون اسم';
      const key = find(`c:${cert.id}`);
      if (!map.has(key)) map.set(key, { key, name, phone, universityId, certs: [] });
      const group = map.get(key)!;
      group.certs.push(cert);
      if (group.name === 'بدون اسم' && name !== 'بدون اسم') group.name = name;
      if (!group.phone && phone) group.phone = phone;
      if (!group.universityId && universityId) group.universityId = universityId;
    });

    const q = queryText.trim();
    return Array.from(map.values())
      .filter((group) => !q || group.name.includes(q) || group.phone.includes(q) || group.universityId.includes(q))
      .sort((a, b) => b.certs.length - a.certs.length || a.name.localeCompare(b.name, 'ar'));
  }, [certificates, queryText]);

  return (
    <div className="space-y-4 border-t border-slate-100 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h4 className="font-black text-sm text-slate-900">سجل المستفيدين الصادر لهم شهادات</h4>
          <p className="text-[11px] text-slate-500">عدد الشهادات لكل شخص، تصنيفاتها، وإمكانية حذف أي شهادة.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-black">
          <span className="bg-[#630517] text-[#F5D061] px-3 py-1.5 rounded-full">{groups.length} مستفيد</span>
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full">{certificates.length} شهادة</span>
        </div>
      </div>

      <input
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
        placeholder="ابحث بالاسم أو الجوال أو الرقم الجامعي..."
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
      />

      {groups.length === 0 ? (
        <p className="text-center text-xs text-slate-400 font-bold py-8 bg-slate-50 rounded-2xl">لا توجد شهادات صادرة بعد.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const counts = categoryCount(group.certs);
            const opened = openKey === group.key;
            return (
              <div key={group.key} className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenKey(opened ? null : group.key)}
                  className="w-full text-right p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-900">{group.name}</p>
                    {group.phone && <p className="text-[11px] text-slate-500 font-mono" dir="ltr">{group.phone}</p>}
                    {group.universityId && <p className="text-[11px] text-slate-500 font-mono" dir="ltr">جامعي: {group.universityId}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                      {group.certs.length} {group.certs.length === 1 ? 'شهادة' : 'شهادات'}
                    </span>
                    {Object.entries(counts).map(([label, count]) => (
                      <span key={label} className="text-[10px] font-black bg-[#630517]/10 text-[#630517] px-2.5 py-1 rounded-full">
                        {label} × {count}
                      </span>
                    ))}
                  </div>
                </button>

                {opened && (
                  <div className="px-4 pb-4 space-y-2">
                    {group.certs.map((cert) => (
                      <div key={cert.id} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="min-w-0 space-y-1">
                          <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-900">
                            {cert.category || 'بدون تصنيف'}
                          </span>
                          <p className="font-black text-slate-900">{cert.title || cert.certTitle}</p>
                          <p className="text-slate-400">{cert.dateStr || cert.issueDate || ''}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDelete(cert.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-black hover:bg-red-100"
                        >
                          حذف الشهادة
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
