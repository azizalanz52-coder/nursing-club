import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الأسئلة الشائعة - نادي التمريض',
  description: 'إجابات الأسئلة الشائعة لنادي التمريض بجامعة حفر الباطن.',
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
