import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Console admin',
  robots: { index: false, follow: false },
};

// Admin pages should never be cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bone">{children}</div>;
}
