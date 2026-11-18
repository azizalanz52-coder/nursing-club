export const CLUB_AWARD_BANNER_ID = 'club-award-2026';

export const CLUB_AWARD_CELEBRATION = {
  ceremony: 'روّاد التفوق والتميز',
  place: 'المركز الأول',
  award: 'أفضل نادي طلابي',
  scope: 'على مستوى كليات جامعة حفر الباطن',
  image: '/club-award-stage.png?v=2',
  startsAtMs: Date.parse('2026-11-17T00:00:00+03:00'),
  endsAtMs: Date.parse('2026-11-24T16:00:00+03:00'),
};

export function isClubAwardLive(now = Date.now()) {
  return now >= CLUB_AWARD_CELEBRATION.startsAtMs && now < CLUB_AWARD_CELEBRATION.endsAtMs;
}
