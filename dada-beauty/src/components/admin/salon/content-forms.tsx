'use client';

import { MEDIA_CATEGORIES, QUOTE_STATUS_LABEL, SLOT_LABEL } from '@/lib/media';
import { useActionState, useState, useTransition } from 'react';
import Image from 'next/image';
import { Check, Trash2, X } from 'lucide-react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { CustomerPicker } from '@/components/admin/customer-picker';
import { deleteMedia, deleteReview, moderateReview, updateMedia, updateQuote, uploadMedia } from '@/server/admin/content';
import type { FormState } from '@/server/admin/common';


function MetaFields({ m, categories }: { m?: MediaValues; categories: { id: string; name: string }[] }) {
  return (
    <>
      <Field label="Description de la photo (texte alternatif)" htmlFor={`alt-${m?.id ?? 'new'}`} hint="Ex. « Maquillage full glam pour une mariée »"><Input id={`alt-${m?.id ?? 'new'}`} name="alt" defaultValue={m?.alt} required minLength={3} maxLength={200} /></Field>
      <Field label="Légende (facultatif)" htmlFor={`cap-${m?.id ?? 'new'}`}><Input id={`cap-${m?.id ?? 'new'}`} name="caption" defaultValue={m?.caption ?? ''} maxLength={300} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select name="category" defaultValue={m?.category ?? ''} aria-label="Catégorie"><option value="">Sans catégorie</option>{MEDIA_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Select name="slot" defaultValue={m?.slot ?? ''} aria-label="Emplacement"><option value="">Aucun emplacement éditorial</option>{Object.entries(SLOT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Select name="categoryImageFor" defaultValue="" aria-label="Image de catégorie"><option value="">Ne pas utiliser comme image de catégorie</option>{categories.map((c) => <option key={c.id} value={c.id}>Image de la catégorie « {c.name} »</option>)}</Select>
        <Input name="sortOrder" type="number" min={0} max={9999} defaultValue={m?.sort_order ?? 0} aria-label="Ordre" />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="isGallery" defaultChecked={m?.is_gallery ?? true} className="accent-[var(--color-rosewood)]" /> Dans la galerie</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked={m?.is_published ?? true} className="accent-[var(--color-rosewood)]" /> Publiée</label>
      </div>
    </>
  );
}

export function UploadForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(uploadMedia, null);
  return (
    <form action={action} className="grid gap-3" key={state?.ok ? 'done' : 'f'}>
      <FormFeedback state={state} />
      <Input name="files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" required aria-label="Images (10 max, 8 Mo chacune)" />
      <MetaFields categories={categories} />
      <fieldset className="rounded-2xl bg-powder-50 p-3">
        <legend className="px-1 text-sm font-medium">Photo d&apos;une cliente ? (facultatif)</legend>
        <p className="mb-2 text-xs text-muted">Si la photo montre une cliente, liez sa fiche : la publication sera refusée tant que son consentement photo n&apos;est pas enregistré.</p>
        <CustomerPicker name="customerId" allowNew={false} />
      </fieldset>
      <SubmitButton className="justify-self-start" pendingLabel="Envoi…">Ajouter</SubmitButton>
    </form>
  );
}

export interface MediaValues {
  id: string; public_url: string | null; alt: string; caption: string | null; category: string | null; slot: string | null;
  is_gallery: boolean; is_published: boolean; is_placeholder: boolean; sort_order: number; customer_consent_id: string | null;
  customer?: { full_name: string; photo_consent: boolean } | null;
}

export function MediaCard({ m, categories }: { m: MediaValues; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(updateMedia, null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [delState, setDel] = useState<FormState>(null);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="relative aspect-square bg-powder-50">
        {m.public_url && <Image src={m.public_url} alt={m.alt} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" />}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {!m.is_published && <Badge>Non publiée</Badge>}
          {m.slot && <Badge tone="gold">{m.slot === 'home_hero' ? 'Accueil' : 'À propos'}</Badge>}
          {m.customer && <Badge tone={m.customer.photo_consent ? 'success' : 'danger'}>{m.customer.photo_consent ? 'Consentement ✓' : 'Sans consentement'}</Badge>}
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-xs text-ink-soft">{m.alt}</p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>{open ? 'Fermer' : 'Modifier'}</Button>
          <Button size="sm" variant="ghost" disabled={pending} aria-label="Supprimer" onClick={() => { if (confirm('Supprimer définitivement cette image ?')) start(async () => setDel(await deleteMedia(m.id))); }}><Trash2 className="size-4" /></Button>
        </div>
        <FormFeedback state={delState} />
        {open && (
          <form action={action} className="mt-3 grid gap-3">
            <FormFeedback state={state} />
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="customerId" value={m.customer_consent_id ?? ''} />
            <MetaFields m={m} categories={categories} />
            <SubmitButton size="sm">Enregistrer</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}

export function QuoteForm({ quote }: { quote: { id: string; status: string; quoted_amount: number | null; quote_details: string | null } }) {
  const [state, action] = useActionState(updateQuote, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={quote.id} />
      <Field label="Statut" htmlFor="q-status"><Select id="q-status" name="status" defaultValue={quote.status}>
        {Object.entries(QUOTE_STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select></Field>
      <Field label="Montant du devis (FCFA)" htmlFor="q-amount"><Input id="q-amount" name="quotedAmount" type="number" min={0} step={500} defaultValue={quote.quoted_amount ?? ''} inputMode="numeric" /></Field>
      <Field label="Détail du devis" htmlFor="q-details" hint="Prestations incluses, déplacement, acompte demandé…"><Textarea id="q-details" name="quoteDetails" defaultValue={quote.quote_details ?? ''} maxLength={5000} className="min-h-32" /></Field>
      <SubmitButton size="sm" className="justify-self-start">Enregistrer</SubmitButton>
    </form>
  );
}


export function ReviewActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'approved' && <Button size="sm" disabled={pending} onClick={() => start(async () => setState(await moderateReview(id, 'approved')))}><Check className="size-4" /> Publier</Button>}
      {status !== 'rejected' && <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => setState(await moderateReview(id, 'rejected')))}><X className="size-4" /> Refuser</Button>}
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => { if (confirm('Supprimer cet avis ?')) start(async () => setState(await deleteReview(id))); }}><Trash2 className="size-4" /></Button>
      {state?.error && <span className="text-xs text-danger">{state.error}</span>}
    </div>
  );
}
