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

export function emptyFaqPage(): FaqPage {
  return { items: [] };
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
    if (!snap.exists()) return emptyFaqPage();
    const raw = Array.isArray(snap.data()?.items) ? snap.data()?.items : [];
    return {
      items: raw.map((item: Partial<FaqItem>, index: number) => normalizeFaqItem(item, index)),
    };
  } catch (err) {
    console.error(err);
    return emptyFaqPage();
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
