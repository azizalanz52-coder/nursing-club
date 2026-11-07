import { Firestore, addDoc, collection, getDocs, limit, query, where } from 'firebase/firestore';
import { canonicalPhone } from './certificatesLookup';
import {
  COMMITTEE_NAMES,
  committeeIdFromName,
  committeeNameFromId,
  isCommitteeLeaderRole,
  sameMemberName,
} from './memberAcceptance';
import { notifyExistingUser } from './userAccounts';
import { invalidateCloudCollection, loadCloudCollection } from './cloudCache';

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

function normalizeCommitteeLabel(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return 'لجنة غير محددة';
  const fromId = committeeNameFromId(raw);
  if (fromId) return fromId;
  const id = committeeIdFromName(raw);
  if (id && COMMITTEE_NAMES[id]) return COMMITTEE_NAMES[id];
  if (raw.startsWith('لجنة')) return raw;
  return `لجنة ${raw}`;
}

async function phonesForLeaderNames(db: Firestore, names: string[]) {
  const wanted = names.map((name) => String(name || '').trim()).filter(Boolean);
  const phones = new Set<string>([canonicalPhone('0553731265')].filter(Boolean));
  if (!wanted.length) return [...phones];

  const remember = (phoneValue?: string, fullName?: string) => {
    if (!wanted.some((name) => sameMemberName(name, fullName || ''))) return;
    const phone = canonicalPhone(String(phoneValue || ''));
    if (phone) phones.add(phone);
  };

  try {
    for (const name of wanted) {
      const variants = Array.from(new Set([
        name,
        name.replace(/\s+/g, ' ').trim(),
        name.replace(/عبد\s+/g, 'عبد'),
        name.replace(/عبد(?=\S)/g, 'عبد '),
      ]));
      for (const variant of variants) {
        try {
          const snap = await getDocs(query(collection(db, 'applications'), where('fullName', '==', variant), limit(5)));
          snap.forEach((row) => remember(String(row.data()?.phone || ''), String(row.data()?.fullName || '')));
        } catch (err) {
          console.error(err);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }

  try {
    const users = await loadCloudCollection(db, 'users').catch(() => [] as Array<Record<string, unknown>>);
    for (const row of users) {
      remember(String(row.id || row.phone || ''), String(row.fullName || ''));
    }
  } catch (err) {
    console.error(err);
  }

  return [...phones];
}

async function collectExcuseRecipientPhones(db: Firestore, input: EventExcuseInput, committee: string) {
  const phones = new Set<string>([canonicalPhone('0553731265')].filter(Boolean));
  const leaderNames = new Set<string>();

  [input.maleLeader, input.femaleLeader].forEach((name) => {
    if (String(name || '').trim()) leaderNames.add(String(name).trim());
  });

  try {
    const committees = await loadCloudCollection(db, 'committees');
    const ownId = committeeIdFromName(committee);
    for (const row of committees) {
      const id = String(row.id || '');
      const isOwn = Boolean(ownId && id === ownId);
      const isQuality = id === 'quality';
      if (!isOwn && !isQuality) continue;
      if (row.maleLeader) leaderNames.add(String(row.maleLeader).trim());
      if (row.femaleLeader) leaderNames.add(String(row.femaleLeader).trim());
    }
  } catch (err) {
    console.error(err);
  }

  for (const phone of await phonesForLeaderNames(db, [...leaderNames])) {
    phones.add(phone);
  }

  // إن كان للعضو صلاحية سرد المستخدمين (قائد/جودة)، أبلغ قادة اللجنة والجودة مباشرة
  try {
    const users = await getDocs(collection(db, 'users'));
    const keyword = committeeKeyword(committee);
    users.forEach((item) => {
      const data = item.data() || {};
      const assigned = String(data.assignedCommittee || data.committee || '');
      const role = String(data.role || '');
      const fullName = String(data.fullName || '');
      const isListedLeader =
        sameMemberName(fullName, input.maleLeader) || sameMemberName(fullName, input.femaleLeader);
      const isOwnCommitteeLeader =
        (Boolean(keyword) && assigned.includes(keyword) && isCommitteeLeaderRole(role)) || isListedLeader;
      const isQuality =
        assigned.includes('جودة') || assigned.includes('تطوير') || role.includes('جودة') || role.includes('تطوير');
      const isTop =
        role === 'System Admin'
        || role.includes('رئيس النادي')
        || role.includes('نائبة الرئيس')
        || role.includes('General Supervisor');
      if (isOwnCommitteeLeader || isQuality || isTop) {
        const phone = canonicalPhone(item.id) || canonicalPhone(String(data.phone || ''));
        if (phone) phones.add(phone);
      }
    });
  } catch {
    // العضو العادي لا يملك list على users — نكتفي بأسماء القادة من اللجان/الطلبات
  }

  return [...phones].filter(Boolean);
}

/** يسجّل اعتذار الفعالية ويُشعر قادة اللجنة وقادة الجودة */
export async function submitEventExcuse(db: Firestore, input: EventExcuseInput) {
  const committee = normalizeCommitteeLabel(input.committee);
  const eventName = String(input.eventName || '').trim();
  const reason = String(input.reason || '').trim();
  const memberName = String(input.memberName || '').trim() || 'عضو';
  if (!eventName || !reason) throw new Error('اختر الفعالية واكتب سبب الاعتذار.');

  const row = {
    memberName,
    memberPhone: canonicalPhone(String(input.memberPhone || '')) || String(input.memberPhone || '').trim(),
    committee,
    committeeId: committeeIdFromName(committee) || '',
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

  try {
    await addDoc(collection(db, 'event_excuse_notices'), {
      excuseId: docRef.id,
      committee,
      committeeId: row.committeeId,
      committeeKeyword: committeeKeyword(committee),
      memberName,
      eventName,
      reason,
      message,
      createdAt: Date.now(),
      audience: ['committee-leaders', 'quality'],
    });
    invalidateCloudCollection('event_excuse_notices');
  } catch (err) {
    console.error(err);
  }

  try {
    const phones = await collectExcuseRecipientPhones(db, input, committee);
    await Promise.all(
      phones.map(async (phone) => {
        try {
          await notifyExistingUser(db, phone, { latestNotification: message });
        } catch (err) {
          console.error(err);
        }
      })
    );
  } catch (err) {
    console.error(err);
  }

  return { id: docRef.id, ...row };
}
