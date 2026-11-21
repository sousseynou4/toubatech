'use client';

import { useActionState, useState, useTransition } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { moveCategory, removeServiceImage, saveCategory, saveService } from '@/server/admin/catalog';
import type { FormState } from '@/server/admin/common';

export interface ServiceValues {
  id?: string; name: string; slug: string; category_id: string; short_description: string | null; description: string | null;
  price: number | null; price_is_from: boolean; duration_minutes: number | null; buffer_minutes: number; deposit_amount: number | null;
  is_bookable: boolean; is_featured: boolean; requires_quote: boolean; conditions: string | null; status: 'to_configure' | 'active' | 'inactive';
  sort_order: number; image?: { public_url: string | null; alt: string } | null;
}

const Check = ({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) => (
  <label className="flex items-start gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 accent-[var(--color-rosewood)]" />
    <span>{label}{hint && <span className="block text-xs text-muted">{hint}</span>}</span></label>
);

export function ServiceForm({ service, categories, employees, authorized, canTeam }: {
  service?: ServiceValues; categories: { id: string; name: string }[]; employees: { id: string; display_name: string }[]; authorized: string[]; canTeam: boolean;
}) {
  const [state, action] = useActionState(saveService, null);
  const [pending, start] = useTransition();
  const [imgState, setImgState] = useState<FormState>(null);
  const s = service;
  return (
    <form action={action} className="grid gap-5">
      <FormFeedback state={state} />
      {s?.id && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" htmlFor="sv-name"><Input id="sv-name" name="name" defaultValue={s?.name} required maxLength={120} /></Field>
        <Field label="Catégorie" htmlFor="sv-cat"><Select id="sv-cat" name="categoryId" defaultValue={s?.category_id ?? categories[0]?.id} required>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Identifiant d'URL" htmlFor="sv-slug" hint="Généré à partir du nom si vide"><Input id="sv-slug" name="slug" defaultValue={s?.slug} maxLength={80} pattern="[a-z0-9-]*" /></Field>
        <Field label="Statut" htmlFor="sv-status" hint="« Active » exige un prix et une durée"><Select id="sv-status" name="status" defaultValue={s?.status ?? 'to_configure'}>
          <option value="to_configure">À configurer (visible, prix sur demande)</option><option value="active">Active (réservable)</option><option value="inactive">Inactive (masquée)</option>
        </Select></Field>
      </div>
      <Field label="Description courte" htmlFor="sv-short"><Input id="sv-short" name="shortDescription" defaultValue={s?.short_description ?? ''} maxLength={300} /></Field>
      <Field label="Description détaillée" htmlFor="sv-desc"><Textarea id="sv-desc" name="description" defaultValue={s?.description ?? ''} maxLength={5000} /></Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Prix (FCFA)" htmlFor="sv-price"><Input id="sv-price" name="price" type="number" min={0} step={500} inputMode="numeric" defaultValue={s?.price ?? ''} /></Field>
        <Field label="Durée (min)" htmlFor="sv-dur"><Input id="sv-dur" name="duration" type="number" min={5} max={720} step={5} defaultValue={s?.duration_minutes ?? ''} /></Field>
        <Field label="Préparation (min)" htmlFor="sv-buf" hint="Temps bloqué après"><Input id="sv-buf" name="buffer" type="number" min={0} max={240} step={5} defaultValue={s?.buffer_minutes ?? 0} /></Field>
        <Field label="Acompte (FCFA)" htmlFor="sv-dep" hint="Vide = règle globale"><Input id="sv-dep" name="deposit" type="number" min={0} step={500} defaultValue={s?.deposit_amount ?? ''} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Check name="priceIsFrom" label="Afficher « à partir de »" defaultChecked={s?.price_is_from} />
        <Check name="isBookable" label="Réservable en ligne" defaultChecked={s?.is_bookable ?? true} />
        <Check name="isFeatured" label="Mettre en avant (accueil)" defaultChecked={s?.is_featured} />
        <Check name="requiresQuote" label="Sur devis uniquement" hint="Ex. mariée : redirige vers la demande de devis" defaultChecked={s?.requires_quote} />
      </div>
      <Field label="Conditions particulières" htmlFor="sv-cond"><Textarea id="sv-cond" name="conditions" defaultValue={s?.conditions ?? ''} maxLength={2000} /></Field>
      <Field label="Ordre d'affichage" htmlFor="sv-sort"><Input id="sv-sort" name="sortOrder" type="number" min={0} max={999} defaultValue={s?.sort_order ?? 0} className="max-w-32" /></Field>
      <div className="grid gap-2">
        <span className="label">Photo</span>
        {s?.image?.public_url && (
          <div className="flex items-center gap-3">
            <Image src={s.image.public_url} alt={s.image.alt} width={96} height={72} className="h-18 w-24 rounded-xl object-cover" />
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => setImgState(await removeServiceImage(s.id!)))}>Retirer</Button>
            <FormFeedback state={imgState} />
          </div>
        )}
        <Input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Photo de la prestation" />
        <p className="text-xs text-muted">Une photo distincte par prestation (pas d&apos;image générique). 8 Mo max.</p>
      </div>
      {canTeam && (
        <fieldset>
          <legend className="label">Employées habilitées</legend>
          <input type="hidden" name="employeesSubmitted" value="1" />
          {employees.length === 0 ? <p className="text-sm text-muted">Aucune employée enregistrée.</p> : (
            <div className="flex flex-wrap gap-2">
              {employees.map((e) => (
                <label key={e.id} className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-rosewood has-[:checked]:bg-powder-50">
                  <input type="checkbox" name="employeeIds" value={e.id} defaultChecked={authorized.includes(e.id)} className="sr-only" />{e.display_name}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      )}
      <SubmitButton className="justify-self-start">{s?.id ? 'Enregistrer' : 'Créer la prestation'}</SubmitButton>
    </form>
  );
}

export interface CategoryValues { id?: string; name: string; slug: string; tagline: string | null; description: string | null; sort_order: number; is_active: boolean }

export function CategoryForm({ category }: { category?: CategoryValues }) {
  const [state, action] = useActionState(saveCategory, null);
  const c = category;
  return (
    <form action={action} className="grid gap-3" key={!c && state?.ok ? 'done' : 'f'}>
      <FormFeedback state={state} />
      {c?.id && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input name="name" defaultValue={c?.name} placeholder="Nom" required aria-label="Nom de la catégorie" />
        <Input name="slug" defaultValue={c?.slug} placeholder="identifiant-url" aria-label="Identifiant d'URL" pattern="[a-z0-9-]*" />
      </div>
      <Input name="tagline" defaultValue={c?.tagline ?? ''} placeholder="Accroche (ex. Soft glam, full glam & mariées)" aria-label="Accroche" />
      <Textarea name="description" defaultValue={c?.description ?? ''} placeholder="Description" aria-label="Description" className="min-h-16" />
      <div className="flex flex-wrap items-center gap-3">
        <Input name="sortOrder" type="number" min={0} max={999} defaultValue={c?.sort_order ?? 0} className="h-10 w-24 py-0" aria-label="Ordre" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={c?.is_active ?? true} className="accent-[var(--color-rosewood)]" /> Active</label>
        <Input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-label="Image de la catégorie" className="max-w-xs" />
        <SubmitButton size="sm" variant="outline">{c?.id ? 'Enregistrer' : 'Ajouter'}</SubmitButton>
      </div>
    </form>
  );
}

export function MoveButtons({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex gap-1">
      <button type="button" disabled={pending} onClick={() => start(async () => { await moveCategory(id, 'up'); })} className="grid size-8 place-items-center rounded-lg border border-line bg-white" aria-label="Monter"><ArrowUp className="size-3.5" /></button>
      <button type="button" disabled={pending} onClick={() => start(async () => { await moveCategory(id, 'down'); })} className="grid size-8 place-items-center rounded-lg border border-line bg-white" aria-label="Descendre"><ArrowDown className="size-3.5" /></button>
    </span>
  );
}
