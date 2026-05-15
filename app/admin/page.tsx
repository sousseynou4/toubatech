import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatsBar } from '@/components/admin/StatsBar';
import { DiagnosticTable } from '@/components/admin/DiagnosticTable';
import { getServerSupabase } from '@/lib/supabase';
import type { DiagnosticStatus } from '@/lib/labels';

interface DiagnosticRow {
  id: string;
  reference: string;
  status: DiagnosticStatus;
  device: string;
  brand: string;
  model: string;
  full_name: string;
  problems: string[];
  created_at: string;
}

async function getDiagnostics(): Promise<DiagnosticRow[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('diagnostics')
    .select(
      'id, reference, status, device, brand, model, full_name, problems, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[admin] failed to fetch diagnostics:', error);
    return [];
  }
  return (data ?? []) as DiagnosticRow[];
}

export default async function AdminDashboardPage() {
  const diagnostics = await getDiagnostics();

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <header className="mb-10">
          <p className="font-mono text-[11px] tracking-[0.2em] text-emerald uppercase">
            Tableau de bord
          </p>
          <h1 className="mt-3 text-hero text-ink">Demandes de diagnostic</h1>
          <p className="mt-3 max-w-xl text-[15px] text-ink-500">
            Vue d'ensemble des demandes reçues. Cliquez sur une référence pour ouvrir le ticket
            complet et mettre à jour le statut.
          </p>
        </header>

        <section className="mb-10" aria-label="Statistiques">
          <StatsBar diagnostics={diagnostics} />
        </section>

        <section aria-label="Liste des demandes">
          <DiagnosticTable diagnostics={diagnostics} />
        </section>

        {diagnostics.length >= 200 && (
          <p className="mt-6 text-center text-xs text-ink-400">
            Affichage des 200 demandes les plus récentes.
          </p>
        )}
      </div>
    </>
  );
}
