export const WELCOME_BANNER_ID = 'welcome-default';

export const DEFAULT_WELCOME_BANNER = {
  id: WELCOME_BANNER_ID,
  tag: 'مرحباً بكم في نادي التمريض',
  title: 'نادي التمريض',
  description: 'مجتمع طلابي يهدف إلى تطوير المعرفة، وبناء المهارات القيادية، وصناعة أثر في مجال التمريض بجامعة حفر الباطن.',
  image: '/header-banner.png',
  buttonText: 'اكتشف النادي',
  buttonLink: '/discover',
  theme: 'club' as const,
  cinematic: false,
};
