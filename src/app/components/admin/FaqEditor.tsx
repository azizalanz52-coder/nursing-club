'use client';

import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { defaultFaqPage, loadFaqPage, saveFaqPage, type FaqItem, type FaqPage } from '../../lib/faq';
import { ClubIcon } from '../icons';

export default function FaqEditor() {
  const [data, setData] = useState<FaqPage>(() => defaultFaqPage());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFaqPage(db).then(setData);
  }, []);

  const updateItem = (id: string, field: keyof FaqItem, value: string) => {
    setData((current) => ({
      items: current.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    const item: FaqItem = {
      id: `faq-${Date.now()}`,
      question: '',
      answer: '',
    };
    setData((current) => ({ items: [...current.items, item] }));
  };

  const removeItem = (id: string) => {
    if (!window.confirm('حذف هذا السؤال من صفحة الأسئلة الشائعة؟')) return;
    setData((current) => ({ items: current.items.filter((item) => item.id !== id) }));
  };

  const moveItem = (id: string, direction: -1 | 1) => {
    setData((current) => {
      const index = current.items.findIndex((item) => item.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.items.length) return current;
      const items = [...current.items];
      [items[index], items[next]] = [items[next], items[index]];
      return { items };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveFaqPage(db, data);
      alert('تم حفظ الأسئلة الشائعة. الصفحة العامة تظهر التعديلات فوراً.');
    } catch (err) {
      console.error(err);
      alert('تعذر الحفظ. تأكد من تسجيل الدخول كإدارة.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900">الأسئلة الشائعة</h3>
            <p className="text-xs text-slate-500">
              عدّل أو أضف أو احذف من هنا. الصفحة العامة <span className="font-mono">/faq</span> تتحدث بعد الحفظ.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 font-black text-xs hover:bg-slate-200 cursor-pointer"
            >
              + إضافة سؤال
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs hover:brightness-110 cursor-pointer disabled:opacity-60"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الأسئلة'}
            </button>
          </div>
        </div>

        {data.items.length === 0 ? (
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-8 text-center">
            ما فيه أسئلة بعد. أضف سؤالاً ثم احفظ ليظهر في الصفحة العامة.
          </p>
        ) : (
          <div className="space-y-4">
            {data.items.map((item, index) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 bg-slate-50/70">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-[#630517] bg-[#630517]/10 px-2.5 py-1 rounded-full">
                    سؤال {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, -1)}
                      disabled={index === 0}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 font-black text-xs disabled:opacity-40 cursor-pointer"
                      title="تحريك لأعلى"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(item.id, 1)}
                      disabled={index === data.items.length - 1}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 font-black text-xs disabled:opacity-40 cursor-pointer"
                      title="تحريك لأسفل"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 grid place-items-center cursor-pointer"
                      title="حذف السؤال"
                    >
                      <ClubIcon name="trash" size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">السؤال</label>
                  <input
                    value={item.question}
                    onChange={(e) => updateItem(item.id, 'question', e.target.value)}
                    placeholder="مثال: كيف أنضم للجان النادي؟"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">الإجابة</label>
                  <textarea
                    rows={4}
                    value={item.answer}
                    onChange={(e) => updateItem(item.id, 'answer', e.target.value)}
                    placeholder="اكتب الإجابة كما تظهر للزائر."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white leading-7"
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
