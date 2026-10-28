import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export const FAQ_DOC = ['site_settings', 'faq'] as const;

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqPage = {
  items: FaqItem[];
};

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-join',
    question: 'كيف أنضم لنادي التمريض؟',
    answer: 'من صفحة انضم إلينا عبّئ نموذج التسجيل باسمك ورقم الجامعة ورقم الجوال وثلاث رغبات للجان. الطلب يصل للإدارة، وبعد قبولك تدخل بوابة لجنتك من صفحة الرؤساء والقادة.',
  },
  {
    id: 'faq-closed',
    question: 'التسجيل مقفل، وش أسوي؟',
    answer: 'الإدارة تفتح التسجيل وتقفل من لوحة التحكم حسب فترة القبول. تابع الموقع والنشرة ومجتمع الواتساب، وقدّم من نفس صفحة الانضمام لما يفتح التسجيل.',
  },
  {
    id: 'faq-committees',
    question: 'وش اللجان الموجودة في النادي؟',
    answer: 'سبع لجان: التصميم، الإعلام، تنظيم الفعاليات، الموارد البشرية، العلاقات العامة، المحتوى العلمي، والجودة والتطوير. كل لجنة لها قائد طلاب وقائدة طالبات وبوابة خاصة بأعضائها المقبولين.',
  },
  {
    id: 'faq-portal',
    question: 'كيف أدخل بوابة اللجنة؟',
    answer: 'سجّل دخولك برقم الجوال من الموقع، ادخل صفحة الرؤساء والقادة، واضغط لجنتك المعتمدة. البوابة لأعضاء اللجنة المقبولين فقط، وإذا حسابك غير مربوط تظهر لك رسالة توضيح.',
  },
  {
    id: 'faq-case',
    question: 'كيف أشارك في دراسة الحالة؟',
    answer: 'من تحدي دراسة الحالة اليومي على الموقع. سجّل دخولك، جاوب الحالات الثلاث، وأرسل مرة واحدة في اليوم. النقاط تنحفظ في لوحة الصدارة وتتجدد الحالات يومياً.',
  },
  {
    id: 'faq-distinguished',
    question: 'وش تعني رتبة عضو مميز؟',
    answer: 'أول خمسة في صدارة دراسة الحالة تظهر لهم رتبة عضو مميز على المنصة كتقدير لتفاعلهم. الرتبة لا تلغي صلاحيات الرؤساء أو قادة اللجان، ولوحة الشرف تبقى من قادة اللجان.',
  },
  {
    id: 'faq-suggest',
    question: 'كيف أرسل مقترحاً أو ملاحظة؟',
    answer: 'من صندوق الآراء والمقترحات في الصفحة الرئيسية. تقدر تكتب باسمك أو كزائر، والإدارة تطّلع على المقترحات من لوحة التحكم.',
  },
  {
    id: 'faq-newsletter',
    question: 'وين ألقى النشرة الأسبوعية؟',
    answer: 'من صفحة النشرة في الموقع. فيها جداول اختبارات دفعات كلية التمريض وتحديثات النادي، وتُنشر من لوحة التحكم لتصل للطلاب مباشرة.',
  },
  {
    id: 'faq-certificates',
    question: 'كيف أحصل على شهادة مشاركة؟',
    answer: 'الشهادات تصدرها لجنة الموارد البشرية والإدارة عبر المنصة بعد اعتماد المشاركة. بعد صدورها تقدر تتحقق منها من صفحة الشهادات برقم جوالك.',
  },
  {
    id: 'faq-whatsapp',
    question: 'كيف أنضم لمجتمع الواتساب؟',
    answer: 'من قسم مجتمع الكلية على واتساب في الصفحة الرئيسية. الإعلانات الأكاديمية وتنبيهات الدفعات تصل هناك، وهو غير مجموعة لجان النادي الداخلية.',
  },
  {
    id: 'faq-events',
    question: 'وين أشوف الفعاليات ومكان الطلاب والطالبات؟',
    answer: 'من صفحة الفعاليات أو معاينة الفعاليات في الرئيسية. كل فعالية تعرض التاريخ والموقع، وموقع الطلاب وموقع الطالبات يظهران كاملين في نفس البطاقة.',
  },
  {
    id: 'faq-who',
    question: 'هل الموقع للطلاب والطالبات؟',
    answer: 'نعم. نادي التمريض في كلية التمريض بجامعة حفر الباطن يخدم الطلاب والطالبات، والتسجيل والفعاليات والخدمات على المنصة مفتوحة للقسمين حسب اعتماد الإدارة.',
  },
];

export function emptyFaqPage(): FaqPage {
  return { items: [] };
}

export function defaultFaqPage(): FaqPage {
  return { items: DEFAULT_FAQ_ITEMS.map((item) => ({ ...item })) };
}

function normalizeFaqItem(item: Partial<FaqItem> | null | undefined, index = 0): FaqItem {
  return {
    id: String(item?.id || `faq-${index + 1}`),
    question: String(item?.question || '').trim(),
    answer: String(item?.answer || '').trim(),
  };
}

export function publishedFaqItems(page: FaqPage) {
  return (page.items || []).filter((item) => item.question && item.answer);
}

export async function loadFaqPage(db: Firestore): Promise<FaqPage> {
  try {
    const snap = await getDoc(doc(db, FAQ_DOC[0], FAQ_DOC[1]));
    if (!snap.exists()) return defaultFaqPage();
    const raw = Array.isArray(snap.data()?.items) ? snap.data()?.items : [];
    const items = raw.map((item: Partial<FaqItem>, index: number) => normalizeFaqItem(item, index));
    if (publishedFaqItems({ items }).length === 0) return defaultFaqPage();
    return { items };
  } catch (err) {
    console.error(err);
    return defaultFaqPage();
  }
}

export async function saveFaqPage(db: Firestore, page: FaqPage) {
  const items = (page.items || [])
    .map((item, index) => normalizeFaqItem(item, index))
    .filter((item) => item.question || item.answer);
  await setDoc(doc(db, FAQ_DOC[0], FAQ_DOC[1]), {
    items,
    updatedAt: Date.now(),
  });
}
