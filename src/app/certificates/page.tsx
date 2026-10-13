'use client';

import React, { useEffect, useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';
import { db } from './../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface CertificateItem {
  id: string;
  recipientName: string;
  phone: string;
  password?: string;
  certTitle: string;
  category: string;
  image: string;
  issueDate: string;
  description: string;
}

function categoryTone(category: string) {
  if (category.includes('شكر')) return 'bg-amber-100 text-amber-900 border-amber-200';
  if (category.includes('مشاركة')) return 'bg-[#630517]/10 text-[#630517] border-[#630517]/20';
  if (category.includes('تنظيم')) return 'bg-sky-100 text-sky-800 border-sky-200';
  if (category.includes('دورة') || category.includes('اجتياز')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  return 'bg-stone-100 text-stone-700 border-stone-200';
}

function formatCertDate(value?: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return value;
}

function isPdfFile(src?: string) {
  if (!src) return false;
  const lower = src.toLowerCase();
  return lower.includes('application/pdf') || lower.includes('.pdf');
}

export default function CertificatesPortal() {
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [searched, setSearched] = useState(false);
  const [userCertificates, setUserCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('الكل');

  useEffect(() => {
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) setPhoneInput(savedPhone);
  }, []);

  const categories = useMemo(() => {
    const names = Array.from(new Set(userCertificates.map((cert) => cert.category).filter(Boolean)));
    return ['الكل', ...names];
  }, [userCertificates]);

  const visibleCertificates = useMemo(() => {
    if (activeCategory === 'الكل') return userCertificates;
    return userCertificates.filter((cert) => cert.category === activeCategory);
  }, [userCertificates, activeCategory]);

  const handleSearchCertificates = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;

    setLoading(true);
    try {
      const phone = phoneInput.trim();
      const [siteSnap, hrSnap] = await Promise.all([
        getDocs(query(collection(db, 'site_certificates'), where('phone', '==', phone))),
        getDocs(query(collection(db, 'certificates'), where('phone', '==', phone))),
      ]);

      const mapped = new Map<string, CertificateItem>();
      [...siteSnap.docs, ...hrSnap.docs].forEach((d) => {
        const data = d.data() as any;
        mapped.set(d.id, {
          id: d.id,
          recipientName: data.recipientName || data.fullName || 'المستفيد',
          phone: data.phone || phone,
          password: data.password,
          certTitle: data.certTitle || data.title || 'شهادة مشاركة',
          category: data.category || 'شهادة مشاركة فعالية',
          image: data.image || data.fileUrl || '',
          issueDate: data.issueDate || data.dateStr || '',
          description: data.description || '',
        });
      });

      let list = Array.from(mapped.values());
      if (passwordInput.trim()) {
        list = list.filter((c) => !c.password || c.password === passwordInput.trim());
      }

      setUserCertificates(list);
      setActiveCategory('الكل');
      setSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F0E8] text-stone-900" dir="rtl">
      <section className="bg-gradient-to-br from-[#3a020c] via-[#630517] to-[#4A030F] text-white print:hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-3 text-center">
          <p className="text-[#F5D061] text-xs font-black">نادي التمريض • جامعة حفر الباطن</p>
          <h1 className="text-3xl sm:text-4xl font-black">استعلام الشهادات</h1>
          <p className="text-sm text-amber-50/85 max-w-lg mx-auto leading-relaxed">
            أدخل رقم الجوال وكلمة المرور لاستعراض شهاداتك، مع تصنيف كل شهادة: شكر وتقدير، مشاركة بفعالية، تنظيم، أو دورة.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <form
          onSubmit={handleSearchCertificates}
          className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-4 print:hidden"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">رقم الجوال</label>
              <input
                type="text"
                placeholder="05xxxxxxxx"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-[#630517]"
                dir="ltr"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">كلمة المرور</label>
              <input
                type="password"
                placeholder="كلمة مرور حسابك في النادي"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm font-bold text-stone-900 focus:outline-none focus:border-[#630517]"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#630517] text-[#F5D061] font-black text-sm shadow hover:brightness-110 transition-all disabled:opacity-60"
          >
            {loading ? 'جاري البحث...' : 'استعلام عن الشهادات'}
          </button>
        </form>

        {searched && (
          <div className="space-y-5">
            {userCertificates.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-dashed border-stone-300 text-center space-y-2 print:hidden">
                <p className="text-base font-black text-[#630517]">لا توجد شهادات على هذا الحساب</p>
                <p className="text-xs text-stone-500">تأكد من رقم الجوال وكلمة المرور، أو تواصل مع لجنة الموارد البشرية.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <p className="text-sm font-black text-stone-800">
                    لديك {userCertificates.length} {userCertificates.length === 1 ? 'شهادة' : 'شهادات'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setActiveCategory(name)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border ${
                          activeCategory === name
                            ? 'bg-[#630517] text-[#F5D061] border-[#630517]'
                            : 'bg-white text-stone-600 border-stone-200'
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                {visibleCertificates.map((cert) => (
                  <article key={cert.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#630517] text-white print:bg-white print:text-[#630517]">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${categoryTone(cert.category)} bg-white`}>
                        {cert.category}
                      </span>
                      <span className="text-[11px] font-bold text-white/80 print:text-stone-500">
                        {formatCertDate(cert.issueDate)}
                      </span>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5 text-center">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-stone-500">جامعة حفر الباطن • كلية التمريض • نادي التمريض</p>
                        <h2 className="text-xl font-black text-[#630517]">{cert.certTitle}</h2>
                      </div>

                      <div className="space-y-2 py-4 border-y border-stone-100">
                        <p className="text-xs font-bold text-stone-500">المكرم / المكرمة</p>
                        <h3 className="text-2xl font-black text-stone-900">{cert.recipientName}</h3>
                        <p className="text-xs font-black">
                          التصنيف:{' '}
                          <span className={`inline-block mt-1 px-3 py-1 rounded-full border ${categoryTone(cert.category)}`}>
                            {cert.category}
                          </span>
                        </p>
                        {cert.description && (
                          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">{cert.description}</p>
                        )}
                      </div>

                      {cert.image && (
                        isPdfFile(cert.image) ? (
                          <a
                            href={cert.image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-stone-100 text-[#630517] text-xs font-black"
                          >
                            فتح ملف الشهادة PDF
                          </a>
                        ) : (
                          <img
                            src={cert.image}
                            alt={cert.certTitle}
                            className="max-h-96 mx-auto rounded-2xl shadow-md border border-stone-200 object-contain"
                          />
                        )
                      )}

                      <div className="flex justify-center gap-3 flex-wrap print:hidden">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-6 py-3 rounded-xl bg-[#630517] text-[#F5D061] font-black text-xs shadow hover:brightness-110"
                        >
                          طباعة الشهادة
                        </button>
                        {cert.image && (
                          <a
                            href={cert.image}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 rounded-xl bg-[#F5D061] text-[#630517] font-black text-xs shadow"
                          >
                            تحميل الملف
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </>
            )}
          </div>
        )}

        <p className="text-center text-[11px] text-stone-400 print:hidden">
          <Link href="/" className="font-bold text-[#630517]">العودة للرئيسية</Link>
        </p>
      </div>
    </main>
  );
}
