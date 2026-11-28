import { notFound } from 'next/navigation';

export default function ConsultationsLayout({ children }: { children: React.ReactNode }) {
  notFound();
  return children;
}
