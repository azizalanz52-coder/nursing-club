import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { canonicalPhone } from './certificatesLookup';

export const TRIAL_POLL_COLLECTION = 'case_study_trial_votes';
export const TRIAL_POLL_SEEN_KEY = 'nurs_case_trial_vote_v1';
export const TRIAL_POLL_LATER_KEY = 'nurs_case_trial_poll_later';

export const TRIAL_POLL_COPY = {
  title: 'رأيكم بعد الفترة التجريبية',
  intro: 'انتهت الفترة التجريبية لتايمر الـ 45 ثانية ولصدارة الأسبوع. نحتاج رأيكم قبل اعتماد الآلية.',
  timerQuestion: 'هل نعتمد فكرة التايمر 45 ثانية، أو نزيد الوقت لدقيقة ونص؟',
  weeklyQuestion: 'ما رأيكم في تجربة صدارة الأسبوع؟',
  ideaLabel: 'إذا عندك اقتراح زيادة، اكتبه هنا. (اختياري)',
};

export type TimerChoice = 'keep45' | 'minute90';
export type YesNo = 'yes' | 'no';

export type TrialVote = {
  id: string;
  timerChoice: TimerChoice;
  weeklySatisfied: YesNo;
  idea: string;
  name: string;
  phone: string;
  createdAt: string;
  timestamp: number;
};

export const TIMER_CHOICE_LABEL: Record<TimerChoice, string> = {
  keep45: 'نعتمد 45 ثانية',
  minute90: 'نزيد الوقت لدقيقة ونص',
};

export const SATISFIED_LABEL: Record<YesNo, string> = {
  yes: 'راضي',
  no: 'غير راضي',
};

export function isTrialPollOpen() {
  return true;
}

export function summarizeTrialVotes(rows: TrialVote[]) {
  return {
    total: rows.length,
    keep45: rows.filter((row) => row.timerChoice === 'keep45').length,
    minute90: rows.filter((row) => row.timerChoice === 'minute90').length,
    satisfied: rows.filter((row) => row.weeklySatisfied === 'yes').length,
    unsatisfied: rows.filter((row) => row.weeklySatisfied === 'no').length,
    withIdea: rows.filter((row) => row.idea).length,
  };
}

function voteIdForPhone(phone: string) {
  return canonicalPhone(phone) || '';
}

function asTimerChoice(value: unknown): TimerChoice {
  return value === 'minute90' ? 'minute90' : 'keep45';
}

function asYesNo(value: unknown): YesNo {
  return value === 'no' ? 'no' : 'yes';
}

export function hasLocalTrialVote() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TRIAL_POLL_SEEN_KEY) === '1';
}

export function markLocalTrialVote() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TRIAL_POLL_SEEN_KEY, '1');
}

export function hasSessionTrialLater() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(TRIAL_POLL_LATER_KEY) === '1';
}

export function markSessionTrialLater() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TRIAL_POLL_LATER_KEY, '1');
}

export async function hasExistingTrialVote(db: Firestore, phone: string) {
  if (hasLocalTrialVote()) return true;
  const id = voteIdForPhone(phone);
  if (!id) return false;
  try {
    const snap = await getDoc(doc(db, TRIAL_POLL_COLLECTION, id));
    if (!snap.exists()) return false;
    markLocalTrialVote();
    return true;
  } catch {
    return hasLocalTrialVote();
  }
}

export async function loadTrialVotes(db: Firestore): Promise<TrialVote[]> {
  const snap = await getDocs(collection(db, TRIAL_POLL_COLLECTION));
  return snap.docs
    .map((row) => {
      const data = row.data();
      return {
        id: row.id,
        timerChoice: asTimerChoice(data.timerChoice),
        weeklySatisfied: asYesNo(data.weeklySatisfied),
        idea: String(data.idea || '').trim(),
        name: String(data.name || '').trim() || 'مشارك',
        phone: canonicalPhone(String(data.phone || '')) || String(data.phone || '').trim(),
        createdAt: String(data.createdAt || ''),
        timestamp: Number(data.timestamp || 0),
      } satisfies TrialVote;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function submitTrialVote(
  db: Firestore,
  input: {
    timerChoice: TimerChoice;
    weeklySatisfied: YesNo;
    idea: string;
    name: string;
    phone: string;
  }
) {
  const now = Date.now();
  const phone = voteIdForPhone(input.phone);
  const id = phone || `anon-${now}`;
  await setDoc(doc(db, TRIAL_POLL_COLLECTION, id), {
    timerChoice: input.timerChoice,
    weeklySatisfied: input.weeklySatisfied,
    idea: input.idea.trim(),
    name: input.name.trim() || 'مشارك',
    phone,
    createdAt: new Date(now).toISOString(),
    timestamp: now,
  });
  markLocalTrialVote();
}

export async function deleteTrialVote(db: Firestore, id: string) {
  await deleteDoc(doc(db, TRIAL_POLL_COLLECTION, id));
}
