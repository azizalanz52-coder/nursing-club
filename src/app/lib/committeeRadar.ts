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

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function radarPolygon(scores: number[], cx: number, cy: number, maxR: number) {
  const n = Math.max(scores.length, 1);
  return scores.map((score, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = (Math.max(0, Math.min(100, score)) / 100) * maxR;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

function buildRadarSvg(cards: CommitteeRadarCard[]) {
  const cx = 240;
  const cy = 240;
  const maxR = 148;
  const n = Math.max(cards.length, 1);
  const scores = cards.map((card) => card.score);
  const rings = [25, 50, 75, 100].map((level) => {
    const pts = radarPolygon(Array(n).fill(level), cx, cy, maxR);
    return `<polygon points="${pts}" fill="none" stroke="#e7d7a8" stroke-width="1"/>`;
  }).join('');
  const axes = cards.map((card, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = cx + maxR * Math.cos(angle);
    const y = cy + maxR * Math.sin(angle);
    const lx = cx + (maxR + 36) * Math.cos(angle);
    const ly = cy + (maxR + 36) * Math.sin(angle);
    const label = escapeHtml(card.name.replace('لجنة ', ''));
    const r = (card.score / 100) * maxR;
    return `
      <line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#f3e6b8" stroke-width="1"/>
      <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="#630517">${label}</text>
      <circle cx="${cx + r * Math.cos(angle)}" cy="${cy + r * Math.sin(angle)}" r="4.5" fill="#630517"/>
    `;
  }).join('');
  const shape = radarPolygon(scores.length ? scores : [0], cx, cy, maxR);
  return `
    <svg viewBox="0 0 480 480" width="420" height="420" role="img" aria-label="خريطة رادار اللجان">
      ${rings}
      ${axes}
      <polygon points="${shape}" fill="rgba(99,5,23,0.18)" stroke="#630517" stroke-width="2.5"/>
    </svg>
  `;
}

export function openCommitteeRadarPrint(params: {
  cards: CommitteeRadarCard[];
  clubScore: number;
  strengthCount: number;
  issueCount: number;
  extractedAt: string;
}) {
  if (typeof window === 'undefined') return;
  const { cards, clubScore, strengthCount, issueCount, extractedAt } = params;
  const origin = window.location.origin;
  const rows = cards.map((card) => `
    <tr>
      <td>${escapeHtml(card.name)}</td>
      <td class="num">${card.score}%</td>
      <td class="num">${card.output}%</td>
      <td class="num">${card.readiness}%</td>
      <td class="num">${card.discipline}%</td>
      <td>${escapeHtml(card.status)}</td>
    </tr>
  `).join('');

  const sections = cards.map((card) => `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>${escapeHtml(card.name)}</h3>
          <p class="kpi">${escapeHtml(card.kpiLabel)}: ${card.kpiValue}</p>
        </div>
        <div class="score">
          <strong>${card.score}%</strong>
          <span>${escapeHtml(card.status)}</span>
        </div>
      </div>
      <div class="meters">
        <span>إنتاج ${card.output}%</span>
        <span>جاهزية ${card.readiness}%</span>
        <span>انضباط ${card.discipline}%</span>
      </div>
      <div class="split">
        <div>
          <h4 class="pos">الإيجابيات</h4>
          ${(card.positives.length ? card.positives : ['لا توجد إيجابيات مسجّلة.']).map((item) => `<p class="pill green">+ ${escapeHtml(item)}</p>`).join('')}
        </div>
        <div>
          <h4 class="neg">السلبيات للمتابعة</h4>
          ${(card.negatives.length ? card.negatives : ['لا توجد سلبيات تشغيلية مسجّلة.']).map((item) => `<p class="pill red">${card.negatives.length ? '− ' : ''}${escapeHtml(item)}</p>`).join('')}
        </div>
      </div>
      ${card.note ? `<p class="note">${escapeHtml(card.note)}</p>` : ''}
    </article>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>رادار أداء اللجان الشامل</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #1e293b;
      font-family: Tahoma, "Segoe UI", Arial, sans-serif;
      direction: rtl;
      line-height: 1.65;
    }
    body { padding: 8mm 10mm; }
    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 10px;
    }
    .brand img { height: 42px; width: auto; object-fit: contain; }
    .rule { width: 1px; height: 36px; background: #e2e8f0; }
    h1 { margin: 0; color: #630517; font-size: 22px; font-weight: 900; text-align: center; }
    .kicker, .sub, .date {
      text-align: center;
      margin: 4px 0 0;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
    }
    .kicker { color: #B45309; letter-spacing: 0.04em; }
    .gold { height: 3px; background: linear-gradient(90deg, #630517, #F5D061, #630517); border: 0; margin: 14px 0 18px; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .stat {
      border: 1px solid #ead9a4;
      background: #fffaf0;
      border-radius: 12px;
      text-align: center;
      padding: 10px 8px;
    }
    .stat strong { display: block; color: #630517; font-size: 22px; }
    .stat span { font-size: 11px; font-weight: 800; color: #7c5a12; }
    .radar-wrap { text-align: center; margin: 6px 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    th, td { border: 1px solid #d6c38a; padding: 8px 10px; text-align: right; }
    th { background: #630517; color: #F5D061; font-weight: 900; }
    td.num { font-weight: 900; color: #630517; text-align: center; }
    h2 {
      color: #630517;
      font-size: 15px;
      margin: 18px 0 10px;
      border-right: 4px solid #F5D061;
      padding-right: 8px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 16px;
      margin-bottom: 12px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .card-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .card-head h3 { margin: 0; font-size: 16px; color: #111827; }
    .kpi { margin: 2px 0 0; font-size: 11px; color: #64748b; font-weight: 700; }
    .score { text-align: left; }
    .score strong { display: block; font-size: 22px; color: #630517; }
    .score span { font-size: 11px; font-weight: 900; color: #92400e; }
    .meters { display: flex; gap: 8px; margin: 10px 0; font-size: 11px; font-weight: 800; }
    .meters span { background: #f8fafc; border-radius: 999px; padding: 4px 10px; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .pos { color: #166534; font-size: 12px; margin: 0 0 6px; }
    .neg { color: #991b1b; font-size: 12px; margin: 0 0 6px; }
    .pill { margin: 0 0 6px; padding: 7px 9px; border-radius: 8px; font-size: 11px; font-weight: 700; }
    .green { background: #f0fdf4; color: #166534; }
    .red { background: #fef2f2; color: #991b1b; }
    .note { margin: 8px 0 0; font-size: 11px; color: #64748b; }
    .method { font-size: 12px; color: #334155; background: #f8fafc; border-right: 4px solid #630517; padding: 12px 14px; border-radius: 10px; }
    .footer { margin-top: 18px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print {
      body { padding: 0; }
      .card, table, .stats, .radar-wrap, .method, .brand { break-inside: avoid; page-break-inside: avoid; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <div class="brand">
    <img src="${origin}/logo.png" alt="نادي التمريض" />
    <div class="rule"></div>
    <img src="${origin}/uhb-logo.png" alt="جامعة حفر الباطن" />
  </div>
  <p class="kicker">وثيقة رقابية داخلية • نادي التمريض • جامعة حفر الباطن</p>
  <h1>رادار أداء اللجان الشامل</h1>
  <p class="sub">رصد الإنتاج المسجّل، جاهزية القيادة، والانضباط. لا يكتفي بالنشاط الشكلي.</p>
  <p class="date">تاريخ الاستخراج: ${escapeHtml(extractedAt)}</p>
  <hr class="gold" />
  <div class="stats">
    <div class="stat"><strong>${clubScore}%</strong><span>مؤشر النادي</span></div>
    <div class="stat"><strong>${strengthCount}</strong><span>إيجابيات مرصودة</span></div>
    <div class="stat"><strong>${issueCount}</strong><span>سلبيات للمتابعة</span></div>
  </div>
  <h2>جدول المؤشرات</h2>
  <table>
    <thead>
      <tr>
        <th>اللجنة</th>
        <th>المؤشر</th>
        <th>إنتاج</th>
        <th>جاهزية</th>
        <th>انضباط</th>
        <th>الحالة</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <h2>خريطة الرادار</h2>
  <div class="radar-wrap">${buildRadarSvg(cards)}</div>
  <h2>تفصيل اللجان</h2>
  ${sections}
  <h2>منهج القياس</h2>
  <div class="method">
    الدرجة = إنتاج المنصة + جاهزية القيادة والكادر + الانضباط (بلاغات الجودة). الإعلام يُقاس بالمواد المرفوعة، والموارد البشرية بالشهادات، والعلاقات العامة بالشراكات، والمحتوى العلمي بالنصوص، والجودة بالتقارير، والتصميم وتنظيم الفعاليات بالقيادة والكادر وما يُوثَّق رسميًا.
  </div>
  <div class="footer">نادي التمريض • جامعة حفر الباطن • وثيقة داخلية ${new Date().getFullYear()}</div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const frameDoc = iframe.contentDocument;
  if (!frameDoc) {
    iframe.remove();
    alert('تعذر تجهيز ملف الطباعة. أعد المحاولة.');
    return;
  }
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  let printed = false;
  const printFrame = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      window.setTimeout(() => iframe.remove(), 2000);
    }
  };
  iframe.addEventListener('load', () => window.setTimeout(printFrame, 350));
  window.setTimeout(printFrame, 900);
}
