import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ConfigBadge, EmptyState, PageHeader, Panel, Table } from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatXOF } from '@/lib/format';

export const metadata = { title: 'Produits' };

interface Row {
  id: string; name: string; brand: string | null; status: 'to_configure' | 'active' | 'inactive'; is_online: boolean; is_featured: boolean;
  category: { id: string; name: string } | null;
  variants: { id: string; name: string; sale_price: number | null; stock_quantity: number; alert_threshold: number; is_active: boolean }[];
}

export default async function ProductsPage({ searchParams }: PageProps<'/admin/produits'>) {
  const ctx = await requireStaff('products.view');
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q.slice(0, 60) : '';
  const cat = typeof sp.categorie === 'string' ? sp.categorie : '';
  const status = typeof sp.statut === 'string' ? sp.statut : '';
  const sb = (await createClient())!;
  let query = sb.from('products').select('id, name, brand, status, is_online, is_featured, category:product_categories(id, name), variants:product_variants(id, name, sale_price, stock_quantity, alert_threshold, is_active)').order('sort_order').order('name').limit(500);
  if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, '')}%`);
  if (cat) query = query.eq('category_id', cat);
  if (['to_configure', 'active', 'inactive'].includes(status)) query = query.eq('status', status);
  const [{ data }, { data: categories }] = await Promise.all([query, sb.from('product_categories').select('id, name').order('sort_order')]);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader title="Produits" description={`${rows.length} produit${rows.length > 1 ? 's' : ''}`}
        actions={ctx.can('products.manage') ? <ButtonLink href="/admin/produits/nouveau" size="sm"><Plus className="size-4" /> Nouveau produit</ButtonLink> : undefined} />
      <form className="mb-4 grid gap-2 sm:grid-cols-4" action="/admin/produits">
        <input name="q" defaultValue={q} placeholder="Rechercher un produit" className="field h-10 py-0" aria-label="Recherche" />
        <select name="categorie" defaultValue={cat} className="field h-10 py-0" aria-label="Catégorie"><option value="">Toutes catégories</option>{(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="statut" defaultValue={status} className="field h-10 py-0" aria-label="Statut"><option value="">Tous statuts</option><option value="to_configure">À configurer</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select>
        <button className="h-10 rounded-xl bg-ink text-sm text-ivory">Filtrer</button>
      </form>
      <Panel padded={false}>
        {rows.length === 0 ? <div className="p-5"><EmptyState title="Aucun produit">Ajoutez vos perruques, produits de maquillage, soins et accessoires.</EmptyState></div> : (
          <Table>
            <thead><tr><th>Produit</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Statut</th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const active = p.variants.filter((v) => v.is_active);
                const prices = active.map((v) => v.sale_price).filter((x): x is number => x !== null);
                const stock = active.reduce((s, v) => s + v.stock_quantity, 0);
                const alert = active.some((v) => v.stock_quantity <= v.alert_threshold);
                return (
                  <tr key={p.id}>
                    <td><Link href={`/admin/produits/${p.id}`} className="font-medium text-ink hover:text-rosewood">{p.name}</Link><span className="block text-xs text-muted">{[p.brand, active.length > 1 ? `${active.length} variantes` : null].filter(Boolean).join(' · ')}</span></td>
                    <td>{p.category?.name}</td>
                    <td className="tabular-nums">{prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatXOF(prices[0]) : `${formatXOF(Math.min(...prices))} – ${formatXOF(Math.max(...prices))}`) : <span className="text-warning">À configurer</span>}</td>
                    <td className={alert ? 'font-semibold text-danger' : 'tabular-nums'}>{stock}{alert && ' ⚠'}</td>
                    <td><span className="flex flex-wrap gap-1"><ConfigBadge status={p.status} />{!p.is_online && <Badge>Hors ligne</Badge>}{p.is_featured && <Badge tone="gold">Vedette</Badge>}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
