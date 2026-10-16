'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { findMemberContext } from '../lib/memberAcceptance';
import {
  DEFAULT_PARTNERSHIP_PROPOSAL,
  PARTNERSHIP_PROPOSAL_DOC,
  canManagePartnershipProposal,
  loadPrLeaders,
  normalizePartnershipProposal,
  printPartnershipProposal,
  sanitizeBriefingForFirestore,
  type PartnershipLeaders,
  type PartnershipProposal,
  type ProposalSection,
} from '../lib/partnershipProposal';
import { clubNotice } from '../lib/clubNotice';
import PageLoading from '../components/PageLoading';

function Field({
  editing,
  value,
  onChange,
  multiline,
  label,
  onRemove,
}: {
  editing: boolean;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  label?: string;
  onRemove?: () => void;
}) {
  if (!editing) {
    if (!value) return null;
    return multiline ? (
      <p className="whitespace-pre-line leading-relaxed text-slate-700">{value}</p>
    ) : (
      <span>{value}</span>
    );
  }
  const shared = 'w-full rounded-xl border border-[#F5D061]/50 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-[#630517]';
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between gap-2">
        {label ? <span className="text-[10px] font-bold text-[#630517]">{label}</span> : <span />}
        {onRemove ? (
          <button type="button" onClick={onRemove} className="text-[10px] font-black text-[#630517] bg-[#F5D061]/20 border border-[#F5D061]/50 px-2.5 py-1 rounded-lg">
            حذف {label || 'النص'}
          </button>
        ) : null}
      </span>
      {multiline ? (
        <textarea className={`${shared} min-h-[88px]`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={shared} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export default function PartnershipProposalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [actorName, setActorName] = useState('');
  const [leaders, setLeaders] = useState<PartnershipLeaders>({ maleLeader: '', femaleLeader: '' });
  const [proposal, setProposal] = useState<PartnershipProposal>(DEFAULT_PARTNERSHIP_PROPOSAL);

  useEffect(() => {
    const phone = localStorage.getItem('userPhone') || '';
    const storedName = localStorage.getItem('userName') || '';
    if (!phone) {
      router.push('/login');
      return;
    }

    let unsub: (() => void) | undefined;

    (async () => {
      const context = await findMemberContext(db, phone, storedName);
      const userData = context.data;
      const ok = await canManagePartnershipProposal(db, context.phone || phone, userData);
      if (!ok) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      setActorName(String(userData?.fullName || storedName || 'قائد اللجنة'));
      setLeaders(await loadPrLeaders(db));

      unsub = onSnapshot(doc(db, ...PARTNERSHIP_PROPOSAL_DOC), (snap) => {
        if (snap.exists()) {
          setProposal(normalizePartnershipProposal(snap.data() as PartnershipProposal));
        } else {
          setProposal(structuredClone(DEFAULT_PARTNERSHIP_PROPOSAL));
        }
        setLoading(false);
      }, (err) => {
        console.error(err);
        setProposal(structuredClone(DEFAULT_PARTNERSHIP_PROPOSAL));
        setLoading(false);
      });
    })();

    return () => unsub?.();
  }, [router]);

  const patch = (partial: Partial<PartnershipProposal>) => {
    setProposal((prev) => ({ ...prev, ...partial }));
  };

  const patchSection = (index: number, partial: Partial<ProposalSection>) => {
    setProposal((prev) => {
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], ...partial };
      return { ...prev, sections };
    });
  };

  const deleteSection = (index: number) => {
    setProposal((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
  };

  const addSection = () => {
    setProposal((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `s-${Date.now()}`,
          kicker: `تبويب ${String(prev.sections.length + 1).padStart(2, '0')}`,
          title: 'قسم جديد',
          intro: '',
          paragraphs: [''],
          cards: [],
        },
      ],
    }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setStatus('');
    try {
      await setDoc(
        doc(db, ...PARTNERSHIP_PROPOSAL_DOC),
        sanitizeBriefingForFirestore(proposal, {
          updatedAt: Date.now(),
          updatedBy: actorName,
        })
      );
      setStatus('تم حفظ التعديلات.');
      await clubNotice('تم حفظ ملف الشراكة. تقدر تكمل التعديل أو تحمّل PDF.', 'success', 'تم الحفظ');
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : '';
      setStatus('تعذر الحفظ. سجّل الدخول مرة أخرى ثم أعد المحاولة.');
      await clubNotice(message.includes('permission') ? 'سجّل الدخول مرة أخرى ثم احفظ الملف.' : 'تعذر حفظ الملف. أعد المحاولة.', 'error', 'لم يتم الحفظ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-3">
          <h1 className="text-xl font-black text-[#630517]">ملف خاص بقيادة لجنة العلاقات العامة</h1>
          <p className="text-sm text-slate-600">هذا المقترح يظهر لقائد وقائدة اللجنة فقط، حتى يعدّلوا النصوص قبل إرساله للرعاة.</p>
          <Link href="/committee-dashboard" className="inline-block mt-2 px-5 py-2.5 rounded-2xl bg-[#630517] text-[#F5D061] font-bold text-sm">
            العودة للوحة اللجنة
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf3] pb-16" dir="rtl">
      <div className="sticky top-0 z-20 bg-[#2a050c]/95 backdrop-blur-md border-b border-[#F5D061]/30 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-[#F5D061] font-bold">خاص بقائد وقائدة لجنة العلاقات العامة</p>
            <h1 className="text-lg font-black">ملف مقترح الشراكة والرعاية</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="px-4 py-2 rounded-xl bg-white/10 border border-[#F5D061]/40 text-[#F5D061] text-xs font-black"
            >
              {editing ? 'إلغاء التعديل' : 'تعديل النصوص'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="px-4 py-2 rounded-xl bg-[#F5D061] text-[#3b020b] text-xs font-black disabled:opacity-40"
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            </button>
            <button
              type="button"
              onClick={() => printPartnershipProposal(proposal, leaders)}
              className="px-4 py-2 rounded-xl bg-white text-[#630517] text-xs font-black"
            >
              تحميل PDF
            </button>
            <Link href="/committee-dashboard" className="px-4 py-2 rounded-xl border border-white/20 text-xs font-bold">
              لوحة اللجنة
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white border border-[#F5D061]/40 px-4 py-3">
            <p className="text-[11px] text-slate-500 font-bold">قائد اللجنة</p>
            <p className="font-black text-[#630517]">{leaders.maleLeader || 'غير معيّن في الهيكل'}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#F5D061]/40 px-4 py-3">
            <p className="text-[11px] text-slate-500 font-bold">قائدة اللجنة</p>
            <p className="font-black text-[#630517]">{leaders.femaleLeader || 'غير معيّنة في الهيكل'}</p>
          </div>
        </div>
        {status ? <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">{status}</p> : null}

        <section className="rounded-[1.6rem] overflow-hidden bg-[linear-gradient(165deg,#2a050c_0%,#630517_48%,#1a0208_100%)] text-white p-6 sm:p-8 space-y-4">
          {editing ? (
            <>
              <Field editing value={proposal.coverBadge} onChange={(coverBadge) => patch({ coverBadge })} label="شريط الغلاف" />
              <Field editing value={proposal.coverTitle} onChange={(coverTitle) => patch({ coverTitle })} label="عنوان الملف" />
              <Field editing value={proposal.coverLead} onChange={(coverLead) => patch({ coverLead })} multiline label="مقدمة الغلاف" />
              <Field editing value={proposal.coverSub} onChange={(coverSub) => patch({ coverSub })} label="سطر الكلية" />
            </>
          ) : (
            <>
              <div className="inline-flex px-4 py-1.5 rounded-full border border-[#F5D061]/40 text-[#F5D061] text-xs font-bold">{proposal.coverBadge}</div>
              <h2 className="text-3xl sm:text-4xl font-black">{proposal.coverTitle}</h2>
              <p className="text-[#FFF3C4] leading-relaxed">{proposal.coverLead}</p>
              <p className="text-white/80">{proposal.coverSub}</p>
            </>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-white/10 border border-[#F5D061]/20 p-3 text-sm">
              <p className="text-[#F5D061] text-[11px] font-bold mb-1">مقدّم من</p>
              <Field editing={editing} value={proposal.metaFrom} onChange={(metaFrom) => patch({ metaFrom })} />
            </div>
            <div className="rounded-2xl bg-white/10 border border-[#F5D061]/20 p-3 text-sm">
              <p className="text-[#F5D061] text-[11px] font-bold mb-1">مقدّم إلى</p>
              <Field editing={editing} value={proposal.metaTo} onChange={(metaTo) => patch({ metaTo })} />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-3">
          {editing ? (
            <>
              <Field editing value={proposal.tocTitle} onChange={(tocTitle) => patch({ tocTitle })} label="عنوان الفهرس" />
              <Field editing value={proposal.tocIntro} onChange={(tocIntro) => patch({ tocIntro })} multiline label="مقدمة الفهرس" />
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-[#630517]">{proposal.tocTitle}</h2>
              <p className="text-slate-600">{proposal.tocIntro}</p>
            </>
          )}
          <ol className="space-y-2 text-sm font-bold text-slate-800">
            {proposal.sections.map((section, index) => (
              <li key={section.id} className="flex gap-2 items-center">
                <span className="w-7 h-7 rounded-lg bg-[#630517] text-[#F5D061] flex items-center justify-center text-xs">{index + 1}</span>
                {editing ? (
                  <>
                    <input
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      value={section.title}
                      onChange={(e) => patchSection(index, { title: e.target.value })}
                    />
                    <button type="button" onClick={() => deleteSection(index)} className="text-[10px] font-black text-[#630517] bg-[#F5D061]/20 border border-[#F5D061]/50 px-2.5 py-1 rounded-lg">
                      حذف القسم
                    </button>
                  </>
                ) : (
                  <span>{section.title}</span>
                )}
              </li>
            ))}
          </ol>
          {editing ? (
            <button type="button" onClick={addSection} className="mt-2 px-4 py-2 rounded-xl bg-[#630517] text-[#F5D061] text-xs font-black">
              + إضافة قسم جديد
            </button>
          ) : null}
        </section>

        {proposal.sections.map((section, index) => (
          <section key={section.id} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 space-y-4">
            <p className="text-[11px] font-bold text-[#C9A227]">
              {editing ? (
                <Field editing value={section.kicker} onChange={(kicker) => patchSection(index, { kicker })} label="رقم التبويب" />
              ) : (
                section.kicker
              )}
            </p>
            <h2 className="text-xl font-black text-[#630517] border-b-2 border-[#F5D061] pb-2">
              {editing ? (
                <Field editing value={section.title} onChange={(title) => patchSection(index, { title })} label="عنوان القسم" />
              ) : (
                section.title
              )}
            </h2>
            {(editing || section.intro) && (
              <Field editing={editing} value={section.intro || ''} onChange={(intro) => patchSection(index, { intro })} multiline label={editing ? 'نص القسم' : undefined} onRemove={editing ? () => patchSection(index, { intro: '' }) : undefined} />
            )}
            {(section.paragraphs || []).map((paragraph, paragraphIndex) => (
              (editing || paragraph) ? (
                <Field
                  key={`${section.id}-p-${paragraphIndex}`}
                  editing={editing}
                  value={paragraph}
                  onChange={(next) => {
                    const paragraphs = [...(section.paragraphs || [])];
                    paragraphs[paragraphIndex] = next;
                    patchSection(index, { paragraphs });
                  }}
                  multiline
                  label={editing ? `فقرة ${paragraphIndex + 1}` : undefined}
                  onRemove={editing ? () => patchSection(index, { paragraphs: (section.paragraphs || []).filter((_, i) => i !== paragraphIndex) }) : undefined}
                />
              ) : null
            ))}
            {editing ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => patchSection(index, { paragraphs: [...(section.paragraphs || []), ''] })} className="px-3 py-2 rounded-xl border border-[#F5D061] text-[#630517] text-[11px] font-black">
                  + إضافة فقرة
                </button>
                <button type="button" onClick={() => patchSection(index, { cards: [...(section.cards || []), { title: 'عنوان جديد', body: '' }] })} className="px-3 py-2 rounded-xl border border-[#F5D061] text-[#630517] text-[11px] font-black">
                  + إضافة بطاقة
                </button>
                <button type="button" onClick={() => deleteSection(index)} className="px-3 py-2 rounded-xl border border-[#F5D061] text-[#630517] text-[11px] font-black">
                  حذف هذا القسم
                </button>
              </div>
            ) : null}
            {(editing || section.callout) && (
              <div className="bg-[#fff6d6] border-r-4 border-[#F5D061] rounded-2xl p-4">
                <Field editing={editing} value={section.callout || ''} onChange={(callout) => patchSection(index, { callout })} multiline label={editing ? 'إبراز' : undefined} />
              </div>
            )}
            {section.cards?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.cards.map((card, cardIndex) => (
                  <article key={`${section.id}-card-${cardIndex}`} className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    {editing ? (
                      <>
                        <div className="flex justify-end">
                          <button type="button" onClick={() => patchSection(index, { cards: (section.cards || []).filter((_, i) => i !== cardIndex) })} className="text-[10px] font-black text-[#630517] bg-[#F5D061]/20 border border-[#F5D061]/50 px-2.5 py-1 rounded-lg">
                            حذف البطاقة
                          </button>
                        </div>
                        <Field editing value={card.title} onChange={(title) => {
                          const cards = [...(section.cards || [])];
                          cards[cardIndex] = { ...cards[cardIndex], title };
                          patchSection(index, { cards });
                        }} label="عنوان البطاقة" />
                        <Field editing value={card.body} onChange={(body) => {
                          const cards = [...(section.cards || [])];
                          cards[cardIndex] = { ...cards[cardIndex], body };
                          patchSection(index, { cards });
                        }} multiline label="نص البطاقة" />
                      </>
                    ) : (
                      <>
                        <h3 className="font-black text-[#630517]">{card.title}</h3>
                        <p className="text-sm text-slate-600 whitespace-pre-line">{card.body}</p>
                      </>
                    )}
                  </article>
                ))}
              </div>
            ) : null}
            {section.steps?.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {section.steps.map((step, stepIndex) => (
                  <div key={`${section.id}-step-${stepIndex}`} className="rounded-2xl border border-slate-200 p-3 text-center">
                    <b className="block text-[#630517] text-lg">{stepIndex + 1}</b>
                    {editing ? (
                      <textarea
                        className="w-full text-xs rounded-lg border border-slate-200 p-2"
                        value={step}
                        onChange={(e) => {
                          const steps = [...(section.steps || [])];
                          steps[stepIndex] = e.target.value;
                          patchSection(index, { steps });
                        }}
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-600">{step}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {section.tableHeaders && section.tableRows ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#630517] text-[#F5D061]">
                      {section.tableHeaders.map((header, headerIndex) => (
                        <th key={`${section.id}-h-${headerIndex}`} className="p-2 text-right">
                          {editing ? (
                            <input
                              className="w-full bg-transparent border-b border-[#F5D061]/40"
                              value={header}
                              onChange={(e) => {
                                const tableHeaders = [...(section.tableHeaders || [])];
                                tableHeaders[headerIndex] = e.target.value;
                                patchSection(index, { tableHeaders });
                              }}
                            />
                          ) : (
                            header
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.tableRows.map((row, rowIndex) => (
                      <tr key={`${section.id}-r-${rowIndex}`} className="odd:bg-amber-50/70">
                        {row.map((cell, cellIndex) => (
                          <td key={`${section.id}-c-${rowIndex}-${cellIndex}`} className="p-2 border-b border-slate-100 align-top">
                            {editing ? (
                              <textarea
                                className="w-full text-xs rounded-lg border border-slate-200 p-2"
                                value={cell}
                                onChange={(e) => {
                                  const tableRows = (section.tableRows || []).map((r) => [...r]);
                                  tableRows[rowIndex][cellIndex] = e.target.value;
                                  patchSection(index, { tableRows });
                                }}
                              />
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {(editing || section.outro) && (
              <Field editing={editing} value={section.outro || ''} onChange={(outro) => patchSection(index, { outro })} multiline label={editing ? 'خاتمة القسم' : undefined} />
            )}
          </section>
        ))}

        <section className="bg-[#fff6d6] rounded-3xl border border-[#F5D061]/50 p-5 sm:p-7 space-y-3">
          {editing ? (
            <>
              <Field editing value={proposal.contactTitle} onChange={(contactTitle) => patch({ contactTitle })} label="عنوان الختام" />
              <Field editing value={proposal.nextStep} onChange={(nextStep) => patch({ nextStep })} multiline label="الخطوة التالية" />
              <Field editing value={proposal.footerNote} onChange={(footerNote) => patch({ footerNote })} multiline label="تذييل الملف" />
            </>
          ) : (
            <>
              <h2 className="text-xl font-black text-[#630517]">{proposal.contactTitle}</h2>
              <p className="text-slate-700 leading-relaxed">{proposal.nextStep}</p>
              <p className="text-xs text-slate-500">{proposal.footerNote}</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
