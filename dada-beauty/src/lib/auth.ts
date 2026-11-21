import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AppRole } from '@/lib/types';

export interface StaffContext {
  userId: string;
  email: string | null;
  fullName: string;
  role: AppRole;
  employeeId: string | null;
  permissions: Set<string>;
  can: (perm: string) => boolean;
}

/** Profil + permissions de l'utilisateur connecté (lu en base, mis en cache par requête). */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, employee_id, is_active')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !profile.is_active) return null;
  const { data: perms } = await supabase.from('role_permissions').select('permission').eq('role', profile.role);
  const permissions = new Set((perms ?? []).map((p: { permission: string }) => p.permission));
  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile.full_name || user.email || 'Équipe',
    role: profile.role as AppRole,
    employeeId: profile.employee_id,
    permissions,
    can: (perm: string) => permissions.has(perm),
  };
});

/** À utiliser dans les pages admin : redirige si non connecté ou non autorisé. */
export async function requireStaff(permission?: string): Promise<StaffContext> {
  const ctx = await getStaffContext();
  if (!ctx) redirect('/admin/connexion');
  if (permission && !ctx.can(permission)) redirect('/admin?refus=' + encodeURIComponent(permission));
  return ctx;
}

/** À utiliser dans les Server Actions : renvoie une erreur au lieu de rediriger. */
export async function assertPermission(permission: string) {
  const ctx = await getStaffContext();
  if (!ctx) throw new Error('PERMISSION_DENIED');
  if (!ctx.can(permission)) throw new Error('PERMISSION_DENIED');
  const supabase = (await createClient())!;
  return { ctx, supabase };
}
