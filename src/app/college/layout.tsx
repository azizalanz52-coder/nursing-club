import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'إدارة كلية التمريض - نادي التمريض',
  description: 'الهيكل الإداري لكلية التمريض بجامعة حفر الباطن، من مكتب العميد إلى سكرتارية العمادة.',
};

export default function CollegeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
