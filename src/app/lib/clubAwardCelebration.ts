export const CLUB_AWARD_BANNER_ID = 'club-award-2026';
export const CLUB_AWARD_POSTER_ID = 'club-award-poster-2026';
export const BANNER_CONTROL_DOC = 'banner-control';

export const CLUB_AWARD_CELEBRATION = {
  ceremony: 'روّاد التفوق والتميز',
  place: 'المركز الأول',
  award: 'أفضل نادي طلابي',
  scope: 'على مستوى كليات جامعة حفر الباطن',
  image: '/club-award-poster.png?v=1',
};

export const CLUB_AWARD_POSTER_BANNER = {
  id: CLUB_AWARD_POSTER_ID,
  tag: 'المركز الأول',
  title: 'تهنئة نادي التمريض',
  description: '',
  image: CLUB_AWARD_CELEBRATION.image,
  buttonText: 'اكتشف النادي',
  buttonLink: '/discover',
  theme: 'club' as const,
  cinematic: true,
};

export function retiredBannerIds(data: { retiredIds?: unknown } | undefined) {
  const raw = data?.retiredIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string');
}

export function readBannerControl(data: { retiredIds?: unknown; welcomeOnHome?: unknown } | undefined) {
  return {
    posterRetired: retiredBannerIds(data).includes(CLUB_AWARD_POSTER_ID),
    welcomeOnHome: data?.welcomeOnHome === true,
  };
}
