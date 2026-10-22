import { Firestore, collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { riyadhParts } from './caseStudy';

export const NEWSLETTERS_COL = 'site_newsletters';

export const NEWS_CAT = {
  club: 'أخبار النادي الأسبوعية',
  scfhs: 'مصادر اختبار الهيئة',
  college: 'تحديثات كلية التمريض',
  tips: 'نصائح دراسية',
  exams: 'جداول الاختبارات',
} as const;

export type NewsType = 'article' | 'exam-schedule';
export type NewsCadence = 'daily' | 'monthly' | 'always';
export type Weekday = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export type ExamEntry = {
  course: string;
  courseCode?: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
};

export type NewsletterItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  link?: string;
  date: string;
  image: string;
  type?: NewsType;
  featured?: boolean;
  examCohort?: string;
  examSemester?: string;
  exams?: ExamEntry[];
  cadence?: NewsCadence;
  weekday?: Weekday;
  monthKey?: string;
  slot?: number;
};

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  Sun: 'الأحد',
  Mon: 'الاثنين',
  Tue: 'الثلاثاء',
  Wed: 'الأربعاء',
  Thu: 'الخميس',
  Fri: 'الجمعة',
  Sat: 'السبت',
};

const WEEKDAYS: Weekday[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function cadenceForCategory(category: string): NewsCadence {
  if (category === NEWS_CAT.tips) return 'daily';
  if (category === NEWS_CAT.club) return 'monthly';
  return 'always';
}

export function riyadhMonthKey(ms = Date.now()) {
  return riyadhParts(ms).ymd.slice(0, 7);
}

export function formatMonthKey(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  return new Date(`${monthKey}-01T12:00:00+03:00`).toLocaleDateString('ar-EG', {
    timeZone: 'Asia/Riyadh',
    month: 'long',
    year: 'numeric',
  });
}

export const DEFAULT_NEWS_IMAGE = '/nurs-wordmark.png';

export function isPlaceholderImage(image?: string) {
  const src = String(image || '').trim();
  return !src || src === '/logo.png' || src.endsWith('/logo.png') || src.includes('nurs-wordmark');
}

export function newsCoverSrc(image?: string) {
  return isPlaceholderImage(image) ? DEFAULT_NEWS_IMAGE : String(image);
}

function article(partial: Omit<NewsletterItem, 'image'> & { image?: string }): NewsletterItem {
  return {
    type: 'article',
    featured: false,
    link: '',
    exams: [],
    examCohort: '',
    examSemester: '',
    ...partial,
    image: partial.image || DEFAULT_NEWS_IMAGE,
  };
}

export const DEFAULT_NEWSLETTER_ITEMS: NewsletterItem[] = [
  article({
    id: 'tip-sun',
    title: 'استرجع قبل أن تعيد القراءة',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Sun',
    date: '2026-10-01',
    content:
      'ابدأ المذاكرة بسؤال نفسك: ماذا أتذكر من المحاضرة بدون فتح الملزمة؟ اكتب ثلاث نقاط، ثم ارجع للنص وسدّ الفجوات. الاسترجاع النشط أثبت من تلوين الصفحات. مناسب لمقررات أساسيات التمريض والتقييم الصحي.',
  }),
  article({
    id: 'tip-mon',
    title: 'حوّل الحالة إلى قرار تمريضي',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Mon',
    date: '2026-10-02',
    content:
      'بعد كل سيناريو اسأل: ما الأولوية؟ ما العلامة الحمراء؟ ماذا أبلّغ الطبيب ومتى؟ اربط الأعراض بالتدخل، لا بالحفظ الأصم. هذا أسلوب أسئلة الهيئة ودراسة الحالة في النادي.',
  }),
  article({
    id: 'tip-tue',
    title: 'باعد المراجعة على أيام',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Tue',
    date: '2026-10-03',
    content:
      'المادة الصعبة تُراجع بعد يوم، ثم بعد ثلاثة أيام، ثم بعد أسبوع. لا تجمع الطب الباطني والجراحة في ليلة واحدة. التباعد يحفظ الدواء والعلامات الحيوية أفضل من الحفظ المكثف قبل الاختبار.',
  }),
  article({
    id: 'tip-wed',
    title: 'تمرّن بأسئلة اختيار من متعدد',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Wed',
    date: '2026-10-04',
    content:
      'اختبار الرخصة يقيس التطبيق لا الحفظ. حلّ مجموعة أسئلة ثم سجّل لماذا أخطأت: مفهوم ناقص أم تسرّع في القراءة. أعد الأسئلة الخاطئة بعد يومين. راجع مصادر الهيئة الرسمية لا الملخصات المجهولة.',
  }),
  article({
    id: 'tip-thu',
    title: 'دفتر سريري صغير يكفي',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Thu',
    date: '2026-10-05',
    content:
      'بعد كل تدريب عملي سجّل: الحالة، العلامة الأهم، التدخل، وما لن تنساه في المرة القادمة. خمس جمل أوضح من ملزمة طويلة. اربط المهارات بالمحاضرة في نفس الأسبوع.',
  }),
  article({
    id: 'tip-fri',
    title: 'راحة قصيرة ثم مراجعة خفيفة',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Fri',
    date: '2026-10-06',
    content:
      'الجمعة ليست للإرهاق. نم كفاية، وامشِ، وراجع بطاقات سريعة فقط: جرعات شائعة، علامات الصدمة، احتياطات العزل. العقل المرتاح يستوعب أكثر من ساعات إضافية بلا تركيز.',
  }),
  article({
    id: 'tip-sat',
    title: 'أغلق الأسبوع بأخطائك',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Sat',
    date: '2026-10-07',
    content:
      'اجمع أسئلة الأسبوع الخاطئة في صفحة واحدة. لكل سؤال: المفهوم الصحيح ومشتت واحد وقعت فيه. هذه الصفحة هي أقصر طريق لمراجعة منتصف الفصل واختبار الهيئة لاحقاً.',
  }),
  article({
    id: 'tip-sun-2',
    title: 'صنّف لا تكدّس الملزمة',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Sun',
    date: '2026-10-08',
    content:
      'بعد المحاضرة قسّم الصفحة إلى ثلاث خانات: مفهوم، علامة سريرية، تدخل تمريضي. التصنيف أوضح من تظليل طويل، ويعطيك خريطة تُستخدم في الاختبار وفي دراسة الحالة.',
  }),
  article({
    id: 'tip-sun-3',
    title: 'علّم زميلاً في خمس دقائق',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Sun',
    date: '2026-10-15',
    content:
      'اشرح لزميل مفهوماً واحداً بصوت عالٍ. إن تعثرت فالفجوة عندك. التعليم أقصر طريق لتثبيت التقييم الصحي والدواء قبل أن تنساهما في التدريب.',
  }),
  article({
    id: 'tip-mon-2',
    title: 'ابدأ بـ ABC ثم القرار',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Mon',
    date: '2026-10-09',
    content:
      'في أي حالة: مجرى الهواء، التنفس، الدورة. لا تنتقل للتفاصيل قبل استقرار الأساسيات. هذا ترتيب أسئلة الأولوية في الهيئة وفي السيناريوهات السريرية.',
  }),
  article({
    id: 'tip-mon-3',
    title: 'دقيقة واحدة للحالة',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Mon',
    date: '2026-10-16',
    content:
      'اقرأ السيناريو، أغلق الورقة، وقل القرار في جملة واحدة. بعدها راجع النموذج. السرعة مع الوضوح مهارة اختبار، لا تقل عن الحفظ.',
  }),
  article({
    id: 'tip-tue-2',
    title: 'المختبر يغيّر الخطة',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Tue',
    date: '2026-10-10',
    content:
      'لا تحفظ الرقم لوحده. اسأل: ماذا يفعل الممرض إذا ارتفع البوتاسيوم؟ إذا انخفض السكر؟ اربط القيمة بالتدخل والمراقبة لا بالملصق على الملزمة.',
  }),
  article({
    id: 'tip-tue-3',
    title: 'بطاقات للجرعات الشائعة',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Tue',
    date: '2026-10-17',
    content:
      'عشر بطاقات تكفي للبداية: إنسولين، هيبارين، مورفين، أدرينالين. الوجه: الدواء. الظهر: الاستخدام والعلامة التي توقف الجرعة. راجعها في الفراغات القصيرة.',
  }),
  article({
    id: 'tip-wed-2',
    title: 'اقرأ آخر السطر في السؤال',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Wed',
    date: '2026-10-11',
    content:
      'أسئلة الاختيار غالباً تخفي الكلمة الحاسمة في النهاية: أولاً، الأكثر أماناً، ما يجب تجنبه. ضع خطاً تحتها قبل النظر إلى الخيارات.',
  }),
  article({
    id: 'tip-wed-3',
    title: 'استبعد خيارين ثم قرر',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Wed',
    date: '2026-10-18',
    content:
      'شطب المستحيل يضيّق القرار. لا تخمّن من أول قراءة. أسلوب الهيئة يحاسب على التمييز بين ما هو صحيح وما هو الأكثر صحة.',
  }),
  article({
    id: 'tip-thu-2',
    title: 'العزل قبل الإجراء',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Thu',
    date: '2026-10-12',
    content:
      'قبل أي مهارة اسأل: ما احتياط العزل؟ ماذا ألبس؟ ماذا أنظف؟ سلامة المريض وسلامتك جزء من الكفاءة السريرية، لا خطوة تُؤجَّل.',
  }),
  article({
    id: 'tip-thu-3',
    title: 'جملة تواصل واحدة مع المريض',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Thu',
    date: '2026-10-19',
    content:
      'درّب نفسك على جملة: ماذا ستفعل، لماذا، وماذا يتوقع المريض. التواصل مهارة تُقاس في التدريب وفي أسئلة الإدارة والأخلاقيات.',
  }),
  article({
    id: 'tip-fri-2',
    title: 'حضّر يوم التدريب من الليلة',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Fri',
    date: '2026-10-13',
    content:
      'راجع تشخيص القسم، الأدوية المتكررة، وموانع الإجراء. تدخل الصباح وأنت تعرف المشهد أوضح من أن تفتح الملزمة بين المرضى.',
  }),
  article({
    id: 'tip-fri-3',
    title: 'لا تذاكر وأنت منهك',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Fri',
    date: '2026-10-20',
    content:
      'ساعة بتركيز بعد راحة أفضل من ثلاث ساعات مشتتة. النوم جزء من الاستعداد السريري، لا مكافأة تُؤجَّل بعد الإرهاق.',
  }),
  article({
    id: 'tip-sat-2',
    title: 'طابق مراجعتك مع محاور الهيئة',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Sat',
    date: '2026-10-14',
    content:
      'أساسيات، تمريض بالغين، أم وطفل، إدارة. وزّع أخطاء الأسبوع على هذه المحاور لتعرف أين تضعف قبل الاختبار لا بعده.',
  }),
  article({
    id: 'tip-sat-3',
    title: 'ثلاث نقاط للأسبوع القادم',
    category: NEWS_CAT.tips,
    cadence: 'daily',
    weekday: 'Sat',
    date: '2026-10-21',
    content:
      'اختر أضعف ثلاث نقاط، وحدد لها موعد مراجعة قصير. خطة صغيرة تُنفَّذ خير من جدول مثالي يُترك على الغلاف.',
  }),
  article({
    id: 'scfhs-official',
    title: 'الموقع الرسمي للهيئة السعودية للتخصصات الصحية',
    category: NEWS_CAT.scfhs,
    cadence: 'always',
    date: '2026-10-01',
    featured: true,
    link: 'https://scfhs.org.sa',
    content:
      'المصدر الأول لأي تحديث في التصنيف، الرخصة، واللوائح. ادخل من هنا قبل أي ملخص خارجي، وتابع إعلانات اختبارات الممارسة المهنية لخريجي التمريض.',
  }),
  article({
    id: 'scfhs-mumaris',
    title: 'ممارس+ : التسجيل وطلب أحقية الاختبار',
    category: NEWS_CAT.scfhs,
    cadence: 'always',
    date: '2026-10-01',
    link: 'https://portal.scfhs.org.sa/',
    content:
      'منصة الهيئة للممارس. منها تقدّم على أحقية اختبار الرخصة المهنية (ومنها SNLE للتمريض)، تسدّد الرسوم المعتمدة، وتتابع حالة الطلب حتى يصدر تصريح الجدولة.',
  }),
  article({
    id: 'scfhs-snle-guide',
    title: 'دليل المتقدم لاختبار رخصة التمريض SNLE',
    category: NEWS_CAT.scfhs,
    cadence: 'always',
    date: '2026-10-01',
    link: 'https://scfhs.org.sa/sites/default/files/2024-05/SNLE%20Applicant%20Guide%202024.pdf',
    content:
      'الدليل الرسمي يوضح شكل الاختبار: أسئلة اختيار من متعدد، محاور الأساسيات وتمريض البالغين وصحة الأم والطفل والإدارة. اقرأه قبل التقديم، فهو مرجع البناء لا الملخصات العشوائية.',
  }),
  article({
    id: 'scfhs-dates',
    title: 'مواعيد فترات اختبار الرخصة المهنية',
    category: NEWS_CAT.scfhs,
    cadence: 'always',
    date: '2026-10-01',
    link: 'https://scfhs.org.sa/ar/Mumares/SPLE/DATES',
    content:
      'صفحة الهيئة لمواعيد الفترات الاختبارية وحالة التسجيل. المواعيد تتحدث من الهيئة مباشرة، فراجعها قبل الحجز. الجدولة بعد صدور التصريح تتم حسب تعليمات الهيئة ومركز الاختبار.',
  }),
  article({
    id: 'club-2026-10-summary',
    title: 'ملخص أكتوبر — نادي التمريض',
    category: NEWS_CAT.club,
    cadence: 'monthly',
    monthKey: '2026-10',
    featured: true,
    date: '2026-10-22',
    content:
      'في أكتوبر دشّن نادي التمريض بجامعة حفر الباطن منصته الإلكترونية، ليجتمع عند الطالب الجداول والأخبار والخدمات في مكان واحد. وخلال الشهر نُفّذت أربع فعاليات: ثلاث داخل الجامعة وواحدة خارجها؛ يوم الصحة النفسية العالمي، وفعالية الوعي الغذائي، وفعالية المهارات السريرية للممرض داخل الجامعة، وأكتوبر الوردي للتوعية بسرطان الثدي في العثيم مول. وقد حضر عميد عمادة شؤون الطلاب، وعميد عمادة الاتصال المؤسسي، وعميد كلية التمريض، ووكلاء العمادات.',
  }),
];

const RETIRED_NEWSLETTER_IDS = [
  'club-2026-10-1',
  'club-2026-10-2',
  'club-2026-10-3',
  'club-2026-10-4',
];

export function itemMonthKey(item: NewsletterItem) {
  if (item.monthKey) return item.monthKey;
  const stamp = String(item.date || '');
  if (/^\d{4}-\d{2}/.test(stamp)) return stamp.slice(0, 7);
  const parsed = Date.parse(stamp);
  if (Number.isFinite(parsed)) return riyadhMonthKey(parsed);
  return '';
}

export function todaysStudyTips(items: NewsletterItem[], now = Date.now()) {
  const tips = items
    .filter((item) => item.category === NEWS_CAT.tips && item.type !== 'exam-schedule')
    .sort((a, b) => {
      const day = WEEKDAYS.indexOf(a.weekday || 'Sun') - WEEKDAYS.indexOf(b.weekday || 'Sun');
      if (day !== 0) return day;
      return String(a.id).localeCompare(String(b.id), 'en');
    });
  if (!tips.length) return [];
  const weekday = riyadhParts(now).weekday as Weekday;
  const matched = tips.filter((item) => item.weekday === weekday);
  if (matched.length) return matched;
  const [year, month, day] = riyadhParts(now).ymd.split('-').map(Number);
  const idx = Math.abs(year + month + day) % tips.length;
  return [tips[idx]];
}

export function monthlyClubNews(items: NewsletterItem[], now = Date.now()) {
  const month = riyadhMonthKey(now);
  const list = items
    .filter((item) => item.category === NEWS_CAT.club && item.type !== 'exam-schedule')
    .filter((item) => itemMonthKey(item) === month)
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || String(b.date).localeCompare(String(a.date)));
  return list.slice(0, 1);
}

export function examSources(items: NewsletterItem[]) {
  return items.filter((item) => item.category === NEWS_CAT.scfhs && item.type !== 'exam-schedule');
}

export async function seedDefaultNewsletters(db: Firestore) {
  const snap = await getDocs(collection(db, NEWSLETTERS_COL));
  const existing = new Map(snap.docs.map((row) => [row.id, row.data() as Partial<NewsletterItem>]));
  let added = 0;
  let updated = 0;
  for (const id of RETIRED_NEWSLETTER_IDS) {
    if (!existing.has(id)) continue;
    await deleteDoc(doc(db, NEWSLETTERS_COL, id));
    existing.delete(id);
    updated += 1;
  }
  for (const item of DEFAULT_NEWSLETTER_ITEMS) {
    const prev = existing.get(item.id);
    if (!prev) {
      await setDoc(doc(db, NEWSLETTERS_COL, item.id), item);
      added += 1;
      continue;
    }
    const prevText = `${prev.title || ''} ${prev.content || ''}`;
    const staleCopy =
      /أضف من لوحة التحكم/.test(prevText) ||
      /فعالية النادي في أكتوبر/.test(prevText) ||
      (item.id === 'club-2026-10-summary' && prev.title !== item.title);
    const nextImage = isPlaceholderImage(prev.image) ? item.image : prev.image;
    if (staleCopy) {
      await setDoc(doc(db, NEWSLETTERS_COL, item.id), { ...item, image: nextImage }, { merge: true });
      updated += 1;
    } else if (nextImage && nextImage !== prev.image) {
      await setDoc(doc(db, NEWSLETTERS_COL, item.id), { image: nextImage }, { merge: true });
      updated += 1;
    }
  }
  return { added, updated };
}
