import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { canonicalPhone } from './certificatesLookup';

export const COMPETITION_POLL_COLLECTION = 'case_study_competition_votes';
export const COMPETITION_POLL_SEEN_KEY = 'nurs_case_comp_vote_v1';
export const COMPETITION_POLL_LATER_KEY = 'nurs_case_comp_poll_later';
export const COMPETITION_POLL_CLOSES_AT = Date.parse('2026-10-29T23:00:00+03:00');
export const COMPETITION_POLL_CLOSES_LABEL = 'الخميس 29 أكتوبر، 11 مساءً بتوقيت الرياض';

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
    'لوحة الصدارة فيها تبويبان: الصدارة العامة للمسابقة، ومتصدر الأسبوع.',
    'متصدر الأسبوع يأخذ شارة بجانب اسمه، وصاحب أطول سلسلة أيام متتالية يأخذ شارة ثانية، وتبقى شارة متصدر الأسبوع الماضي ظاهرة.',
    'من يحل الحالات الثلاث صحيحة كل أيام الأسبوع تظهر له شارة أسبوع كامل.',
    'عند تعادل نقاط الأسبوع يتقدم من كان الأسرع في أكثر أيام ذلك الأسبوع، ثم الأكثر أيام 3/3.',
    'الأسبوع يُقفل السبت 11:59 م بتوقيت الرياض، وصدارة الأسبوع تُحسب مرة واحدة لذلك الأسبوع.',
    'الشهادة الخاصة لمن يجمع 3 صدارات أسبوعية خلال الفصل، ليست بالضرورة متتالية. إذا بقي التعادل قائماً بعد الفواصل يتشارك الاثنان صدارة ذلك الأسبوع.',
    'يظهر بجانب الاسم عدد الصدارات: كم أسبوعاً أنهاه في المركز الأول.',
    'يظهر عدد أيام المشاركة المتتالية، ويبقى بونص الخميس لمن أكمل خمسة أيام.',
  ],
  note: 'لن يُعتمد أي تغيير إلا بعد الاطلاع على أصواتكم ومقترحاتكم. آلية المنافسة الأسبوعية والشهادة الخاصة موضّحة في تنبيه الصفحة، وتبقى في الأسئلة الشائعة لمن يرجع لها.',
};

export const WEEKLY_RACE_EXAMPLE = {
  caption: 'مثال توضيحي فقط، ليست نتائج حقيقية',
  weekLabel: 'أسبوع 26 أكتوبر — 1 نوفمبر',
  weekly: [
    { name: 'نورة', weekPoints: 18, clean: 18, perfectDays: 6, titles: 3, streak: 5, podium: 'gold' as const, perfectWeek: true, lastWeekChampion: false, longestStreak: false, fastestDays: 3, tieNote: '' },
    { name: 'هند', weekPoints: 16, clean: 16, perfectDays: 4, titles: 2, streak: 7, podium: 'silver' as const, perfectWeek: false, lastWeekChampion: false, longestStreak: false, fastestDays: 4, tieNote: 'تعادل 16 نقطة · هند كانت الأسرع في 4 أيام هذا الأسبوع' },
    { name: 'فيصل', weekPoints: 16, clean: 16, perfectDays: 4, titles: 5, streak: 12, podium: 'bronze' as const, perfectWeek: false, lastWeekChampion: true, longestStreak: true, fastestDays: 1, tieNote: 'تعادل 16 نقطة · فيصل كان الأسرع يوم واحد فقط' },
    { name: 'لمى', weekPoints: 11, clean: 11, perfectDays: 3, titles: 0, streak: 4, podium: null, perfectWeek: false, lastWeekChampion: false, longestStreak: false, fastestDays: 2, tieNote: 'تعادل 11 نقطة · لمى أسرع في يومين هذا الأسبوع' },
    { name: 'سعد', weekPoints: 11, clean: 11, perfectDays: 3, titles: 1, streak: 2, podium: null, perfectWeek: false, lastWeekChampion: false, longestStreak: false, fastestDays: 0, tieNote: 'تعادل 11 نقطة · ما تصدر سرعة أي يوم' },
    { name: 'ماجد', weekPoints: 9, clean: 9, perfectDays: 1, titles: 0, streak: 1, podium: null, perfectWeek: false, lastWeekChampion: false, longestStreak: false, fastestDays: 0, tieNote: '' },
  ],
  overall: [
    { name: 'فيصل', total: 142, titles: 5, distinguished: true, lastWeekChampion: true, specialCert: true },
    { name: 'نورة', total: 128, titles: 3, distinguished: true, lastWeekChampion: false, specialCert: true },
    { name: 'هند', total: 110, titles: 2, distinguished: true, lastWeekChampion: false, specialCert: false },
  ],
};

export function isCompetitionPollOpen(_ms = Date.now()) {
  return false;
}

export function formatPollCloseCountdown(ms = Date.now()) {
  const left = Math.max(0, COMPETITION_POLL_CLOSES_AT - ms);
  const hours = Math.floor(left / 3600000);
  const mins = Math.floor((left % 3600000) / 60000);
  if (left <= 0) return 'انتهى وقت الاستبيان';
  return `${hours} ساعة و ${mins} دقيقة`;
}

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

export function hasSessionPollLater() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(COMPETITION_POLL_LATER_KEY) === '1';
}

export function markSessionPollLater() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(COMPETITION_POLL_LATER_KEY, '1');
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
