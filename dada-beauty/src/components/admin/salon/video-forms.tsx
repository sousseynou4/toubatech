'use client';

import { useActionState, useState, useTransition } from 'react';
import { ExternalLink } from 'lucide-react';
import { Field, Input, Select } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { addTikTokVideo, deleteTikTokVideo, updateTikTokVideo } from '@/server/admin/content';
import type { FormState } from '@/server/admin/common';
import { MEDIA_CATEGORIES } from '@/lib/media';

export interface VideoValues { id: string; video_id: string; url: string; author_handle: string | null; title: string | null; category: string | null; sort_order: number; is_published: boolean }

function CategorySelect({ id, defaultValue }: { id: string; defaultValue?: string | null }) {
  return (
    <Select id={id} name="category" defaultValue={defaultValue ?? ''}>
      <option value="">Sans catégorie (visible dans « Tout »)</option>
      {MEDIA_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </Select>
  );
}

export function AddVideoForm() {
  const [state, action] = useActionState(addTikTokVideo, null);
  return (
    <form action={action} className="grid gap-3" key={state?.ok ? state.message : 'form'}>
      <FormFeedback state={state} />
      <Field label="Lien de la vidéo TikTok" htmlFor="tt-url" hint="Sur TikTok : Partager → Copier le lien, puis collez-le ici.">
        <Input id="tt-url" name="url" type="url" required placeholder="https://www.tiktok.com/@compte/video/…" autoComplete="off" />
      </Field>
      <Field label="Titre (facultatif)" htmlFor="tt-title"><Input id="tt-title" name="title" maxLength={150} placeholder="Ex. Soft glam mariée" /></Field>
      <Field label="Catégorie" htmlFor="tt-cat"><CategorySelect id="tt-cat" /></Field>
      <input type="hidden" name="sort_order" value="0" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked className="accent-[var(--color-rosewood)]" /> Publier sur le site</label>
      <p className="text-xs text-muted">La vidéo n&apos;est pas copiée : le site affiche le lecteur officiel TikTok. Si elle est supprimée ou passée en privé sur TikTok, elle ne sera plus lisible ici.</p>
      <div><SubmitButton size="sm">Ajouter la vidéo</SubmitButton></div>
    </form>
  );
}

export function VideoRow({ v }: { v: VideoValues }) {
  const [state, action] = useActionState(updateTikTokVideo, null);
  const [pending, start] = useTransition();
  const [delState, setDel] = useState<FormState>(null);
  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft">
      <FormFeedback state={state ?? delState} />
      <input type="hidden" name="id" value={v.id} />
      <div className="flex items-center justify-between gap-2 text-sm">
        <a href={v.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 truncate font-mono text-xs text-rosewood hover:underline">
          {v.author_handle ? `@${v.author_handle}` : 'TikTok'} · {v.video_id}<ExternalLink className="size-3" />
        </a>
        {!v.is_published && <Badge>Non publiée</Badge>}
      </div>
      <Field label="Titre" htmlFor={`vt-${v.id}`}><Input id={`vt-${v.id}`} name="title" defaultValue={v.title ?? ''} maxLength={150} /></Field>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Field label="Catégorie" htmlFor={`vc-${v.id}`}><CategorySelect id={`vc-${v.id}`} defaultValue={v.category} /></Field>
        <Field label="Ordre" htmlFor={`vo-${v.id}`} hint="Petit = en premier"><Input id={`vo-${v.id}`} name="sort_order" type="number" min={-1000} max={1000} defaultValue={v.sort_order} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={v.is_published} className="accent-[var(--color-rosewood)]" /> Publiée</label>
      <div className="flex items-center justify-between">
        <SubmitButton size="sm" variant="outline">Enregistrer</SubmitButton>
        <button type="button" disabled={pending} className="text-xs text-danger"
          onClick={() => { if (confirm('Retirer cette vidéo du site ? (elle reste sur TikTok)')) start(async () => setDel(await deleteTikTokVideo(v.id))); }}>
          Retirer
        </button>
      </div>
    </form>
  );
}
