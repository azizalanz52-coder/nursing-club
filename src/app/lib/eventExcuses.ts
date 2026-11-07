import { Firestore, addDoc, collection, getDocs } from 'firebase/firestore';
import { isCommitteeLeaderRole, sameMemberName } from './memberAcceptance';
import { notifyExistingUser } from './userAccounts';
import { invalidateCloudCollection } from './cloudCache';

export type EventExcuseInput = {
  memberName: string;
  memberPhone?: string;
  committee: string;
  eventName: string;
  eventDate?: string;
  reason: string;
  source?: string;
  maleLeader?: string;
  femaleLeader?: string;
};

function committeeKeyword(name: string) {
  const value = String(name || '');
  if (value.includes('تصميم')) return 'تصميم';
  if (value.includes('إعلام') || value.includes('اعلام')) return 'اعلام';
  if (value.includes('فعاليات')) return 'فعاليات';
  if (value.includes('موارد')) return 'موارد';
  if (value.includes('علاقات')) return 'علاقات';
  if (value.includes('علمي')) return 'علمي';
  if (value.includes('جودة') || value.includes('تطوير')) return 'جودة';
  return value.replace(/^لجنة\s*/u, '').trim().slice(0, 12);
}

function normCommittee(value: string) {
  return String(value || '')
    .replace(/الـ/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .trim();
}

function shouldNotifyExcuseRecipient(
  data: Record<string, any>,
  input: EventExcuseInput,
  keyword: string
) {
  const assigned = String(data.assignedCommittee || data.committee || '');
  const role = String(data.role || '');
  const fullName = String(data.fullName || '');
  const assignedNorm = normCommittee(assigned);
  const keywordNorm = normCommittee(keyword);

  const isListedLeader =
    sameMemberName(fullName, input.maleLeader) || sameMemberName(fullName, input.femaleLeader);
  const isOwnCommitteeLeader =
    (Boolean(keywordNorm) && assignedNorm.includes(keywordNorm) && isCommitteeLeaderRole(role))
    || isListedLeader;
  const isQuality =
    assignedNorm.includes('جوده') ||
    assignedNorm.includes('تطوير') ||
    role.includes('جودة') ||
    role.includes('تطوير');
  const isHr = assignedNorm.includes('موارد') || role.includes('موارد');
  const isTop =
    role === 'System Admin' ||
    role.includes('رئيس النادي') ||
    role.includes('نائبة الرئيس') ||
    role.includes('General Supervisor');

  return isOwnCommitteeLeader || isQuality || isHr || isTop;
}

/** يسجّل اعتذار الفعالية ويُشعر قادة اللجنة وقادة الجودة والموارد البشرية */
export async function submitEventExcuse(db: Firestore, input: EventExcuseInput) {
  const committee = String(input.committee || '').trim() || 'لجنة غير محددة';
  const eventName = String(input.eventName || '').trim();
  const reason = String(input.reason || '').trim();
  const memberName = String(input.memberName || '').trim() || 'عضو';
  if (!eventName || !reason) throw new Error('اختر الفعالية واكتب سبب الاعتذار.');

  const row = {
    memberName,
    memberPhone: String(input.memberPhone || '').trim(),
    committee,
    eventName,
    eventDate: String(input.eventDate || '').trim() || 'غير محدد',
    reason,
    status: 'بانتظار اطلاع قادة اللجنة والجودة',
    source: input.source || 'member',
    createdAt: Date.now(),
  };

  const docRef = await addDoc(collection(db, 'event_excuses'), row);
  invalidateCloudCollection('event_excuses');

  const message =
    `ℹ️ [اعتذار عن فعالية]: ${memberName} من (${committee}) اعتذر عن (${eventName}). السبب: ${reason}`;
  const keyword = committeeKeyword(committee);

  try {
    const snap = await getDocs(collection(db, 'users'));
    await Promise.all(
      snap.docs.map(async (item) => {
        if (!shouldNotifyExcuseRecipient(item.data() || {}, input, keyword)) return;
        await notifyExistingUser(db, item.id, { latestNotification: message });
      })
    );
  } catch (err) {
    console.error(err);
  }

  return { id: docRef.id, ...row };
}
