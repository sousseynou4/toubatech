import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState, PageHeader, Panel } from '@/components/admin/ui';
import { SupplierForm } from '@/components/admin/commerce/stock-forms';
import { Badge } from '@/components/ui/badge';
import { formatPhone } from '@/lib/phone';

export const metadata = { title: 'Fournisseurs' };

export default async function SuppliersPage() {
  const ctx = await requireStaff('products.view');
  const sb = (await createClient())!;
  const { data } = await sb.from('suppliers').select('*').order('name');
  const suppliers = data ?? [];
  const manage = ctx.can('products.manage');
  return (
    <>
      <PageHeader back={{ href: '/admin/stocks', label: 'Stocks' }} title="Fournisseurs" description={`${suppliers.length} fournisseur${suppliers.length > 1 ? 's' : ''}`} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-4 xl:col-span-2">
          {suppliers.length === 0 && <EmptyState title="Aucun fournisseur enregistré" />}
          {suppliers.map((s) => manage ? (
            <details key={s.id} className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 font-medium">{s.name}{!s.is_active && <Badge>Inactif</Badge>}<span className="text-sm font-normal text-muted">{[s.contact_name, formatPhone(s.phone)].filter(Boolean).join(' · ')}</span></summary>
              <div className="mt-4"><SupplierForm supplier={s} /></div>
            </details>
          ) : (
            <Panel key={s.id} title={s.name}><p className="text-sm text-ink-soft">{[s.contact_name, formatPhone(s.phone), s.email].filter(Boolean).join(' · ') || '—'}</p></Panel>
          ))}
        </div>
        {manage && <Panel title="Nouveau fournisseur" className="h-fit"><SupplierForm /></Panel>}
      </div>
    </>
  );
}
