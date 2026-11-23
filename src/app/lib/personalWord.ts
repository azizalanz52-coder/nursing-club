import { doc, getDoc, getDocs, query, collection, runTransaction, where } from 'firebase/firestore';
import { db } from './firebase';
import { DAILY_WORDS, riyadhDateKey, wordLetters } from './dailyWord';

function claimId(day: string, word: string) {
  return `${day}_${wordLetters(word)}`;
}

export async function assignPersonalWord(phone: string, now = Date.now()) {
  const day = riyadhDateKey(now);
  const mineRef = doc(db, 'word_assignments', `${phone}_${day}`);
  const existing = await getDoc(mineRef);
  const saved = existing.data()?.word;
  if (typeof saved === 'string' && saved) return saved;

  const [history, today] = await Promise.all([
    getDocs(query(collection(db, 'word_assignments'), where('phone', '==', phone))),
    getDocs(query(collection(db, 'word_claims'), where('day', '==', day))),
  ]);
  const usedByMe = new Set(history.docs.map((item) => String(item.data().word || '')));
  const usedToday = new Set(today.docs.map((item) => String(item.data().word || '')));
  const fresh = DAILY_WORDS.filter((word) => !usedByMe.has(word) && !usedToday.has(word));
  const pool = fresh.length ? fresh : DAILY_WORDS.filter((word) => !usedToday.has(word));
  const choices = pool.length ? pool : DAILY_WORDS.filter((word) => !usedByMe.has(word));
  const list = choices.length ? choices : [...DAILY_WORDS];

  for (const word of list) {
    try {
      await runTransaction(db, async (tx) => {
        const claim = doc(db, 'word_claims', claimId(day, word));
        const claimSnap = await tx.get(claim);
        if (claimSnap.exists() && claimSnap.data()?.phone !== phone) throw new Error('taken');
        const again = await tx.get(mineRef);
        if (again.exists() && typeof again.data()?.word === 'string') return;
        tx.set(claim, { phone, day, word });
        tx.set(mineRef, { phone, day, word });
      });
      const confirmed = await getDoc(mineRef);
      const wordNow = confirmed.data()?.word;
      if (typeof wordNow === 'string' && wordNow) return wordNow;
    } catch (err) {
      if (String((err as Error)?.message || '') !== 'taken') throw err;
    }
  }

  return list[0];
}

export async function releaseEmptyWord(phone: string, word: string) {
  if (!phone || !word) return;
  const day = riyadhDateKey();
  const assignRef = doc(db, 'word_assignments', `${phone}_${day}`);
  const claimRef = doc(db, 'word_claims', claimId(day, word));
  await runTransaction(db, async (tx) => {
    const assign = await tx.get(assignRef);
    const data = assign.data();
    const guesses = Array.isArray(data?.guesses) ? data.guesses : [];
    if (!assign.exists() || guesses.length || data?.startedAt) return;
    if (data?.word !== word) return;
    const claim = await tx.get(claimRef);
    tx.delete(assignRef);
    if (claim.exists() && claim.data()?.phone === phone) tx.delete(claimRef);
  });
}
