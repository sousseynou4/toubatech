import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ROLE_LABEL } from '@/lib/types';

export const metadata: Metadata = { title: { default: 'Tableau de bord', template: '%s · Admin Dada Beauty' }, robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff('dashboard.view');
  const sb = (await createClient())!;
  const [{ data: notes }, { data: reads }] = await Promise.all([
    sb.from('notifications').select('id').order('created_at', { ascending: false }).limit(100),
    sb.from('notification_reads').select('notification_id').eq('user_id', ctx.userId),
  ]);
  const readSet = new Set((reads ?? []).map((r) => r.notification_id));
  const unread = (notes ?? []).filter((n) => !readSet.has(n.id)).length;
  return (
    <AdminShell permissions={[...ctx.permissions]} user={{ name: ctx.fullName, roleLabel: ROLE_LABEL[ctx.role] }} unread={unread}>
      {children}
    </AdminShell>
  );
}
