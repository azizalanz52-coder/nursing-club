import { Firestore, doc, getDoc } from 'firebase/firestore';
import { ADMIN_PHONE, isAdminPhone, isPrivilegedRole } from './authIdentity';
import { committeeIdFromName, sameMemberName } from './memberAcceptance';

export const PARTNERSHIP_PROPOSAL_DOC = ['pr_documents', 'partnership_proposal'] as const;

export type ProposalCard = { title: string; body: string };

export type ProposalSection = {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
  paragraphs?: string[];
  callout?: string;
  cards?: ProposalCard[];
  tableHeaders?: string[];
  tableRows?: string[][];
  steps?: string[];
  outro?: string;
};

export type PartnershipProposal = {
  coverBadge: string;
  coverTitle: string;
  coverLead: string;
  coverSub: string;
  metaFrom: string;
  metaTo: string;
  metaSite: string;
  metaSocial: string;
  tocTitle: string;
  tocIntro: string;
  sections: ProposalSection[];
  contactTitle: string;
  contactBody: string;
  nextStep: string;
  footerNote: string;
};

export type PartnershipLeaders = {
  maleLeader: string;
  femaleLeader: string;
};

export const DEFAULT_PARTNERSHIP_PROPOSAL: PartnershipProposal = {
  coverBadge: 'لجنة العلاقات العامة • Partnership Proposal',
  coverTitle: 'مقترح الشراكة والرعاية',
  coverLead:
    'دعوة للجهات الرائدة للشراكة مع نادي التمريض في جامعة حفر الباطن، مع وضوح كامل لما يظهر للطلاب وما يعود على الراعي مقابل دعمه.',
  coverSub: 'كلية التمريض • جامعة حفر الباطن',
  metaFrom: 'لجنة العلاقات العامة – نادي التمريض',
  metaTo: 'الشركاء والرعاة والجهات الداعمة',
  metaSite: 'nursing-club.vercel.app',
  metaSocial: '@Nurs_club على إكس وتيك توك',
  tocTitle: 'محتويات المقترح',
  tocIntro: 'ملف معدّ للإرسال للجهة كما هو. يمكن تعديل النصوص من بوابة قائد وقائدة اللجنة ثم حفظها وتحميلها PDF.',
  sections: [
    {
      id: 'p1',
      kicker: 'تبويب 01',
      title: 'لماذا هذا المقترح',
      intro:
        'نادي التمريض يبحث عن شركاء يضيفون قيمة حقيقية لطلبة كلية التمريض في جامعة حفر الباطن، وفي الوقت نفسه يحصل الشريك على ظهور واضح، موثّق، وموجّه لجمهور محدد: طلاب وطالبات التمريض ومنظومة أنشطتهم.',
      callout:
        'المبدأ: الدعم لا يبقى مجاملة شفهية. كل راعٍ معتمد يظهر في منصة النادي حسب باقته، ويمكن ربط ظهوره بعرض أو كود خصم يصل للطالب مباشرة، ويُذكر في تقرير الفعالية عند ارتباط الدعم بنشاط محدد.',
      cards: [
        {
          title: 'ما يهم الجهة',
          body: 'جمهور جامعي متخصص في الصحة. ظهور رسمي تحت مظلة نادي كلية التمريض. قناة رقمية دائمة وليست منشوراً يختفي. توثيق مكتوب للدعم عند الفعاليات.',
        },
        {
          title: 'ما يهم الطالب',
          body: 'خصم أو عرض واضح على بطاقة الشريك. كود يُنسخ بنقرة من صفحة النادي. ربط الجهة بفعالية أو خدمة تفيده فعلياً.',
        },
      ],
    },
    {
      id: 'p2',
      kicker: 'تبويب 02',
      title: 'من نحن',
      intro:
        'نادي التمريض بجامعة حفر الباطن مجتمع طلابي يطوّر المعرفة، يبني المهارات القيادية، ويصنع أثراً مهنياً ومجتمعياً. يعمل عبر سبع لجان، ومنصة إلكترونية تجمع الفعاليات، والنشرة الأكاديمية، والشهادات، وجدار الشركاء.',
      cards: [
        { title: 'رؤيتنا', body: 'الريادة والتميز في إعداد كوادر تمريضية قيادية ومؤثرة مجتمعياً واهتماماً بالمهنة.' },
        { title: 'رسالتنا', body: 'تمكين الأعضاء وتنمية مهاراتهم عبر برامج وفعاليات نوعية وثقافية متقدمة.' },
      ],
      tableHeaders: ['البيان', 'التفاصيل'],
      tableRows: [
        ['الجهة', 'نادي التمريض – كلية التمريض – جامعة حفر الباطن'],
        ['الهوية', 'NURSS'],
        ['مؤشرات معلنة على المنصة', '+200 عضو • +15 فعالية في السنة • أكثر من عامين من العطاء'],
        ['اللجان', 'التصميم، الإعلام، تنظيم الفعاليات، الموارد البشرية، العلاقات العامة، المحتوى العلمي، الجودة والتطوير'],
        ['المنصة', 'https://nursing-club.vercel.app'],
      ],
    },
    {
      id: 'p3',
      kicker: 'تبويب 03',
      title: 'الجمهور وقنوات الوصول',
      intro: 'الشراكة لا تُقاس بعدد منشورات فقط. النادي يصل للطالب من أكثر من باب، وكل باب يمكن أن يحمل اسم الجهة أو عرضها حسب الاتفاق.',
      cards: [
        { title: 'طلبة الكلية', body: 'طلاب وطالبات التمريض بمختلف المستويات، عبر الموقع والنشرة ومجتمع الواتساب المعلن.' },
        { title: 'أعضاء اللجان', body: 'أعضاء عاملون ينفّذون الفعاليات ويستقبلون الضيوف ويوثّقون الحضور.' },
        { title: 'زوار الأنشطة', body: 'المشاركون في الملتقيات، حملات التثقيف الصحي، والورش داخل الجامعة ومجتمعها.' },
      ],
      tableHeaders: ['القناة', 'ماذا تصل'],
      tableRows: [
        ['صفحة اكتشف النادي', 'جدار دائم للرعاة حسب التصنيف: استراتيجي / ذهبي / فضي / برونزي.'],
        ['البنر الترحيبي', 'واجهة الموقع الأولى، تُستخدم للمناسبات والشراكات البارزة بالاتفاق.'],
        ['الفعاليات والملصقات', 'ظهور مرتبط بنشاط محدد أمام الحضور وعلى صفحة الفعاليات.'],
        ['النشرة الأكاديمية', 'قناة أسبوعية يفتحها الطالب للجداول والأخبار والمصادر.'],
        ['لجنة الإعلام', 'تغطية صور وفيديو تُحفظ في أرشيف النادي وتُستخدم في المعرض والمنصات.'],
        ['إكس وتيك توك', 'الحساب الرسمي @Nurs_club.'],
        ['الشهادات', 'المشارك يخرج بوثيقة من النادي، فارتباط الجهة بالفعالية يبقى في ذاكرة الطالب.'],
      ],
    },
    {
      id: 'p4',
      kicker: 'تبويب 04',
      title: 'ماذا نقدّم للراعي بالمقابل',
      intro: 'هذا هو جوهر التعاون. الجهة تقدّم الدعم، والنادي يقدّم حضوراً رسمياً داخل منصته وأنشطته وفق الباقة المتفق عليها.',
      cards: [
        { title: 'الظهور الرقمي الدائم', body: 'شعار الجهة أو مقطع تعريفي على جدار شركاء النجاح والرعاة، مع تصنيف الشراكة، ورابط لموقعها أو حساباتها.' },
        { title: 'عرض يصل للطالب مباشرة', body: 'نص العرض أو الخصم يظهر على بطاقة الشريك، مع كود اختياري ينسخه الطالب من الصفحة.' },
        { title: 'ربط الفعالية بالجهة', body: 'عند رعاية نشاط محدد: ذكر في الملصق، والحضور، وتقرير الجودة الذي يسجّل اسم الجهة ونوع الدعم.' },
        { title: 'التغطية الإعلامية', body: 'لجنة الإعلام توثّق الفعالية بالصورة والفيديو. الحسابات الرسمية تنقل الحضور بعد التنسيق.' },
        { title: 'الاستقبال والتنويه', body: 'لجنة العلاقات العامة تتولى التنسيق الخارجي واستقبال ممثلي الجهة في المناسبات المتفق عليها.' },
        { title: 'أثر مكتوب', body: 'تقارير الفعاليات لدى لجنة الجودة تُبقي اسم الراعي ضمن سجل النشاط، لا ضمن رسالة شكر تُنسى.' },
      ],
    },
    {
      id: 'p5',
      kicker: 'تبويب 05',
      title: 'باقات الشراكة',
      intro: 'التصنيفات التالية هي المعتمدة داخل المنصة. حجم الدعم ونوعه يُحدَّدان بالاتفاق حسب طبيعة الجهة.',
      tableHeaders: ['الباقة', 'الظهور على المنصة', 'ما يعود على الجهة'],
      tableRows: [
        ['شريك استراتيجي', 'المستوى الأعلى في جدار الشركاء مع الرعاة الذهبيين.', 'شعار أو فيديو، عرض وكود للطلاب، رابط رسمي، أولوية في البنر والمناسبات الكبرى، وتنويه أوضح في التغطية والتقارير المرتبطة.'],
        ['راعي ذهبي', 'قسم الرعاة الذهبيين.', 'شعار، عرض وكود، ربط بفعالية حسب الاتفاق، وتغطية إعلامية للنشاط المدعوم.'],
        ['راعي فضي', 'قسم الرعاة الفضيين.', 'شعار ورابط، مع عرض اختياري للطلاب، وإشارة في المواد ذات الصلة.'],
        ['راعي برونزي', 'جدار الرعاة البرونزيين والشركاء.', 'شعار رسمي وشكر معلن على المنصة.'],
        ['جهة داعمة', 'ظهور داعم ضمن الشركاء.', 'توثيق الدعم العيني أو الخدمي مع شكر يناسب حجم المساهمة.'],
      ],
      callout: 'مرونة الاتفاق: يمكن دمج أكثر من بند، مثل رعاية فعالية محددة مع بقاء الشعار على الجدار طوال الفصل.',
    },
    {
      id: 'p6',
      kicker: 'تبويب 06',
      title: 'كيف تظهر الجهة على المنصة',
      intro: 'بعد اعتماد الشراكة تُنشأ بطاقة للجهة في صفحة اكتشف النادي، ويراها الزائر ضمن شركاء النجاح.',
      cards: [
        { title: 'محتوى البطاقة', body: 'اسم الجهة، تصنيف الباقة، الشعار أو مقطع قصير، وصف العرض أو الخصم، كود الخصم إن وُجد، ورابط الموقع أو الحساب.' },
        { title: 'ماذا يفعل الطالب', body: 'يفتح صفحة اكتشف النادي، يرى الجهة حسب مستواها، يقرأ العرض، وينسخ الكود إن كان مفعّلاً.' },
      ],
      outro: 'البطاقة تبقى ما دامت الشراكة سارية، ويمكن تعديل العرض أو الكود لاحقاً دون إعادة بناء الاتفاق من الصفر.',
    },
    {
      id: 'p7',
      kicker: 'تبويب 07',
      title: 'مسار التعاون من أول تواصل حتى النشر',
      steps: [
        'تواصل لجنة العلاقات العامة',
        'تسجيل الجهة في سجل الشراكات',
        'الاتفاق على الباقة ونوع الدعم',
        'اعتماد الظهور والعرض والكود',
        'النشر للطلاب والتغطية والتقرير',
      ],
      cards: [
        { title: 'سجل داخلي منظم', body: 'اللجنة توثّق اسم الجهة، مسؤول التواصل، ورقم الاتصال، وحالة الملف: قيد المراجعة، موافقة، أو اعتذار. الهدف منع تكرار الزيارة على الجهة نفسها من أكثر من عضو.' },
        { title: 'النشر للطلاب منفصل عن التفاوض', body: 'ما يظهر للعامة هو البطاقة المعتمدة فقط. تفاصيل التفاوض تبقى داخل اللجنة حتى يكتمل الاتفاق.' },
      ],
    },
    {
      id: 'p8',
      kicker: 'تبويب 08',
      title: 'نماذج دعم تقبلها الشراكة',
      intro: 'النادي لا يحصر التعاون في مبلغ نقدي. أي دعم يخدم الطالب أو يسهّل فعالية يمكن أن يتحول إلى باقة ظهور مناسبة.',
      cards: [
        { title: 'رعاية فعالية', body: 'تغطية تكاليف نشاط، استراحة، ضيافة، جوائز، أو مستلزمات ميدانية.' },
        { title: 'خصم للطلبة', body: 'عرض دائم أو موسمي على منتجات أو خدمات الجهة بكود معلن.' },
        { title: 'دعم عيني', body: 'مستلزمات صحية، قرطاسية، ضيافة، أو خدمات تصوير وطباعة.' },
        { title: 'خبرة أو تدريب', body: 'ورشة، استضافة مختص، أو محتوى يفيد المسار الأكاديمي للطالب.' },
        { title: 'حضور مجتمعي', body: 'المشاركة في حملات التثقيف الصحي داخل الجامعة أو المدينة.' },
        { title: 'شراكة ممتدة', body: 'اتفاق فصل دراسي أو عام كامل مع بقاء البطاقة على المنصة.' },
      ],
    },
    {
      id: 'p9',
      kicker: 'تبويب 09',
      title: 'التواصل والخطوة التالية',
      intro: 'نرحب بتواصل الجهات الجادة. لجنة العلاقات العامة هي نقطة التنسيق الرسمية للشراكات.',
      cards: [
        { title: 'للتواصل', body: 'لجنة العلاقات العامة – نادي التمريض\nجامعة حفر الباطن – كلية التمريض\nالموقع: https://nursing-club.vercel.app\nإكس وتيك توك: @Nurs_club\nواتساب النادي: 0553731265' },
        { title: 'ماذا نحتاج من الجهة في أول رد؟', body: 'اسم الجهة كما سيظهر للطلاب. الشعار بصيغة واضحة. نوع الدعم المقترح أو العرض للطلبة. كود الخصم إن كان جاهزاً. اسم مسؤول التواصل ورقم الجوال.' },
      ],
    },
  ],
  contactTitle: 'الخطوة التالية',
  contactBody: 'ردّكم على هذا المقترح يكفي لفتح ملف رسمي في سجل الشراكات، وتحديد الباقة المناسبة، ثم نشر البطاقة للطلاب بعد الاتفاق.',
  nextStep: 'ردّكم على هذا المقترح يكفي لفتح ملف رسمي في سجل الشراكات، وتحديد الباقة المناسبة، ثم نشر البطاقة للطلاب بعد الاتفاق.',
  footerNote:
    'أُعدّ هذا المقترح لإرساله للرعاة والشركاء من لجنة العلاقات العامة في نادي التمريض بجامعة حفر الباطن. حجم الدعم يُحدَّد بالاتفاق مع كل جهة.',
};

export function normalizePartnershipProposal(raw?: Partial<PartnershipProposal> | null): PartnershipProposal {
  const base = DEFAULT_PARTNERSHIP_PROPOSAL;
  if (!raw) return structuredClone(base);
  const sections = Array.isArray(raw.sections) && raw.sections.length ? raw.sections : base.sections;
  return {
    ...base,
    ...raw,
    sections: sections.map((section) => ({
      id: section.id || `s-${Date.now()}`,
      kicker: section.kicker || '',
      title: section.title || '',
      intro: section.intro || '',
      callout: section.callout || '',
      outro: section.outro || '',
      paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs : [],
      cards: Array.isArray(section.cards) ? section.cards : [],
      tableHeaders: Array.isArray(section.tableHeaders) ? section.tableHeaders : undefined,
      tableRows: Array.isArray(section.tableRows) ? section.tableRows : undefined,
      steps: Array.isArray(section.steps) ? section.steps : undefined,
    })),
  };
}

export const PLATFORM_BRIEFING_STORAGE_KEY = 'UHB_PLATFORM_BRIEFING';
export const PARTNERSHIP_PROPOSAL_STORAGE_KEY = 'UHB_PARTNERSHIP_PROPOSAL';

export function sanitizeBriefingForFirestore(
  proposal: PartnershipProposal,
  extra: Record<string, unknown> = {}
) {
  return JSON.parse(JSON.stringify({ ...proposal, ...extra })) as Record<string, unknown>;
}

export function readBriefingLocal(key: string): (PartnershipProposal & { updatedAt?: number }) | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PartnershipProposal & { updatedAt?: number };
  } catch {
    return null;
  }
}

export function writeBriefingLocal(key: string, payload: Record<string, unknown>) {
  localStorage.setItem(key, JSON.stringify(payload));
}

export function pickNewerBriefing(
  cloud: (PartnershipProposal & { updatedAt?: number }) | null,
  local: (PartnershipProposal & { updatedAt?: number }) | null
) {
  const cloudAt = Number(cloud?.updatedAt || 0);
  const localAt = Number(local?.updatedAt || 0);
  if (local && localAt >= cloudAt) return local;
  return cloud;
}

export async function loadPrLeaders(db: Firestore): Promise<PartnershipLeaders> {
  try {
    const snap = await getDoc(doc(db, 'committees', 'pr'));
    if (snap.exists()) {
      const data = snap.data();
      return {
        maleLeader: String(data.maleLeader || ''),
        femaleLeader: String(data.femaleLeader || ''),
      };
    }
  } catch (err) {
    console.error(err);
  }
  return { maleLeader: '', femaleLeader: '' };
}

export async function canManagePartnershipProposal(
  db: Firestore,
  phone: string,
  userData?: Record<string, unknown> | null
) {
  const role = String(userData?.role || '');
  const assigned = String(userData?.assignedCommittee || userData?.committee || '');
  const fullName = String(userData?.fullName || '');

  if (isAdminPhone(phone) || phone === ADMIN_PHONE) return true;
  if (isPrivilegedRole(role)) return true;

  const leaders = await loadPrLeaders(db);
  if (sameMemberName(leaders.maleLeader, fullName) || sameMemberName(leaders.femaleLeader, fullName)) {
    return true;
  }

  const leaderRole = /رئيس لجنة|رئيسة لجنة|قائد|قائدة/.test(role);
  return leaderRole && committeeIdFromName(assigned) === 'pr';
}

function esc(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>');
}

export function printClubBriefing(
  proposal: PartnershipProposal,
  chips: { label: string; value: string }[]
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('اسمح بالنوافذ المنبثقة لحفظ الملف PDF.');
  }

  const sectionsHtml = proposal.sections
    .map((section) => {
      const cards = (section.cards || [])
        .map((card) => `<article class="card"><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p></article>`)
        .join('');
      const steps = (section.steps || [])
        .map((step, i) => `<div class="step"><b>${i + 1}</b><span>${esc(step)}</span></div>`)
        .join('');
      const table =
        section.tableHeaders && section.tableRows
          ? `<table><thead><tr>${section.tableHeaders.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${section.tableRows
              .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
              .join('')}</tbody></table>`
          : '';
      return `<section class="chapter">
        <p class="kicker">${esc(section.kicker)}</p>
        <h2>${esc(section.title)}</h2>
        ${section.intro ? `<p>${esc(section.intro)}</p>` : ''}
        ${(section.paragraphs || []).filter(Boolean).map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}
        ${section.callout ? `<div class="callout">${esc(section.callout)}</div>` : ''}
        ${cards ? `<div class="grid">${cards}</div>` : ''}
        ${steps ? `<div class="flow">${steps}</div>` : ''}
        ${table}
        ${section.outro ? `<p class="small">${esc(section.outro)}</p>` : ''}
      </section>`;
    })
    .join('');

  printWindow.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
    <meta charset="utf-8" />
    <title>${esc(proposal.coverTitle)}</title>
    <style>
      body { margin:0; font-family: Tahoma, "Segoe UI", sans-serif; color:#1f1316; background:#fffaf3; }
      .no-print { padding:12px; text-align:center; background:#630517; }
      .no-print button { background:#F5D061; color:#3b020b; border:0; border-radius:10px; padding:10px 18px; font-weight:700; cursor:pointer; }
      .cover { background:linear-gradient(165deg,#2a050c 0%,#630517 48%,#1a0208 100%); color:#fff; padding:48px 28px 28px; }
      .eyebrow { display:inline-block; border:1px solid rgba(245,208,97,.5); color:#F5D061; border-radius:999px; padding:6px 14px; font-size:12px; }
      h1 { font-size:32px; margin:12px 0; }
      .lead { color:#FFF3C4; }
      .meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:24px; }
      .chip { background:rgba(255,255,255,.08); border:1px solid rgba(245,208,97,.28); border-radius:12px; padding:10px; font-size:13px; }
      .chip b { display:block; color:#F5D061; }
      .sheet { padding:22px 24px 40px; }
      .kicker { color:#C9A227; font-size:12px; font-weight:700; margin:0 0 4px; }
      h2 { color:#630517; border-bottom:3px solid #F5D061; padding-bottom:6px; }
      h3 { color:#630517; margin:0 0 6px; font-size:15px; }
      .chapter { margin: 0 0 28px; page-break-inside: avoid; }
      .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .card { background:#fff; border:1px solid rgba(99,5,23,.12); border-radius:12px; padding:12px; }
      .callout { background:#fff6d6; border-right:5px solid #F5D061; border-radius:12px; padding:12px; margin:10px 0; }
      table { width:100%; border-collapse:collapse; font-size:13px; }
      th { background:#630517; color:#F5D061; text-align:right; padding:8px; }
      td { padding:8px; border-bottom:1px solid rgba(99,5,23,.12); }
      .flow { display:flex; gap:8px; flex-wrap:wrap; margin:12px 0; }
      .step { flex:1; min-width:110px; background:#fff; border:1px solid rgba(99,5,23,.12); border-radius:12px; padding:10px; text-align:center; }
      .step b { display:block; color:#630517; font-size:18px; }
      .small, .footer { font-size:12px; color:#5c4a4e; }
      @media print { .no-print { display:none !important; } body { background:#fff; } }
    </style>
  </head><body>
    <div class="no-print"><button type="button" onclick="window.print()">حفظ الملف PDF — اختر Save as PDF</button></div>
    <section class="cover">
      <div class="eyebrow">${esc(proposal.coverBadge)}</div>
      <h1>${esc(proposal.coverTitle)}</h1>
      <p class="lead">${esc(proposal.coverLead)}</p>
      <p>${esc(proposal.coverSub)}</p>
      <div class="meta">
        ${chips.map((chip) => `<div class="chip"><b>${esc(chip.label)}</b>${esc(chip.value)}</div>`).join('')}
      </div>
    </section>
    <div class="sheet">
      <p class="kicker">دليل التبويب</p>
      <h2>${esc(proposal.tocTitle)}</h2>
      <p>${esc(proposal.tocIntro)}</p>
      ${sectionsHtml}
      <div class="callout"><strong>${esc(proposal.contactTitle)}:</strong> ${esc(proposal.nextStep || proposal.contactBody)}</div>
      <p class="footer">${esc(proposal.footerNote)}</p>
    </div>
    <script>window.onload = function(){ window.print(); }</script>
  </body></html>`);
  printWindow.document.close();
}

export function printPartnershipProposal(proposal: PartnershipProposal, leaders: PartnershipLeaders) {
  printClubBriefing(proposal, [
    { label: 'مقدّم من', value: proposal.metaFrom },
    { label: 'مقدّم إلى', value: proposal.metaTo },
    { label: 'قائد اللجنة', value: leaders.maleLeader || 'قائد لجنة العلاقات العامة' },
    { label: 'قائدة اللجنة', value: leaders.femaleLeader || 'قائدة لجنة العلاقات العامة' },
  ]);
}
