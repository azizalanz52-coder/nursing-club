import * as XLSX from 'xlsx';

export const QUALITY_EVENT_REPORTS = 'quality_event_reports';

export const RECOMMENDATIONS = [
  { id: 'develop', label: 'يطوّر', hint: 'إذا حقق الهدف' },
  { id: 'improve', label: 'يحتاج إلى تحسين', hint: 'إذا احتاج إلى تحسين' },
  { id: 'merge', label: 'يدمج', hint: 'إذا تشابه مع نشاط آخر' },
  { id: 'stop', label: 'لا يُكرّر', hint: 'إذا لم يتحقق الأثر المتوقع' },
] as const;

export type RecommendationId = (typeof RECOMMENDATIONS)[number]['id'];
export type FinanceStatus = 'complete' | 'na';
export type ParticipantRole = 'organizer' | 'visitor';

export type ExpenseRow = {
  spend: string;
  details: string;
  qty: number;
  unitPrice: number;
  party: string;
};
export type SponsorRow = {
  name: string;
  type: string;
  details: string;
  qty: number;
};
export type SurveyItem = { question: string; percent: number };
export type EventParticipant = { fullName: string; role: ParticipantRole };

export type QualityEventReport = {
  id: string;
  eventTitle: string;
  organizer: string;
  eventDate: string;
  location: string;
  targetAudience: string;
  targetBeneficiaries: number;
  actualBeneficiaries: number;
  targetStudentOrganizers: number;
  actualStudentOrganizers: number;
  surveyRespondents: number;
  satisfactionRate: number;
  benefitRate: number;
  actualCost: number;
  successIndexOverride?: number;
  recommendation: RecommendationId | '';
  recommendationReason: string;
  photosLink: string;
  financeStatus: FinanceStatus;
  challenges: string;
  expenses: ExpenseRow[];
  sponsors: SponsorRow[];
  invoicesLink: string;
  summary: string;
  surveyItems: SurveyItem[];
  participants: EventParticipant[];
  positives: string;
  improvements: string;
  createdAt: number;
  createdBy: string;
};

export function percent(part: number, whole: number) {
  if (!whole || !Number.isFinite(part) || !Number.isFinite(whole)) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function targetAchievementRate(report: Pick<QualityEventReport, 'actualBeneficiaries' | 'targetBeneficiaries'>) {
  return percent(report.actualBeneficiaries, report.targetBeneficiaries);
}

export function activeStudentRate(report: Pick<QualityEventReport, 'actualStudentOrganizers' | 'targetStudentOrganizers'>) {
  return percent(report.actualStudentOrganizers, report.targetStudentOrganizers);
}

export function costPerBeneficiary(report: Pick<QualityEventReport, 'actualCost' | 'actualBeneficiaries'>) {
  return report.actualBeneficiaries > 0 ? roundMoney(report.actualCost / report.actualBeneficiaries) : 0;
}

export function computedSuccessIndex(report: Pick<QualityEventReport, 'actualBeneficiaries' | 'targetBeneficiaries' | 'actualStudentOrganizers' | 'targetStudentOrganizers' | 'satisfactionRate' | 'benefitRate'>) {
  const values = [
    targetAchievementRate(report),
    activeStudentRate(report),
    Number(report.satisfactionRate) || 0,
    Number(report.benefitRate) || 0,
  ].filter((value) => Number.isFinite(value));
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function successIndex(report: QualityEventReport) {
  if (Number.isFinite(report.successIndexOverride) && Number(report.successIndexOverride) > 0) {
    return Number(report.successIndexOverride);
  }
  return computedSuccessIndex(report);
}

export function recommendationLabel(id: string) {
  return RECOMMENDATIONS.find((item) => item.id === id)?.label || 'بدون توصية';
}

export function financeStatusLabel(status: FinanceStatus) {
  return status === 'complete' ? 'مكتمل' : 'لا ينطبق';
}

export function emptyExpense(): ExpenseRow {
  return { spend: '', details: '', qty: 0, unitPrice: 0, party: '' };
}

export function emptySponsor(): SponsorRow {
  return { name: '', type: '', details: '', qty: 0 };
}

export function normalizeExpense(row: Partial<ExpenseRow> & { item?: string; amount?: number; notes?: string }): ExpenseRow {
  return {
    spend: String(row.spend || row.item || ''),
    details: String(row.details || row.notes || ''),
    qty: Number(row.qty) || 0,
    unitPrice: Number(row.unitPrice) || Number(row.amount) || 0,
    party: String(row.party || ''),
  };
}

export function normalizeSponsor(row: Partial<SponsorRow> & { amount?: number }): SponsorRow {
  return {
    name: String(row.name || ''),
    type: String(row.type || ''),
    details: String(row.details || ''),
    qty: Number(row.qty) || Number(row.amount) || 0,
  };
}

export function expenseTotal(row: ExpenseRow) {
  return roundMoney((Number(row.qty) || 0) * (Number(row.unitPrice) || 0));
}

export function expensesSum(rows: ExpenseRow[]) {
  return roundMoney((rows || []).reduce((sum, row) => sum + expenseTotal(row), 0));
}

export function filledExpenses(rows: ExpenseRow[]) {
  return (rows || []).map(normalizeExpense).filter((row) => row.spend.trim() || row.details.trim() || row.qty || row.unitPrice || row.party.trim());
}

export function filledSponsors(rows: SponsorRow[]) {
  return (rows || []).map(normalizeSponsor).filter((row) => row.name.trim() || row.type.trim() || row.details.trim() || row.qty);
}

export function emptySurveyItem(): SurveyItem {
  return { question: '', percent: 0 };
}

export function emptyEventReport(): Omit<QualityEventReport, 'id' | 'createdAt' | 'createdBy'> {
  return {
    eventTitle: '',
    organizer: 'نادي كلية التمريض',
    eventDate: '',
    location: '',
    targetAudience: '',
    targetBeneficiaries: 0,
    actualBeneficiaries: 0,
    targetStudentOrganizers: 0,
    actualStudentOrganizers: 0,
    surveyRespondents: 0,
    satisfactionRate: 0,
    benefitRate: 0,
    actualCost: 0,
    recommendation: '',
    recommendationReason: '',
    photosLink: '',
    financeStatus: 'complete',
    challenges: '',
    expenses: [emptyExpense()],
    sponsors: [emptySponsor()],
    invoicesLink: '',
    summary: '',
    surveyItems: [
      { question: 'نسبة الرضا', percent: 0 },
      { question: 'نسبة الاستفادة', percent: 0 },
    ],
    participants: [],
    positives: '',
    improvements: '',
  };
}

export function chartItems(report: QualityEventReport): SurveyItem[] {
  const extras = (report.surveyItems || []).filter((item) => item.question.trim());
  if (extras.length) {
    return extras.map((item) => {
      if (item.question.includes('رضا')) return { ...item, percent: Number(report.satisfactionRate) || item.percent };
      if (item.question.includes('استفاد')) return { ...item, percent: Number(report.benefitRate) || item.percent };
      return item;
    });
  }
  return [
    { question: 'نسبة الرضا', percent: Number(report.satisfactionRate) || 0 },
    { question: 'نسبة الاستفادة', percent: Number(report.benefitRate) || 0 },
  ];
}

export function splitParticipants(participants: EventParticipant[]) {
  const organizers = participants.filter((person) => person.role === 'organizer');
  const visitors = participants.filter((person) => person.role !== 'organizer');
  return { organizers, visitors };
}

function headerKey(value: string) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[إأآ]/g, 'ا')
    .toLowerCase();
}

function cellText(value: unknown) {
  return String(value ?? '').trim();
}

function parseRole(value: string): ParticipantRole {
  const key = headerKey(value);
  if (/منظم|اعداد|إعداد|تنفيذ|organizer|staff/.test(key)) return 'organizer';
  return 'visitor';
}

export function parseEventParticipantsExcel(buffer: ArrayBuffer): EventParticipant[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][];
  if (!rows.length) return [];

  const first = (rows[0] || []).map((cell) => headerKey(cellText(cell)));
  const nameIdx = first.findIndex((header) => /اسم|name|المشارك/.test(header));
  const roleIdx = first.findIndex((header) => /نوع|دور|صفه|صفة|role|منظم|زائر|visitor|organizer/.test(header));
  const hasHeaders = nameIdx >= 0 || roleIdx >= 0;
  const dataRows = hasHeaders ? rows.slice(1) : rows;
  const people: EventParticipant[] = [];

  for (const row of dataRows) {
    const fullName = cellText(row[hasHeaders && nameIdx >= 0 ? nameIdx : 0]);
    if (!fullName || fullName.length < 2 || /^(اسم|name)/i.test(headerKey(fullName))) continue;
    const roleValue = cellText(row[hasHeaders && roleIdx >= 0 ? roleIdx : 1]);
    people.push({ fullName, role: parseRole(roleValue) });
  }

  return people;
}

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function barRow(label: string, value: number, color: string) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return `<div class="bar keep">
    <div class="bar-top"><span>${label}</span><span>${width}%</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${width}%;background:${color}"></div></div>
  </div>`;
}

function kpiCard(label: string, value: string) {
  return `<div class="kpi keep">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
  </div>`;
}

function namesTable(people: { fullName: string }[]) {
  if (!people.length) return '<p class="empty">لا يوجد</p>';
  const rows: string[] = [];
  for (let i = 0; i < people.length; i += 2) {
    const a = esc(people[i].fullName);
    const b = people[i + 1] ? esc(people[i + 1].fullName) : '';
    rows.push(`<tr><td>${i + 1}. ${a}</td><td>${b ? `${i + 2}. ${b}` : ''}</td></tr>`);
  }
  return `<table class="names"><tbody>${rows.join('')}</tbody></table>`;
}

export const PRINT_SAFE_CSS = `
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #241015;
    font-family: "Readex Pro","Segoe UI",Tahoma,Arial,sans-serif;
    overflow: visible !important;
    height: auto !important;
  }
  .no-print { text-align: center; padding: 12px; background: #faf6f7; border-bottom: 2px solid #630517; }
  .no-print button {
    background: #630517; color: #F5D061; border: 0; border-radius: 999px;
    padding: 10px 22px; font-weight: 900; cursor: pointer; font-size: 13px;
  }
  .sheet, .pad, .block, section { overflow: visible !important; }
  .sheet { max-width: none; background: #fff; }
  .head { background: #630517; color: #F5D061; padding: 18px 20px; }
  .head h1 { margin: 4px 0; font-size: 20px; page-break-after: avoid; }
  .head p { margin: 0; font-size: 11px; opacity: .92; }
  .pad { padding: 16px 18px 24px; }
  h2 {
    font-size: 14px; color: #630517; margin: 0 0 10px;
    border-bottom: 2px solid #F5D061; padding-bottom: 6px;
    page-break-after: avoid; break-after: avoid;
  }
  .block { margin: 0 0 16px; page-break-inside: auto; break-inside: auto; }
  .keep { page-break-inside: avoid; break-inside: avoid-page; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .box { background: #faf6f7; border: 1px solid #ead9de; border-radius: 10px; padding: 10px 12px; font-size: 12px; }
  .box b { display: block; color: #7a4450; font-size: 10px; margin-bottom: 4px; }
  .kpi { background: #fff; border: 1px solid #ead9de; border-radius: 10px; padding: 10px; text-align: center; }
  .kpi-label { font-size: 10px; color: #7a4450; font-weight: 700; }
  .kpi-value { font-size: 18px; font-weight: 900; color: #630517; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 12px; font-size: 11px; }
  th, td { border: 1px solid #ead9de; padding: 7px 8px; text-align: right; }
  th { background: #630517; color: #F5D061; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  .tight th, .tight td { font-size: 10px; padding: 5px 6px; }
  .names td { width: 50%; border: 0; border-bottom: 1px solid #f1e7ea; padding: 4px 6px; font-size: 11px; }
  .note { white-space: pre-wrap; background: #fff; border: 1px solid #ead9de; border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 1.7; }
  .gold { background: #F5D061; color: #630517; display: inline-block; padding: 5px 10px; border-radius: 999px; font-weight: 900; font-size: 11px; }
  .bar { margin: 0 0 8px; }
  .bar-top { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; margin-bottom: 3px; }
  .bar-track { height: 8px; background: #f1e7ea; border-radius: 999px; }
  .bar-fill { height: 8px; border-radius: 999px; }
  .empty { color: #7a4450; font-size: 12px; }
  .span2 { grid-column: 1 / -1; }
  @media print {
    .no-print { display: none !important; }
    body { padding: 0 !important; background: #fff !important; }
    a { color: inherit; text-decoration: none; }
  }
`;

export function printQualityEventReport(report: QualityEventReport) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('اسمح بالنوافذ المنبثقة لفتح التقرير.');
  }

  const achievement = targetAchievementRate(report);
  const students = activeStudentRate(report);
  const costEach = costPerBeneficiary(report);
  const index = successIndex(report);
  const charts = chartItems(report);
  const { organizers, visitors } = splitParticipants(report.participants || []);
  const expenses = filledExpenses(report.expenses || []);
  const sponsors = filledSponsors(report.sponsors || []);
  const rec = RECOMMENDATIONS.find((item) => item.id === report.recommendation);

  printWindow.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>
    <meta charset="utf-8" />
    <title>التقرير الشامل للفعالية — ${esc(report.eventTitle)}</title>
    <style>${PRINT_SAFE_CSS}</style>
  </head><body>
    <div class="no-print">
      <button type="button" onclick="window.print()">حفظ التقرير كـ PDF — اختر Save as PDF</button>
    </div>
    <div class="sheet">
      <div class="head keep">
        <p>نادي كلية التمريض • جامعة حفر الباطن</p>
        <h1>التقرير الشامل للفعالية</h1>
        <p>لجنة الجودة والتطوير</p>
      </div>
      <div class="pad">
        <section class="block keep">
          <h2>بيانات الفعالية</h2>
          <div class="grid">
            <div class="box"><b>عنوان الفعالية</b>${esc(report.eventTitle) || '—'}</div>
            <div class="box"><b>الجهة</b>${esc(report.organizer) || '—'}</div>
            <div class="box"><b>تاريخ التنفيذ</b>${esc(report.eventDate) || '—'}</div>
            <div class="box"><b>موقع التنفيذ</b>${esc(report.location) || '—'}</div>
            <div class="box span2"><b>الفئة المستهدفة</b>${esc(report.targetAudience) || '—'}</div>
          </div>
        </section>

        <section class="block keep">
          <h2>المؤشرات</h2>
          <div class="kpis">
            ${kpiCard('تحقيق المستهدف', `${achievement}%`)}
            ${kpiCard('مشاركة الطلاب الفاعلة', `${students}%`)}
            ${kpiCard('نسبة الرضا', `${report.satisfactionRate || 0}%`)}
            ${kpiCard('مؤشر النجاح', `${index}%`)}
          </div>
          <div class="grid" style="margin-top:8px">
            <div class="box"><b>المستفيدون المستهدف / الفعلي</b>${report.targetBeneficiaries || 0} / ${report.actualBeneficiaries || 0}</div>
            <div class="box"><b>الطلبة في الإعداد والتنفيذ</b>${report.targetStudentOrganizers || 0} / ${report.actualStudentOrganizers || 0}</div>
            <div class="box"><b>المستجيبون للاستبيان</b>${report.surveyRespondents || 0}</div>
            <div class="box"><b>نسبة الاستفادة</b>${report.benefitRate || 0}%</div>
            <div class="box"><b>التكلفة الفعلية</b>${report.actualCost || 0} ر.س</div>
            <div class="box"><b>التكلفة لكل مستفيد</b>${costEach} ر.س</div>
          </div>
        </section>

        <section class="block keep">
          <h2>التوصية</h2>
          <p><span class="gold">${rec ? `${esc(rec.label)} — ${esc(rec.hint)}` : 'بدون توصية'}</span></p>
          <div class="note">${esc(report.recommendationReason) || '—'}</div>
          <div class="grid" style="margin-top:8px">
            <div class="box"><b>المتطلبات المالية</b>${financeStatusLabel(report.financeStatus)}</div>
            <div class="box"><b>رابط صور النشاط</b>${report.photosLink ? `<a href="${esc(report.photosLink)}">${esc(report.photosLink)}</a>` : '—'}</div>
          </div>
          <div class="box" style="margin-top:8px"><b>أبرز التحديات أو الملاحظات</b>${esc(report.challenges) || 'لا يوجد'}</div>
        </section>

        <section class="block">
          <h2>الميزانية والدعم</h2>
          <table class="tight">
            <thead><tr><th>الرقم</th><th>الصرف</th><th>التفاصيل</th><th>الكمية</th><th>سعر الوحدة ر.س</th><th>الإجمالي ر.س</th><th>الجهة</th></tr></thead>
            <tbody>${expenses.length ? expenses.map((row, i) => `<tr><td>${i + 1}</td><td>${esc(row.spend) || '—'}</td><td>${esc(row.details) || '—'}</td><td>${row.qty || 0}</td><td>${row.unitPrice || 0}</td><td>${expenseTotal(row)}</td><td>${esc(row.party) || '—'}</td></tr>`).join('') + `<tr><td colspan="5"><strong>المجموع</strong></td><td><strong>${expensesSum(expenses)}</strong></td><td></td></tr>` : '<tr><td colspan="7">لا توجد مصروفات</td></tr>'}</tbody>
          </table>
          <table class="tight">
            <thead><tr><th>الرقم</th><th>الجهة</th><th>نوع الدعم</th><th>التفاصيل</th><th>الكمية</th></tr></thead>
            <tbody>${sponsors.length ? sponsors.map((row, i) => `<tr><td>${i + 1}</td><td>${esc(row.name) || '—'}</td><td>${esc(row.type) || '—'}</td><td>${esc(row.details) || '—'}</td><td>${row.qty || 0}</td></tr>`).join('') : '<tr><td colspan="5">لا توجد جهات داعمة</td></tr>'}</tbody>
          </table>
          <div class="box"><b>رابط صور الفواتير الأصل</b>${report.invoicesLink ? `<a href="${esc(report.invoicesLink)}">${esc(report.invoicesLink)}</a>` : '—'}</div>
        </section>

        <section class="block">
          <h2>تقييم ومراجعة الفعالية</h2>
          <div class="box keep"><b>ملخص الفعالية</b><div class="note" style="margin-top:8px">${esc(report.summary) || '—'}</div></div>
          <div style="margin-top:10px">${charts.map((item, i) => barRow(esc(item.question), item.percent, i % 2 ? '#F5D061' : '#630517')).join('')}</div>
          <h2>المنظمون (${organizers.length})</h2>
          ${namesTable(organizers)}
          <h2>الزوار (${visitors.length})</h2>
          ${namesTable(visitors)}
          <div class="box keep" style="margin-top:10px"><b>أبرز الجوانب الإيجابية</b><div class="note" style="margin-top:8px">${esc(report.positives) || '—'}</div></div>
          <div class="box keep" style="margin-top:8px"><b>مقترحات التحسين والتطوير</b><div class="note" style="margin-top:8px">${esc(report.improvements) || '—'}</div></div>
          <p style="text-align:center;color:#7a4450;font-size:11px;margin:18px 0 0">إعداد بواسطة لجنة الجودة والتطوير</p>
        </section>
      </div>
    </div>
  </body></html>`);
  printWindow.document.close();
  printWindow.focus();
}
