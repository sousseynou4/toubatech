import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ConfigBadge, PageHeader, Panel, Table } from '@/components/admin/ui';
import { ImageUploadForm, ProductForm, ProductImageTile, VariantForm } from '@/components/admin/commerce/product-forms';
import { STOCK_REASON_LABEL } from '@/components/admin/commerce/labels';
import { formatDateTime, formatXOF } from '@/lib/format';

export const metadata = { title: 'Produit' };

export default async function ProductDetail({ params }: PageProps<'/admin/produits/[id]'>) {
  const ctx = await requireStaff('products.view');
  const { id } = await params;
  const sb = (await createClient())!;
  const { data: p } = await sb.from('products')
    .select('*, image:media_assets!products_image_id_fkey(id, public_url, alt), gallery:product_images(media:media_assets(id, public_url, alt)), variants:product_variants(id, name, sku, cost_price, sale_price, stock_quantity, alert_threshold, is_active, is_default, sort_order)')
    .eq('id', id).maybeSingle();
  if (!p) notFound();
  const variants = ((p.variants ?? []) as { id: string; name: string; sku: string | null; cost_price: number | null; sale_price: number | null; stock_quantity: number; alert_threshold: number; is_active: boolean; is_default: boolean; sort_order: number }[])
    .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.sort_order - b.sort_order);
  const [{ data: categories }, { data: suppliers }, { data: moves }] = await Promise.all([
    sb.from('product_categories').select('id, name').order('sort_order'),
    sb.from('suppliers').select('id, name').order('name'),
    sb.from('stock_movements').select('id, quantity_delta, reason, note, resulting_quantity, created_at, variant_id').in('variant_id', variants.map((v) => v.id).length ? variants.map((v) => v.id) : ['00000000-0000-0000-0000-000000000000']).order('created_at', { ascending: false }).limit(20),
  ]);
  const images = [
    ...(p.image?.public_url ? [{ ...p.image, main: true }] : []),
    ...((p.gallery ?? []) as { media: { id: string; public_url: string | null; alt: string } | null }[]).map((g) => g.media).filter((m): m is { id: string; public_url: string; alt: string } => Boolean(m?.public_url)).map((m) => ({ ...m, main: false })),
  ];
  const manage = ctx.can('products.manage');
  const variantName = (vid: string) => variants.find((v) => v.id === vid)?.name;

  return (
    <>
      <PageHeader back={{ href: '/admin/produits', label: 'Produits' }} title={p.name} description={p.brand ?? undefined} actions={<ConfigBadge status={p.status} />} />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-6 xl:col-span-2">
          {manage ? <Panel title="Fiche produit"><ProductForm product={p} categories={categories ?? []} suppliers={suppliers ?? []} /></Panel> : (
            <Panel title="Fiche produit"><p className="text-sm text-ink-soft">{p.short_description ?? '—'}</p></Panel>
          )}
          <Panel title="Variantes, prix et stock">
            <div className="grid gap-3">
              {manage ? variants.map((v) => <VariantForm key={v.id} productId={p.id} variant={v} />) : (
                <Table><thead><tr><th>Variante</th><th>Prix</th><th>Stock</th></tr></thead><tbody>{variants.map((v) => <tr key={v.id}><td>{v.name}</td><td>{formatXOF(v.sale_price)}</td><td>{v.stock_quantity}</td></tr>)}</tbody></Table>
              )}
              {manage && <details className="rounded-2xl border border-dashed border-powder-200 p-3"><summary className="cursor-pointer text-sm font-medium text-rosewood">+ Ajouter une variante (taille, teinte, longueur…)</summary><div className="mt-3"><VariantForm productId={p.id} /></div></details>}
            </div>
          </Panel>
        </div>
        <div className="grid h-fit gap-6">
          <Panel title="Images">
            {images.length > 0 && <div className="mb-4 grid grid-cols-3 gap-2">{images.map((m) => manage ? <ProductImageTile key={m.id} productId={p.id} mediaId={m.id} url={m.public_url!} alt={m.alt} main={m.main} /> : null)}</div>}
            {images.length === 0 && <p className="mb-3 text-sm text-muted">Aucune image : un visuel « Photo à venir » s&apos;affiche sur la boutique.</p>}
            {manage && <ImageUploadForm productId={p.id} />}
          </Panel>
          <Panel title="Derniers mouvements" padded={false} action={ctx.can('inventory.manage') ? <Link href={`/admin/stocks?variante=${variants[0]?.id ?? ''}#mouvement`} className="text-xs text-rosewood">Mouvement →</Link> : undefined}>
            {(moves ?? []).length === 0 ? <p className="p-5 text-sm text-muted">Aucun mouvement.</p> : (
              <ul className="divide-y divide-line/70 text-sm">{(moves ?? []).map((m) => (
                <li key={m.id} className="flex justify-between gap-3 px-5 py-2.5">
                  <span>{STOCK_REASON_LABEL[m.reason] ?? m.reason}{variants.length > 1 && <span className="text-muted"> · {variantName(m.variant_id)}</span>}<span className="block text-xs text-muted">{formatDateTime(m.created_at)}{m.note ? ` · ${m.note}` : ''}</span></span>
                  <span className={`tabular-nums font-semibold ${m.quantity_delta < 0 ? 'text-danger' : 'text-success'}`}>{m.quantity_delta > 0 ? '+' : ''}{m.quantity_delta} → {m.resulting_quantity}</span>
                </li>
              ))}</ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
