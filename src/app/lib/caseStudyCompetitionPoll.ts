import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { canonicalPhone } from './certificatesLookup';

export const COMPETITION_POLL_COLLECTION = 'case_study_competition_votes';
export const COMPETITION_POLL_SEEN_KEY = 'nurs_case_comp_vote_v1';

export const COMPETITION_PROPOSAL = {
  title: 'رأيكم في تطوير المنافسة',
  intro: 'ندرس تحسين طريقة الترتيب في دراسة الحالة، ونحتاج رأيكم قبل اعتماد أي تغيير.',
  currentTitle: 'طريقة المنافسة الحالية',
  currentPoints: [
    'كل يوم ثلاث حالات سريرية، والمشاركة مرة واحدة في اليوم فقط.',
    'تُحتسب نقطة على كل إجابة صحيحة، وقد تُضاف نقطة أو نقطتان كبونص مفاجئ بعد التسليم.',
    'يوم الخميس تُضاف نقطتان لمن شارك خمسة أيام خلال الأسبوع.',
    'لوحة الصدارة تجمع نقاطك من أول يوم حتى اليوم، وليست ترتيب هذا اليوم فقط.',
    'أول خمسة في هذا المجموع العام يحصلون على رتبة عضو مميز.',
  ],
  proposalTitle: 'المقترح',
  points: [
    'إضافة ترتيب أسبوعي يبدأ من الصفر كل أحد، حتى يبقى التنافس متاحاً للجميع خلال الأسبوع.',
    'المجموع العام يبقى كما هو، وتبقى رتبة عضو مميز لأول خمسة فيه.',
    'يظهر عدد أيام المشاركة المتتالية، ويبقى بونص الخميس لمن أكمل خمسة أيام.',
  ],
  note: 'لن يُعتمد أي تغيير إلا بعد الاطلاع على أصواتكم ومقترحاتكم.',
};

export type CompetitionVoteChoice = 'agree' | 'disagree';

export type CompetitionVote = {
  id: string;
  vote: CompetitionVoteChoice;
  idea: string;
  name: string;
  phone: string;
  createdAt: string;
  timestamp: number;
};

export function summarizeCompetitionVotes(rows: CompetitionVote[]) {
  return {
    total: rows.length,
    agree: rows.filter((row) => row.vote === 'agree').length,
    disagree: rows.filter((row) => row.vote === 'disagree').length,
    withIdea: rows.filter((row) => row.idea).length,
  };
}

function voteIdForPhone(phone: string) {
  return canonicalPhone(phone) || '';
}

export function hasLocalCompetitionVote() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(COMPETITION_POLL_SEEN_KEY) === '1';
}

export function markLocalCompetitionVote() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COMPETITION_POLL_SEEN_KEY, '1');
}

export async function hasExistingCompetitionVote(db: Firestore, phone: string) {
  if (hasLocalCompetitionVote()) return true;
  const id = voteIdForPhone(phone);
  if (!id) return false;
  try {
    const snap = await getDoc(doc(db, COMPETITION_POLL_COLLECTION, id));
    if (!snap.exists()) return false;
    markLocalCompetitionVote();
    return true;
  } catch {
    return hasLocalCompetitionVote();
  }
}

export async function loadCompetitionVotes(db: Firestore): Promise<CompetitionVote[]> {
  const snap = await getDocs(collection(db, COMPETITION_POLL_COLLECTION));
  return snap.docs
    .map((row) => {
      const data = row.data();
      return {
        id: row.id,
        vote: data.vote === 'disagree' ? 'disagree' : 'agree',
        idea: String(data.idea || '').trim(),
        name: String(data.name || '').trim() || 'مشارك',
        phone: canonicalPhone(String(data.phone || '')) || String(data.phone || '').trim(),
        createdAt: String(data.createdAt || ''),
        timestamp: Number(data.timestamp || 0),
      } satisfies CompetitionVote;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function submitCompetitionVote(
  db: Firestore,
  input: {
    vote: CompetitionVoteChoice;
    idea: string;
    name: string;
    phone: string;
  }
) {
  const now = Date.now();
  const phone = voteIdForPhone(input.phone);
  const id = phone || `anon-${now}`;
  await setDoc(doc(db, COMPETITION_POLL_COLLECTION, id), {
    vote: input.vote,
    idea: input.idea.trim(),
    name: input.name.trim() || 'مشارك',
    phone,
    createdAt: new Date(now).toISOString(),
    timestamp: now,
  });
  markLocalCompetitionVote();
}

export async function deleteCompetitionVote(db: Firestore, id: string) {
  await deleteDoc(doc(db, COMPETITION_POLL_COLLECTION, id));
}
