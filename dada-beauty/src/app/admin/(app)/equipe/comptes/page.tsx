import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { InviteForm, ProfileRow } from '@/components/admin/salon/team-forms';
import { Alert } from '@/components/ui/field';
import { ROLE_LABEL, type AppRole } from '@/lib/types';

export const metadata = { title: 'Comptes & rôles' };

export default async function AccountsPage() {
  const ctx = await requireStaff('users.manage');
  const sb = (await createClient())!;
  const [{ data: profiles }, { data: employees }, { data: roles }] = await Promise.all([
    sb.from('profiles').select('id, full_name, role, employee_id, is_active, created_at').order('created_at'),
    sb.from('employees').select('id, display_name').order('display_name'),
    sb.from('roles').select('code, label, description').order('rank'),
  ]);
  const serviceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return (
    <>
      <PageHeader back={{ href: '/admin/equipe', label: 'Équipe' }} title="Comptes & rôles" description="Les permissions sont appliquées par la base de données, pas seulement par l'interface." />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Comptes de l'équipe">
          <div className="grid gap-3">
            {(profiles ?? []).map((p) => (
              <ProfileRow key={p.id} profile={{ ...p, role: p.role as AppRole }} employees={employees ?? []} actorRole={ctx.role} isSelf={p.id === ctx.userId} />
            ))}
          </div>
        </Panel>
        <div className="grid h-fit gap-6">
          <Panel title="Inviter un membre">
            {serviceKey ? <InviteForm employees={employees ?? []} actorRole={ctx.role} /> : <Alert tone="warning">Invitation indisponible : la clé serveur SUPABASE_SERVICE_ROLE_KEY n&apos;est pas configurée (voir ENVIRONMENT.md).</Alert>}
          </Panel>
          <Panel title="Rôles">
            <ul className="grid gap-3 text-sm">
              {(roles ?? []).map((r) => <li key={r.code}><strong>{ROLE_LABEL[r.code as AppRole] ?? r.label}</strong><span className="block text-muted">{r.description}</span></li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
