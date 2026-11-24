'use client';

import { useActionState, useTransition } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { createProduct, removeProductImage, saveVariant, updateProduct, uploadProductImage } from '@/server/admin/commerce';
import { useResetOnSuccess } from './use-reset';
import type { FormState } from '@/server/admin/common';
import { UPLOAD_FAILED, withShrunkImages } from '@/lib/image-actions';

const uploadProductImageAction = withShrunkImages<FormState>(uploadProductImage, 'file', { error: UPLOAD_FAILED });

interface ProductValues {
  id?: string; name?: string; slug?: string; category_id?: string; supplier_id?: string | null; brand?: string | null;
  short_description?: string | null; description?: string | null; status?: string; is_online?: boolean; is_featured?: boolean; sort_order?: number;
}

export function ProductForm({ product, categories, suppliers }: { product?: ProductValues; categories: { id: string; name: string }[]; suppliers: { id: string; name: string }[] }) {
  const [state, action] = useActionState(product?.id ? updateProduct : createProduct, null);
  const p = product ?? {};
  return (
    <form action={action} className="grid gap-4">
      <FormFeedback state={state} />
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom du produit" htmlFor="pf-name"><Input id="pf-name" name="name" defaultValue={p.name} required maxLength={160} /></Field>
        <Field label="Marque" htmlFor="pf-brand"><Input id="pf-brand" name="brand" defaultValue={p.brand ?? ''} maxLength={80} /></Field>
        <Field label="Catégorie" htmlFor="pf-cat"><Select id="pf-cat" name="category_id" defaultValue={p.category_id ?? ''} required><option value="" disabled>Choisir…</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Fournisseur" htmlFor="pf-sup"><Select id="pf-sup" name="supplier_id" defaultValue={p.supplier_id ?? ''}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Statut" htmlFor="pf-status" hint="« Active » exige au moins une variante avec prix de vente.">
          <Select id="pf-status" name="status" defaultValue={p.status ?? 'to_configure'}><option value="to_configure">À configurer</option><option value="active">Active</option><option value="inactive">Inactive</option></Select>
        </Field>
        <Field label="Adresse (URL)" htmlFor="pf-slug" hint="Générée depuis le nom si vide"><Input id="pf-slug" name="slug" defaultValue={p.slug ?? ''} maxLength={80} /></Field>
      </div>
      <Field label="Description courte" htmlFor="pf-short"><Input id="pf-short" name="short_description" defaultValue={p.short_description ?? ''} maxLength={300} /></Field>
      <Field label="Description détaillée" htmlFor="pf-desc"><Textarea id="pf-desc" name="description" defaultValue={p.description ?? ''} maxLength={5000} /></Field>
      {!p.id && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prix de vente (FCFA)" htmlFor="pf-sale" hint="Facultatif — à configurer plus tard"><Input id="pf-sale" name="sale_price" type="number" min={0} inputMode="numeric" /></Field>
          <Field label="Prix d'achat (FCFA)" htmlFor="pf-cost"><Input id="pf-cost" name="cost_price" type="number" min={0} inputMode="numeric" /></Field>
        </div>
      )}
      <div className="flex flex-wrap gap-5 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_online" defaultChecked={p.is_online ?? true} className="accent-[var(--color-rosewood)]" /> Visible sur la boutique en ligne</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={p.is_featured ?? false} className="accent-[var(--color-rosewood)]" /> Mis en avant</label>
        <label className="flex items-center gap-2">Ordre <input type="number" name="sort_order" defaultValue={p.sort_order ?? 0} min={0} className="field h-9 w-20 py-0" /></label>
      </div>
      <SubmitButton>{p.id ? 'Enregistrer le produit' : 'Créer le produit'}</SubmitButton>
    </form>
  );
}

interface VariantValues { id?: string; name?: string; sku?: string | null; cost_price?: number | null; sale_price?: number | null; alert_threshold?: number; is_active?: boolean; stock_quantity?: number }

export function VariantForm({ productId, variant }: { productId: string; variant?: VariantValues }) {
  const [state, action] = useActionState(saveVariant, null);
  const v = variant ?? {};
  const ref = useResetOnSuccess(v.id ? null : state);
  return (
    <form ref={ref} action={action} className="grid gap-3 rounded-2xl border border-line p-4">
      <FormFeedback state={state} />
      <input type="hidden" name="product_id" value={productId} />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Variante" htmlFor={`v-name-${v.id ?? 'n'}`}><Input id={`v-name-${v.id ?? 'n'}`} name="name" defaultValue={v.name ?? ''} placeholder="ex. 18 pouces" required maxLength={80} /></Field>
        <Field label="Référence (SKU)" htmlFor={`v-sku-${v.id ?? 'n'}`}><Input id={`v-sku-${v.id ?? 'n'}`} name="sku" defaultValue={v.sku ?? ''} maxLength={60} /></Field>
        <Field label="Seuil d'alerte" htmlFor={`v-th-${v.id ?? 'n'}`}><Input id={`v-th-${v.id ?? 'n'}`} name="alert_threshold" type="number" min={0} defaultValue={v.alert_threshold ?? 2} /></Field>
        <Field label="Prix d'achat (FCFA)" htmlFor={`v-cost-${v.id ?? 'n'}`}><Input id={`v-cost-${v.id ?? 'n'}`} name="cost_price" type="number" min={0} defaultValue={v.cost_price ?? ''} inputMode="numeric" /></Field>
        <Field label="Prix de vente (FCFA)" htmlFor={`v-sale-${v.id ?? 'n'}`}><Input id={`v-sale-${v.id ?? 'n'}`} name="sale_price" type="number" min={0} defaultValue={v.sale_price ?? ''} inputMode="numeric" /></Field>
        <div className="flex flex-col justify-end gap-2 text-sm">
          {v.id !== undefined && <p className="text-muted">Stock : <strong className="text-ink">{v.stock_quantity ?? 0}</strong> <a href={`/admin/stocks?variante=${v.id}#mouvement`} className="text-rosewood">ajuster →</a></p>}
          <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={v.is_active ?? true} className="accent-[var(--color-rosewood)]" /> Active</label>
        </div>
      </div>
      <div><SubmitButton size="sm" variant="outline">{v.id ? 'Mettre à jour' : 'Ajouter la variante'}</SubmitButton></div>
    </form>
  );
}

export function ImageUploadForm({ productId }: { productId: string }) {
  const [state, action] = useActionState(uploadProductImageAction, null);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <input type="hidden" name="product_id" value={productId} />
      <Input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required aria-label="Image" className="file:mr-3 file:rounded-full file:border-0 file:bg-powder-100 file:px-3 file:py-1.5 file:text-sm" />
      <Input name="alt" placeholder="Description de l'image (accessibilité)" maxLength={200} aria-label="Texte alternatif" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="as_main" defaultChecked className="accent-[var(--color-rosewood)]" /> Image principale</label>
      <SubmitButton size="sm" variant="outline">Envoyer l&apos;image</SubmitButton>
    </form>
  );
}

export function ProductImageTile({ productId, mediaId, url, alt, main }: { productId: string; mediaId: string; url: string; alt: string; main: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="relative aspect-square overflow-hidden rounded-xl border border-line">
      <Image src={url} alt={alt || 'Image produit'} fill sizes="160px" className="object-cover" />
      {main && <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[0.65rem] font-medium">Principale</span>}
      <button type="button" disabled={pending} onClick={() => confirm('Retirer cette image du produit ?') && start(async () => { await removeProductImage(productId, mediaId); })}
        className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/90 text-danger" aria-label="Retirer l'image"><X className="size-4" /></button>
    </div>
  );
}
