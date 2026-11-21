import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/commerce/product-forms';

export const metadata = { title: 'Nouveau produit' };

export default async function NewProductPage() {
  await requireStaff('products.manage');
  const sb = (await createClient())!;
  const [{ data: categories }, { data: suppliers }] = await Promise.all([
    sb.from('product_categories').select('id, name').order('sort_order'),
    sb.from('suppliers').select('id, name').eq('is_active', true).order('name'),
  ]);
  return (
    <>
      <PageHeader back={{ href: '/admin/produits', label: 'Produits' }} title="Nouveau produit" description="Le stock initial s'enregistre ensuite par un mouvement de stock (historisé)." />
      <Panel className="max-w-3xl"><ProductForm categories={categories ?? []} suppliers={suppliers ?? []} /></Panel>
    </>
  );
}
