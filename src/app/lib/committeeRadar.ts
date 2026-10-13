export type RadarCommitteeInput = {
  id: string;
  name: string;
  maleLeader?: string;
  femaleLeader?: string;
  members?: { name?: string }[];
};

export type RadarEvidence = {
  mediaCount: number;
  hrCertificates: number;
  partnersCount: number;
  scientificTexts: number;
  eventsCount: number;
  qualityEvaluations: number;
  qualityFiles: number;
  escalatedByCommittee: Record<string, number>;
  acceptedMembersByCommittee: Record<string, number>;
};

export type CommitteeRadarCard = {
  id: string;
  name: string;
  kind: 'output' | 'field' | 'oversight';
  score: number;
  output: number;
  readiness: number;
  discipline: number;
  status: 'صارم ومستقر' | 'تحت المتابعة' | 'يحتاج تدخل';
  kpiLabel: string;
  kpiValue: number;
  metrics: { label: string; value: string }[];
  positives: string[];
  negatives: string[];
  note?: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratio(value: number, target: number) {
  if (target <= 0) return 0;
  return clamp((value / target) * 100);
}

function hasLeader(name?: string) {
  return Boolean(String(name || '').trim()) && !['قائد الطلاب', 'قائدة الطالبات'].includes(String(name).trim());
}

function committeeKey(name: string) {
  if (name.includes('إعلام') || name.includes('اعلام')) return 'media';
  if (name.includes('موارد')) return 'hr';
  if (name.includes('علاقات')) return 'pr';
  if (name.includes('علمي')) return 'scientific';
  if (name.includes('جودة') || name.includes('تطوير')) return 'quality';
  if (name.includes('فعاليات') || name.includes('تنظيم')) return 'events';
  if (name.includes('تصميم')) return 'design';
  return name;
}

export function buildCommitteeRadar(
  committees: RadarCommitteeInput[],
  evidence: RadarEvidence
): CommitteeRadarCard[] {
  return committees.map((comm) => {
    const key = committeeKey(comm.name);
    const membersFromList = comm.members?.filter((m) => m.name?.trim()).length || 0;
    const accepted = evidence.acceptedMembersByCommittee[comm.name] || 0;
    const members = Math.max(membersFromList, accepted);
    const leadersCount = Number(hasLeader(comm.maleLeader)) + Number(hasLeader(comm.femaleLeader));
    const reports = evidence.escalatedByCommittee[comm.name] || 0;
    const isQuality = key === 'quality';
    const isField = key === 'design' || key === 'events';

    const readiness = isQuality
      ? clamp((leadersCount / 2) * 100)
      : clamp(leadersCount * 30 + Math.min(40, members * 8));

    const discipline = isQuality
      ? evidence.qualityEvaluations + evidence.qualityFiles + reports > 0
        ? 90
        : 45
      : clamp(100 - reports * 22);

    let output = 0;
    let kpiLabel = 'مؤشر المنصة';
    let kpiValue = 0;
    let note: string | undefined;

    if (key === 'media') {
      kpiLabel = 'مواد إعلامية مرفوعة';
      kpiValue = evidence.mediaCount;
      output = ratio(evidence.mediaCount, 8);
    } else if (key === 'hr') {
      kpiLabel = 'شهادات صادرة';
      kpiValue = evidence.hrCertificates;
      output = ratio(evidence.hrCertificates, 12);
    } else if (key === 'pr') {
      kpiLabel = 'شراكات ورعاة مسجّلون';
      kpiValue = evidence.partnersCount;
      output = ratio(evidence.partnersCount, 6);
    } else if (key === 'scientific') {
      kpiLabel = 'نصوص علمية معتمدة';
      kpiValue = evidence.scientificTexts;
      output = ratio(evidence.scientificTexts, 6);
    } else if (key === 'events') {
      kpiLabel = 'فعاليات موثّقة على المنصة';
      kpiValue = evidence.eventsCount;
      output = ratio(evidence.eventsCount, 4);
      note = 'العمل الأساسي تنظيمي وميداني (مجموعات واتساب وتنسيق الحضور). المنصة ترصد ما يُوثَّق رسميًا بالإضافة للجاهزية القيادية.';
    } else if (key === 'design') {
      kpiLabel = 'مواد بصرية مرتبطة باللجنة';
      kpiValue = members;
      output = clamp(28 + leadersCount * 16 + Math.min(28, members * 6));
      note = 'عمل اللجنة تصميمي وخارج المنصة بنسبة كبيرة. المؤشر يعتمد على اكتمال القيادة والكادر والانضباط، لا على عدد التصاميم المسلَّمة ورقيًا.';
    } else if (key === 'quality') {
      kpiLabel = 'ملفات وتقييمات رقابية';
      kpiValue = evidence.qualityEvaluations + evidence.qualityFiles;
      output = ratio(evidence.qualityEvaluations * 2 + evidence.qualityFiles, 6);
      note = 'لجنة الجودة جهاز رقابي مركزي بلا هيكل أعضاء. تُقاس بالتقارير والتقييمات المرفوعة، لا بعدد الأعضاء.';
    }

    const score = isQuality
      ? clamp(output * 0.6 + readiness * 0.2 + discipline * 0.2)
      : isField
        ? clamp(output * 0.35 + readiness * 0.4 + discipline * 0.25)
        : clamp(output * 0.5 + readiness * 0.3 + discipline * 0.2);

    const positives: string[] = [];
    const negatives: string[] = [];

    if (leadersCount === 2) positives.push('قيادة مكتملة: قائد وقائدة معيّنان.');
    else if (leadersCount === 1) negatives.push('قيادة ناقصة: أحد المقعدين القياديين غير مكتمل.');
    else negatives.push('لا توجد قيادة مسجّلة على النظام.');

    if (!isQuality) {
      if (members >= 4) positives.push(`كادر تشغيلي واضح: ${members} أعضاء مقبولون.`);
      else if (members > 0) negatives.push(`الكادر محدود (${members} أعضاء). يحتاج تعزيزًا.`);
      else negatives.push('لا يوجد أعضاء مقبولون مسجّلون تحت اللجنة.');
    } else {
      positives.push('النموذج الرقابي بلا أعضاء تحت اللجنة؛ التركيز على التوثيق لا على التوسع العددي.');
    }

    if (key === 'media' && evidence.mediaCount > 0) positives.push(`رُصد ${evidence.mediaCount} مادة إعلامية (صور/فيديو).`);
    if (key === 'media' && evidence.mediaCount === 0) negatives.push('لا توجد تغطيات مرفوعة على المنصة.');
    if (key === 'hr' && evidence.hrCertificates > 0) positives.push(`رُصد إصدار ${evidence.hrCertificates} شهادة.`);
    if (key === 'hr' && evidence.hrCertificates === 0) negatives.push('لا توجد شهادات صادرة في السجل.');
    if (key === 'pr' && evidence.partnersCount > 0) positives.push(`رُصد ${evidence.partnersCount} شريك/راعٍ في السجل.`);
    if (key === 'pr' && evidence.partnersCount === 0) negatives.push('سجل الشراكات والرعاة فارغ.');
    if (key === 'scientific' && evidence.scientificTexts > 0) positives.push(`رُصد ${evidence.scientificTexts} نص علمي معتمد.`);
    if (key === 'scientific' && evidence.scientificTexts === 0) negatives.push('بنك النصوص فارغ.');
    if (key === 'events' && evidence.eventsCount > 0) positives.push(`رُصدت ${evidence.eventsCount} فعالية على المنصة.`);
    if (key === 'events' && evidence.eventsCount === 0) negatives.push('لا توجد فعاليات موثّقة على المنصة بعد.');
    if (key === 'quality' && evidence.qualityEvaluations > 0) positives.push(`${evidence.qualityEvaluations} تقييم أداء موثّق بالإيجابيات والسلبيات.`);
    if (key === 'quality' && evidence.qualityFiles > 0) positives.push(`${evidence.qualityFiles} ملف رقابي مرفوع.`);
    if (key === 'quality' && evidence.qualityEvaluations + evidence.qualityFiles === 0) {
      negatives.push('لا توجد تقييمات أو ملفات رقابية مرفوعة.');
    }
    if (!isQuality && reports > 0) negatives.push(`${reports} بلاغ/إنذار جودة مسجّل بحق اللجنة.`);
    if (!isQuality && reports === 0 && members > 0) positives.push('لا توجد إحالات جودة قائمة ضد اللجنة.');

    const status: CommitteeRadarCard['status'] =
      score >= 75 ? 'صارم ومستقر' : score >= 50 ? 'تحت المتابعة' : 'يحتاج تدخل';

    return {
      id: comm.id,
      name: comm.name,
      kind: isQuality ? 'oversight' : isField ? 'field' : 'output',
      score,
      output,
      readiness,
      discipline,
      status,
      kpiLabel,
      kpiValue,
      metrics: [
        { label: 'الإنتاج/الأثر', value: `${output}%` },
        { label: 'الجاهزية', value: `${readiness}%` },
        { label: 'الانضباط', value: `${discipline}%` },
        { label: comm.maleLeader ? `قائد: ${comm.maleLeader}` : 'قائد: غير معيّن', value: '' },
        { label: comm.femaleLeader ? `قائدة: ${comm.femaleLeader}` : 'قائدة: غير معيّنة', value: '' },
      ],
      positives,
      negatives,
      note,
    };
  });
}
