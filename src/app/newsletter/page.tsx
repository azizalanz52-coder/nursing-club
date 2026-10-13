'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

type NewsType = 'article' | 'exam-schedule';

interface ExamEntry {
  course: string;
  courseCode?: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
}

interface NewsletterItem {
  id: string;
  title: string;
  category: string;
  content: string;
  link?: string;
  date: string;
  image: string;
  type: NewsType;
  featured?: boolean;
  examCohort?: string;
  examSemester?: string;
  exams: ExamEntry[];
}

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'exams', label: 'جداول الاختبارات' },
  { id: 'أخبار النادي الأسبوعية', label: 'أخبار النادي' },
  { id: 'مصادر اختبار الهيئة', label: 'مصادر الهيئة' },
  { id: 'تحديثات كلية التمريض', label: 'الكلية' },
  { id: 'نصائح دراسية', label: 'نصائح دراسية' },
] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function parseExamDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatArDate(value?: string) {
  const d = parseExamDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(value?: string) {
  const d = parseExamDate(value);
  if (!d) return null;
  return Math.round((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000);
}

function examStatus(value?: string) {
  const days = daysUntil(value);
  if (days === null) return { label: 'غير محدد', tone: 'slate' as const };
  if (days < 0) return { label: 'انتهى', tone: 'slate' as const };
  if (days === 0) return { label: 'اليوم', tone: 'rose' as const };
  if (days <= 3) return { label: `بعد ${days} يوم`, tone: 'amber' as const };
  return { label: `بعد ${days} يوم`, tone: 'emerald' as const };
}

function printSchedule(title: string, html: string) {
  const frame = window.open('', '_blank', 'width=900,height=700');
  if (!frame) return;
  frame.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>${title}</title>
    <style>
      body { font-family: Tahoma, Arial, sans-serif; background: #fff; color: #1c1917; padding: 28px; }
      h1 { color: #630517; margin: 0 0 6px; font-size: 22px; }
      p { margin: 0 0 16px; color: #57534e; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #630517; color: #F5D061; padding: 10px; text-align: right; }
      td { border: 1px solid #e7e5e4; padding: 10px; }
      tr:nth-child(even) td { background: #faf7f2; }
    </style></head><body>${html}</body></html>`);
  frame.document.close();
  frame.focus();
  frame.print();
}

export default function NewsletterPage() {
  const [items, setItems] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [cohort, setCohort] = useState<string>('الكل');
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'site_newsletters'),
      (snap) => {
        const list = snap.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<NewsletterItem>;
          const exams = Array.isArray(data.exams) ? data.exams : [];
          return {
            id: docSnap.id,
            title: data.title || 'إصدار النشرة',
            category: data.category || 'أخبار النادي الأسبوعية',
            content: data.content || '',
            link: data.link || '',
            date: data.date || '',
            image: data.image || '/logo.png',
            type: data.type || (exams.length ? 'exam-schedule' : 'article'),
            featured: Boolean(data.featured),
            examCohort: data.examCohort || 'جميع الدفعات',
            examSemester: data.examSemester || '',
            exams,
          } as NewsletterItem;
        });
        list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setItems(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const examBoards = useMemo(
    () => items.filter((item) => item.type === 'exam-schedule' && item.exams.length > 0),
    [items]
  );

  const articles = useMemo(
    () => items.filter((item) => item.type !== 'exam-schedule'),
    [items]
  );

  const cohorts = useMemo(() => {
    const names = Array.from(new Set(examBoards.map((item) => item.examCohort).filter(Boolean))) as string[];
    return ['الكل', ...names];
  }, [examBoards]);

  const nextExam = useMemo(() => {
    const upcoming = examBoards
      .flatMap((board) =>
        board.exams.map((exam) => ({
          ...exam,
          cohort: board.examCohort,
          semester: board.examSemester,
          boardTitle: board.title,
        }))
      )
      .filter((exam) => {
        const days = daysUntil(exam.date);
        return days !== null && days >= 0;
      })
      .sort((a, b) => (parseExamDate(a.date)?.getTime() || 0) - (parseExamDate(b.date)?.getTime() || 0));
    return upcoming[0] || null;
  }, [examBoards]);

  const featured = useMemo(
    () => articles.find((item) => item.featured) || articles[0] || null,
    [articles]
  );

  const visibleBoards = useMemo(() => {
    if (filter !== 'all' && filter !== 'exams') return [];
    return examBoards.filter((board) => {
      const cohortOk = cohort === 'الكل' || board.examCohort === cohort;
      const q = queryText.trim();
      const searchOk =
        !q ||
        board.title.includes(q) ||
        board.examCohort?.includes(q) ||
        board.exams.some((exam) => exam.course.includes(q) || (exam.courseCode || '').includes(q));
      return cohortOk && searchOk;
    });
  }, [examBoards, filter, cohort, queryText]);

  const visibleArticles = useMemo(() => {
    if (filter === 'exams') return [];
    return articles.filter((item) => {
      const catOk = filter === 'all' || item.category === filter;
      const q = queryText.trim();
      const searchOk = !q || item.title.includes(q) || item.content.includes(q) || item.category.includes(q);
      return catOk && searchOk;
    });
  }, [articles, filter, queryText]);

  const latestStamp = items[0]?.date
    ? new Date(items[0].date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <main className="min-h-screen bg-[#F6F0E8] text-stone-900" dir="rtl">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3a020c] via-[#630517] to-[#4A030F] text-white">
        <div className="absolute -top-24 left-[-10%] h-72 w-72 rounded-full bg-[#F5D061]/15 blur-3xl" />
        <div className="absolute -bottom-28 right-[-8%] h-80 w-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="text-xs font-bold text-[#F5D061] hover:text-white transition-colors whitespace-nowrap">
              العودة للرئيسية
            </Link>
            <div className="flex items-center gap-2 text-[11px] font-bold text-white/80">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>تحديث مباشر من لوحة التحكم</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-end">
            <div className="space-y-4">
              <p className="text-[#F5D061] text-xs font-black">نادي التمريض • جامعة حفر الباطن</p>
              <h1 className="text-3xl sm:text-5xl font-black leading-tight">النشرة الأسبوعية</h1>
              <p className="text-amber-50/85 text-sm max-w-xl leading-relaxed">
                جداول اختبارات دفعات كلية التمريض، أخبار النادي، ومصادر اختبار الهيئة — من مكان واحد، لحظة ما تُنشر من الإدارة.
              </p>
              {latestStamp && (
                <p className="text-[11px] text-white/60 font-bold">آخر نشر: {latestStamp}</p>
              )}
            </div>

            {nextExam ? (
              <div className="rounded-3xl bg-white/10 border border-[#F5D061]/30 p-5 backdrop-blur-sm space-y-3">
                <p className="text-[11px] font-black text-[#F5D061]">أقرب اختبار قادم</p>
                <h2 className="text-xl font-black leading-snug">{nextExam.course}</h2>
                <p className="text-sm text-white/80">
                  {nextExam.cohort} {nextExam.courseCode ? `• ${nextExam.courseCode}` : ''}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="bg-[#F5D061] text-[#630517] px-3 py-1 rounded-full">{examStatus(nextExam.date).label}</span>
                  <span className="bg-black/20 px-3 py-1 rounded-full">{formatArDate(nextExam.date)}</span>
                  {nextExam.time && <span className="bg-black/20 px-3 py-1 rounded-full">{nextExam.time}</span>}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl bg-white/8 border border-white/10 p-5 text-sm text-white/75">
                جداول الاختبارات تظهر هنا فور نشرها من تبويب النشرة في لوحة التحكم.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${
                  filter === item.id
                    ? 'bg-[#630517] text-[#F5D061] shadow'
                    : 'bg-white text-stone-600 border border-stone-200 hover:border-[#630517]/30'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="ابحث عن مادة، دفعة، أو خبر..."
            className="w-full lg:w-72 px-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-xs font-bold focus:outline-none focus:border-[#630517]"
          />
        </div>

        {examBoards.length > 0 && (filter === 'all' || filter === 'exams') && (
          <div className="flex flex-wrap gap-2">
            {cohorts.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCohort(name)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap ${
                  cohort === name ? 'bg-[#F5D061] text-[#630517]' : 'bg-white text-stone-600 border border-stone-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white border border-stone-200 p-12 text-center text-sm font-bold text-stone-400">
            جاري تحميل النشرة من لوحة التحكم...
          </div>
        ) : (
          <>
            {visibleBoards.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black text-[#630517]">جداول الاختبارات</p>
                    <h2 className="text-2xl font-black">دفعات كلية التمريض</h2>
                  </div>
                </div>

                <div className="grid gap-5">
                  {visibleBoards.map((board) => (
                    <article key={board.id} className="rounded-3xl bg-white border border-stone-200 shadow-sm overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#630517] text-white">
                        <div>
                          <p className="text-[11px] text-[#F5D061] font-black">{board.examCohort}</p>
                          <h3 className="text-lg font-black">{board.title}</h3>
                          {board.examSemester && <p className="text-xs text-white/75 mt-1">{board.examSemester}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            printSchedule(
                              board.title,
                              `<h1>${board.title}</h1><p>${board.examCohort || ''} ${board.examSemester ? '• ' + board.examSemester : ''}</p>
                              <table><thead><tr><th>المادة</th><th>الرمز</th><th>التاريخ</th><th>الوقت</th><th>القاعة</th><th>ملاحظات</th></tr></thead>
                              <tbody>${board.exams
                                .map(
                                  (exam) =>
                                    `<tr><td>${exam.course}</td><td>${exam.courseCode || '—'}</td><td>${formatArDate(exam.date)}</td><td>${exam.time || '—'}</td><td>${exam.location || '—'}</td><td>${exam.notes || '—'}</td></tr>`
                                )
                                .join('')}</tbody></table>`
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-[#F5D061] text-[#630517] text-[11px] font-black whitespace-nowrap"
                        >
                          طباعة الجدول
                        </button>
                      </div>

                      {board.content && (
                        <p className="px-5 pt-4 text-xs text-stone-600 leading-relaxed">{board.content}</p>
                      )}

                      <div className="hidden md:block overflow-x-auto p-5">
                        <table className="w-full text-right text-xs">
                          <thead>
                            <tr className="text-[#630517] border-b border-stone-200">
                              <th className="pb-3 font-black">المادة</th>
                              <th className="pb-3 font-black">الرمز</th>
                              <th className="pb-3 font-black">التاريخ</th>
                              <th className="pb-3 font-black">الوقت</th>
                              <th className="pb-3 font-black">القاعة</th>
                              <th className="pb-3 font-black">الحالة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {board.exams.map((exam, idx) => {
                              const status = examStatus(exam.date);
                              return (
                                <tr key={`${board.id}-${idx}`} className="border-b border-stone-100 last:border-0">
                                  <td className="py-3 font-black text-stone-900 whitespace-nowrap">{exam.course}</td>
                                  <td className="py-3 text-stone-500 whitespace-nowrap">{exam.courseCode || '—'}</td>
                                  <td className="py-3 whitespace-nowrap">{formatArDate(exam.date)}</td>
                                  <td className="py-3 whitespace-nowrap">{exam.time || '—'}</td>
                                  <td className="py-3">{exam.location || '—'}</td>
                                  <td className="py-3">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                                        status.tone === 'rose'
                                          ? 'bg-rose-100 text-rose-800'
                                          : status.tone === 'amber'
                                            ? 'bg-amber-100 text-amber-800'
                                            : status.tone === 'emerald'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-stone-100 text-stone-500'
                                      }`}
                                    >
                                      {status.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="md:hidden p-4 space-y-3">
                        {board.exams.map((exam, idx) => {
                          const status = examStatus(exam.date);
                          return (
                            <div key={`${board.id}-m-${idx}`} className="rounded-2xl border border-stone-200 p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-black text-sm">{exam.course}</h4>
                                <span className="text-[10px] font-black bg-amber-50 text-amber-800 px-2 py-1 rounded-full whitespace-nowrap">
                                  {status.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500">{exam.courseCode || 'بدون رمز'}</p>
                              <p className="text-xs font-bold">{formatArDate(exam.date)} {exam.time ? `• ${exam.time}` : ''}</p>
                              {exam.location && <p className="text-xs text-stone-600">القاعة: {exam.location}</p>}
                              {exam.notes && <p className="text-xs text-stone-500">{exam.notes}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {featured && filter === 'all' && !queryText && (
              <section className="rounded-3xl overflow-hidden bg-white border border-stone-200 shadow-sm grid md:grid-cols-[0.9fr_1.1fr]">
                <div className="min-h-[180px] bg-[#630517] flex items-center justify-center p-6">
                  <img src={featured.image || '/logo.png'} alt="" className="max-h-40 object-contain" />
                </div>
                <div className="p-6 space-y-3">
                  <span className="text-[10px] font-black bg-[#F5D061]/20 text-[#630517] px-2.5 py-1 rounded-full">{featured.category}</span>
                  <h2 className="text-2xl font-black leading-snug">{featured.title}</h2>
                  <p className="text-sm text-stone-600 leading-relaxed">{featured.content}</p>
                  {featured.link && (
                    <a href={featured.link} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-black text-[#630517]">
                      فتح المصدر ↗
                    </a>
                  )}
                </div>
              </section>
            )}

            {visibleArticles.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-black">من النشرة</h2>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleArticles.map((item) => (
                    <article key={item.id} className="rounded-3xl bg-white border border-stone-200 p-5 flex flex-col gap-3 shadow-sm">
                      <span className="self-start text-[10px] font-black bg-stone-100 text-[#630517] px-2.5 py-1 rounded-full">
                        {item.category}
                      </span>
                      <h3 className="font-black text-lg leading-snug">{item.title}</h3>
                      <p className="text-xs text-stone-600 leading-relaxed flex-1">{item.content}</p>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-stone-400 font-bold">
                        <span>{item.date ? new Date(item.date).toLocaleDateString('ar-SA') : ''}</span>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[#630517]">
                            المصدر
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {!loading && visibleBoards.length === 0 && visibleArticles.length === 0 && (
              <div className="rounded-3xl bg-white border border-dashed border-stone-300 p-12 text-center space-y-2">
                <p className="text-lg font-black text-[#630517]">النشرة بانتظار أول إصدار</p>
                <p className="text-sm text-stone-500">عند نشر خبر أو جدول اختبارات من لوحة التحكم، يظهر هنا مباشرة.</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
