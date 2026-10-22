'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  COLLEGE_TIER_LABELS,
  emptyCollegeAdministration,
  loadCollegeAdministration,
  saveCollegeAdministration,
  type CollegeAdministration,
  type CollegeOffice,
  type CollegeOfficeTier,
  type CollegePageCopy,
} from '../../lib/collegeAdministration';
import { isOverUploadLimit, uploadClubFile, uploadLimitMessage } from '../../lib/uploadFile';

const COPY_FIELDS: Array<{ key: keyof CollegePageCopy; label: string; multiline?: boolean }> = [
  { key: 'kicker', label: 'السطر الذهبي أعلى العنوان' },
  { key: 'title', label: 'عنوان الصفحة' },
  { key: 'intro', label: 'مقدمة الصفحة', multiline: true },
  { key: 'vicesTitle', label: 'عنوان قسم الوكلاء' },
  { key: 'restTitle', label: 'عنوان قسم القسم الأكاديمي والسكرتارية' },
  { key: 'clubTitle', label: 'عنوان فقرة موقع النادي' },
  { key: 'clubBody', label: 'نص فقرة موقع النادي', multiline: true },
  { key: 'emptyName', label: 'النص عند غياب الاسم' },
];

export default function CollegeAdministrationEditor() {
  const [data, setData] = useState<CollegeAdministration>(() => emptyCollegeAdministration());
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState('');

  useEffect(() => {
    loadCollegeAdministration(db).then(setData);
  }, []);

  const updateCopy = (field: keyof CollegePageCopy, value: string) => {
    setData((current) => ({ ...current, copy: { ...current.copy, [field]: value } }));
  };

  const updateOffice = (id: string, field: keyof CollegeOffice, value: string) => {
    setData((current) => ({
      ...current,
      offices: current.offices.map((office) => (office.id === id ? { ...office, [field]: value } : office)),
    }));
  };

  const addOffice = () => {
    const office: CollegeOffice = {
      id: `office-${Date.now()}`,
      title: 'منصب جديد',
      name: '',
      note: '',
      photo: '',
      profileUrl: '',
      tier: 'vice',
    };
    setData((current) => ({ ...current, offices: [...current.offices, office] }));
  };

  const removeOffice = (id: string) => {
    if (!window.confirm('حذف هذا المنصب من الصفحة الرسمية؟')) return;
    setData((current) => ({ ...current, offices: current.offices.filter((office) => office.id !== id) }));
  };

  const handlePhoto = async (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (isOverUploadLimit(file)) {
      alert(uploadLimitMessage());
      return;
    }
    setUploadingId(id);
    try {
      const photo = await uploadClubFile(file, 'college-administration');
      updateOffice(id, 'photo', photo);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'تعذر رفع الصورة.');
    } finally {
      setUploadingId('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCollegeAdministration(db, data);
      alert('تم حفظ إدارة الكلية بالكامل. الصفحة الرسمية تظهر التعديلات فوراً.');
    } catch (err) {
      console.error(err);
      alert('تعذر الحفظ. تأكد من تسجيل الدخول كإدارة.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 space-y-1">
          <h3 className="text-xl font-black text-slate-900">نصوص صفحة إدارة الكلية</h3>
          <p className="text-xs text-slate-500">
            كل عبارة ظاهرة للزائر في <span className="font-mono">/college</span> تُعدَّل من هنا.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COPY_FIELDS.map((field) => (
            <div key={field.key} className={`space-y-1 ${field.multiline ? 'sm:col-span-2' : ''}`}>
              <label className="text-[11px] font-bold text-slate-500">{field.label}</label>
              {field.multiline ? (
                <textarea
                  rows={3}
                  value={data.copy[field.key]}
                  onChange={(e) => updateCopy(field.key, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              ) : (
                <input
                  value={data.copy[field.key]}
                  onChange={(e) => updateCopy(field.key, e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">المناصب والصور</h3>
            <p className="text-xs text-slate-500">صورة مع الاسم لكل منصب، من العميد إلى السكرتارية أو أي منصب تضيفونه.</p>
          </div>
          <button
            type="button"
            onClick={addOffice}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 font-black text-xs"
          >
            + إضافة منصب
          </button>
        </div>

        <div className="space-y-5">
          {data.offices.map((office) => (
            <div key={office.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-slate-200 shrink-0">
                  {office.photo ? (
                    <img src={office.photo} alt={office.name || office.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] font-bold text-slate-400">بدون صورة</div>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <label className="text-[11px] font-bold text-slate-500">صورة المنصب</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingId === office.id}
                    onChange={(event) => handlePhoto(office.id, event)}
                    className="w-full text-[11px] file:ml-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#630517] file:text-[#F5D061] file:font-black"
                  />
                  {uploadingId === office.id ? <p className="text-[11px] text-[#630517] font-bold">جاري رفع الصورة...</p> : null}
                  {office.photo ? (
                    <button type="button" onClick={() => updateOffice(office.id, 'photo', '')} className="text-[11px] text-red-600 font-bold">
                      إزالة الصورة
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">المسمى الوظيفي</label>
                <input
                  value={office.title}
                  onChange={(e) => updateOffice(office.id, 'title', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">الاسم</label>
                <input
                  value={office.name}
                  onChange={(e) => updateOffice(office.id, 'name', e.target.value)}
                  placeholder="يُترك فارغاً حتى يتوفر الاسم الرسمي"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">التصنيف في الصفحة</label>
                <select
                  value={office.tier}
                  onChange={(e) => updateOffice(office.id, 'tier', e.target.value as CollegeOfficeTier)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  {(Object.keys(COLLEGE_TIER_LABELS) as CollegeOfficeTier[]).map((tier) => (
                    <option key={tier} value={tier}>
                      {COLLEGE_TIER_LABELS[tier]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">نبذة قصيرة</label>
                <input
                  value={office.note}
                  onChange={(e) => updateOffice(office.id, 'note', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-500">رابط الملفات الشخصية (LinkedIn أو غيره)</label>
                <input
                  value={office.profileUrl}
                  onChange={(e) => updateOffice(office.id, 'profileUrl', e.target.value)}
                  placeholder="https://www.linkedin.com/in/..."
                  dir="ltr"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <button type="button" onClick={() => removeOffice(office.id)} className="text-[11px] text-red-600 font-black">
                  حذف المنصب
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110 disabled:opacity-60"
      >
        {saving ? 'جاري الحفظ...' : 'حفظ إدارة الكلية بالكامل'}
      </button>
    </div>
  );
}
