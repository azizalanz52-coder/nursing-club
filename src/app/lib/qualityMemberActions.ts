import { Firestore, addDoc, collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { canonicalPhone } from './certificatesLookup';
import { invalidateCloudCollection, loadCloudCollection } from './cloudCache';
import { notifyExistingUser } from './userAccounts';
import { committeeIdFromName, sameMemberName } from './memberAcceptance';

export const INACTIVE_MEMBER_REPORTS_COL = 'inactive_member_reports';
export const MEMBER_WARNINGS_COL = 'member_warnings';

export type InactiveMemberRow = {
  fullName: string;
  phone: string;
  reason: string;
};

export type InactiveMemberReport = {
  id: string;
  committee: string;
  committeeId?: string;
  reporterName: string;
  reporterPhone?: string;
  members: InactiveMemberRow[];
  status: string;
  createdAt: number;
};

export async function deleteEventExcuse(db: Firestore, excuseId: string) {
  const id = String(excuseId || '').trim();
  if (!id) throw new Error('معرّف الإفادة غير صالح.');
  await deleteDoc(doc(db, 'event_excuses', id));
  invalidateCloudCollection('event_excuses');
}

export async function sendIndividualMemberWarning(
  db: Firestore,
  input: {
    memberName: string;
    memberPhone: string;
    committee: string;
    reason: string;
    reporter: string;
    sourceReportId?: string;
  }
) {
  const memberName = String(input.memberName || '').trim() || 'عضو';
  const memberPhone = canonicalPhone(input.memberPhone) || String(input.memberPhone || '').trim();
  const reason = String(input.reason || '').trim();
  const committee = String(input.committee || '').trim() || 'لجنة غير محددة';
  if (!reason) throw new Error('اكتب سبب الإنذار.');
  if (!memberPhone) throw new Error('رقم جوال العضو غير متوفر.');

  const message =
    `⚠️ [إنذار رسمي مستقل من لجنة الجودة]: ${reason} — موجّه لـ ${memberName} (${committee}).`;

  await setDoc(
    doc(db, 'users', memberPhone),
    { latestNotification: message, warningHidden: false },
    { merge: true }
  ).catch(async () => {
    await notifyExistingUser(db, memberPhone, {
      latestNotification: message,
      warningHidden: false,
    });
  });

  const warning = {
    memberName,
    memberPhone,
    committee,
    reason,
    reporter: String(input.reporter || 'لجنة الجودة والتطوير').trim(),
    sourceReportId: input.sourceReportId || '',
    status: 'تم إرسال إنذار فردي للعضو',
    kind: 'member-warning',
    createdAt: Date.now(),
  };

  const warningRef = await addDoc(collection(db, MEMBER_WARNINGS_COL), warning);
  invalidateCloudCollection(MEMBER_WARNINGS_COL);

  await addDoc(collection(db, 'escalated_reports'), {
    targetCommittee: committee,
    targetMemberName: memberName,
    targetMemberPhone: memberPhone,
    reporter: warning.reporter,
    reason: `[إنذار فردي لـ ${memberName}]: ${reason}`,
    status: '⚠️ إنذار فردي مرسل للعضو',
    leaderDefenseReply: '',
    kind: 'member-warning',
    warningId: warningRef.id,
    createdAt: Date.now(),
  });

  if (input.sourceReportId) {
    try {
      await setDoc(
        doc(db, INACTIVE_MEMBER_REPORTS_COL, input.sourceReportId),
        { status: 'تمت المتابعة بإنذار فردي', lastWarnedAt: Date.now(), lastWarnedMember: memberName },
        { merge: true }
      );
      invalidateCloudCollection(INACTIVE_MEMBER_REPORTS_COL);
    } catch (err) {
      console.error(err);
    }
  }

  return { id: warningRef.id, ...warning };
}

export async function submitInactiveMembersReport(
  db: Firestore,
  input: {
    committee: string;
    reporterName: string;
    reporterPhone?: string;
    members: InactiveMemberRow[];
  }
) {
  const committee = String(input.committee || '').trim();
  const members = (input.members || [])
    .map((row) => ({
      fullName: String(row.fullName || '').trim(),
      phone: canonicalPhone(row.phone) || String(row.phone || '').trim(),
      reason: String(row.reason || '').trim(),
    }))
    .filter((row) => row.fullName && row.reason);

  if (!committee) throw new Error('تعذر تحديد اللجنة.');
  if (!members.length) throw new Error('أضف عضواً واحداً على الأقل مع سبب الإنذار.');

  const row = {
    committee,
    committeeId: committeeIdFromName(committee) || '',
    reporterName: String(input.reporterName || 'قائد لجنة').trim(),
    reporterPhone: canonicalPhone(String(input.reporterPhone || '')) || String(input.reporterPhone || '').trim(),
    members,
    status: 'بانتظار مراجعة الجودة',
    createdAt: Date.now(),
  };

  const docRef = await addDoc(collection(db, INACTIVE_MEMBER_REPORTS_COL), row);
  invalidateCloudCollection(INACTIVE_MEMBER_REPORTS_COL);

  const names = members.map((m) => m.fullName).join('، ');
  const message =
    `📋 [رفع أسماء غير عاملين]: قائد (${committee}) رفع ${members.length} اسماً للجودة: ${names}. راجعوا الأسباب وأرسلوا الإنذارات المناسبة.`;

  const notifyPhones = new Set<string>([canonicalPhone('0553731265')].filter(Boolean));
  try {
    const committees = await loadCloudCollection(db, 'committees');
    const quality = committees.find((item) => String(item.id) === 'quality');
    const leaderNames = [String(quality?.maleLeader || ''), String(quality?.femaleLeader || '')].filter(Boolean);
    if (leaderNames.length) {
      const users = await loadCloudCollection(db, 'users').catch(() => [] as Array<Record<string, unknown>>);
      for (const user of users) {
        const fullName = String(user.fullName || '');
        const assigned = String(user.assignedCommittee || user.committee || '');
        const role = String(user.role || '');
        const matchLeader = leaderNames.some((name) => sameMemberName(fullName, name));
        const isQuality =
          matchLeader
          || assigned.includes('جودة')
          || assigned.includes('تطوير')
          || role.includes('جودة')
          || role.includes('تطوير');
        if (!isQuality) continue;
        const phone = canonicalPhone(String(user.id || user.phone || ''));
        if (phone) notifyPhones.add(phone);
      }
    }
  } catch (err) {
    console.error(err);
  }

  await Promise.all(
    [...notifyPhones].map((phone) =>
      notifyExistingUser(db, phone, { latestNotification: message }).catch(() => undefined)
    )
  );

  return { id: docRef.id, ...row } as InactiveMemberReport;
}

export async function loadInactiveMemberReports(db: Firestore) {
  const rows = await loadCloudCollection(db, INACTIVE_MEMBER_REPORTS_COL);
  return (rows as InactiveMemberReport[])
    .map((row) => ({
      ...row,
      members: Array.isArray(row.members) ? row.members : [],
    }))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export async function deleteInactiveMemberReport(db: Firestore, reportId: string) {
  const id = String(reportId || '').trim();
  if (!id) throw new Error('معرّف التقرير غير صالح.');
  await deleteDoc(doc(db, INACTIVE_MEMBER_REPORTS_COL, id));
  invalidateCloudCollection(INACTIVE_MEMBER_REPORTS_COL);
}

export async function removeMemberFromInactiveReport(
  db: Firestore,
  report: InactiveMemberReport,
  memberPhone: string
) {
  const id = String(report.id || '').trim();
  if (!id) throw new Error('معرّف التقرير غير صالح.');
  const phone = canonicalPhone(memberPhone) || String(memberPhone || '').trim();
  const nextMembers = (report.members || []).filter(
    (row) => (canonicalPhone(row.phone) || row.phone) !== phone
  );
  if (nextMembers.length === 0) {
    await deleteDoc(doc(db, INACTIVE_MEMBER_REPORTS_COL, id));
    invalidateCloudCollection(INACTIVE_MEMBER_REPORTS_COL);
    return { ...report, members: [] as InactiveMemberRow[], deleted: true as const };
  }
  await setDoc(
    doc(db, INACTIVE_MEMBER_REPORTS_COL, id),
    { members: nextMembers },
    { merge: true }
  );
  invalidateCloudCollection(INACTIVE_MEMBER_REPORTS_COL);
  return { ...report, members: nextMembers, deleted: false as const };
}
