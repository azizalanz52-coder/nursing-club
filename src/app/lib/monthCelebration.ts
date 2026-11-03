import { sameMemberName } from './memberAcceptance';

export type MonthHonoree = {
  id: string;
  fullName: string;
  shortName: string;
  rank: 'gold' | 'silver';
  rankLabel: string;
  points: number;
  days: number;
  blurb: string;
};

/** تكريم عضوين أكملا شهراً من التفاعل اليومي في دراسة الحالة — يظهر للجميع 24 ساعة، وتهنئة خاصة لأول دخول لكل واحدة منهما. */
export const MONTH_CELEBRATION = {
  id: 'month-complete-jouri-ghala-2026-11-03',
  startsAtMs: Date.parse('2026-11-03T17:00:00+03:00'),
  endsAtMs: Date.parse('2026-11-04T17:00:00+03:00'),
  headline: 'شهر كامل من التفاعل اليومي',
  personalTitle: 'مبروك إكمال الشهر',
  personalBody: 'مبروك إكمالك شهراً من التفاعل اليومي في دراسة الحالة.',
  honorees: [
    {
      id: 'ghala',
      fullName: 'غلا مشعل الدوسري',
      shortName: 'غلا',
      rank: 'gold',
      rankLabel: 'المتصدرة',
      points: 104,
      days: 30,
      blurb: 'تصدّرت دراسة الحالة بعد شهر يومي بلا انقطاع، وبنت حضوراً ثابتاً في كل تحدٍ.',
    },
    {
      id: 'jouri',
      fullName: 'جوري مبارك الشمري',
      shortName: 'جوري',
      rank: 'silver',
      rankLabel: 'الوصيفة',
      points: 102,
      days: 30,
      blurb: 'واصلت التفاعل يومياً حتى أكملت الشهر، وبفارق نقاط بسيط أثبتت مثابرة وحضوراً لافتاً.',
    },
  ] as MonthHonoree[],
};

export function isMonthCelebrationLive(now = Date.now()) {
  return now >= MONTH_CELEBRATION.startsAtMs && now < MONTH_CELEBRATION.endsAtMs;
}

export function matchMonthHonoree(fullName?: string | null) {
  const name = String(fullName || '').trim();
  if (!name) return null;
  return (
    MONTH_CELEBRATION.honorees.find((honoree) => {
      if (sameMemberName(honoree.fullName, name)) return true;
      const compact = name.replace(/\s+/g, '');
      return (
        compact.includes(honoree.fullName.replace(/\s+/g, '')) ||
        compact.startsWith(honoree.shortName) ||
        name.split(/\s+/)[0] === honoree.shortName
      );
    }) || null
  );
}

export function monthCelebrationSeenKey(honoreeId: string) {
  return `nurs_month_celebrate_seen_${MONTH_CELEBRATION.id}_${honoreeId}`;
}
