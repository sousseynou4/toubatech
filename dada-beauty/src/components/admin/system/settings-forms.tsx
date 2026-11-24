'use client';

import { useActionState, useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import type { FormState } from '@/server/admin/common';
import { addClosure, completeOnboarding, deleteClosure, saveBooking, saveHours, saveIdentity, saveLoyalty, savePayments, saveShop } from '@/server/admin/settings';
import type { BusinessHour, BusinessSettings } from '@/lib/types';
import { WEEKDAYS_FR } from '@/lib/format';
import { Button } from '@/components/ui/button';

type Action = (p: FormState, f: FormData) => Promise<FormState>;

function SettingsForm({ action, children, submit = 'Enregistrer' }: { action: Action; children: React.ReactNode; submit?: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="grid gap-4">
      <FormFeedback state={state} />
      {children}
      <div><SubmitButton size="sm">{submit}</SubmitButton></div>
    </form>
  );
}

function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-[var(--color-rosewood)]" />
      <span><span className="font-medium">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
    </label>
  );
}

export function IdentityForm({ s }: { s: BusinessSettings }) {
  return (
    <SettingsForm action={saveIdentity}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de l'entreprise" htmlFor="s-name"><Input id="s-name" name="business_name" defaultValue={s.business_name} required /></Field>
        <Field label="Accroche" htmlFor="s-tag"><Input id="s-tag" name="tagline" defaultValue={s.tagline ?? ''} maxLength={200} /></Field>
        <Field label="Téléphone" htmlFor="s-phone"><Input id="s-phone" name="phone" type="tel" defaultValue={s.phone} required /></Field>
        <Field label="WhatsApp" htmlFor="s-wa"><Input id="s-wa" name="whatsapp_phone" type="tel" defaultValue={s.whatsapp_phone} required /></Field>
        <Field label="Email (facultatif)" htmlFor="s-email"><Input id="s-email" name="email" type="email" defaultValue={s.email ?? ''} /></Field>
        <Field label="Logo (URL https)" htmlFor="s-logo" hint="Importez le logo dans la Galerie puis copiez son lien."><Input id="s-logo" name="logo_url" type="url" defaultValue={s.logo_url ?? ''} /></Field>
        <Field label="Adresse" htmlFor="s-addr"><Input id="s-addr" name="address_line" defaultValue={s.address_line} required /></Field>
        <Field label="Ville" htmlFor="s-city"><Input id="s-city" name="city" defaultValue={s.city} required /></Field>
      </div>
      <Field label="Présentation (pages Accueil et À propos)" htmlFor="s-desc"><Textarea id="s-desc" name="description" defaultValue={s.description ?? ''} maxLength={3000} /></Field>
      <Field label="Carte Google Maps intégrée" htmlFor="s-map" hint="Google Maps → Partager → Intégrer une carte → copier l'adresse https://www.google.com/maps/embed?… (uniquement l'URL, sans la balise iframe). Vérifiez la position exacte du salon.">
        <Input id="s-map" name="map_embed_url" defaultValue={s.map_embed_url ?? ''} placeholder="https://www.google.com/maps/embed?pb=…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instagram" htmlFor="s-ig"><Input id="s-ig" name="instagram_url" type="url" defaultValue={s.instagram_url ?? ''} placeholder="https://instagram.com/…" /></Field>
        <Field label="Facebook" htmlFor="s-fb"><Input id="s-fb" name="facebook_url" type="url" defaultValue={s.facebook_url ?? ''} /></Field>
        <Field label="TikTok" htmlFor="s-tt" hint="Lien du profil, ex. https://www.tiktok.com/@aidasamb949 : ses dernières vidéos s’affichent dans la galerie."><Input id="s-tt" name="tiktok_url" type="url" defaultValue={s.tiktok_url ?? ''} /></Field>
        <Field label="Snapchat" htmlFor="s-sc"><Input id="s-sc" name="snapchat_url" type="url" defaultValue={s.snapchat_url ?? ''} /></Field>
      </div>
    </SettingsForm>
  );
}

export function BookingSettingsForm({ s }: { s: BusinessSettings }) {
  return (
    <SettingsForm action={saveBooking}>
      <Toggle name="online_booking_enabled" label="Réservation en ligne ouverte" defaultChecked={s.online_booking_enabled} hint="Seules les prestations actives (prix + durée) et les employées avec planning sont proposées." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pas des créneaux (minutes)" htmlFor="b-step"><Select id="b-step" name="slot_interval_minutes" defaultValue={String(s.slot_interval_minutes)}>{[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</Select></Field>
        <Field label="Délai minimum avant un rendez-vous (minutes)" htmlFor="b-lead" hint="Également le délai d'annulation en ligne."><Input id="b-lead" name="booking_min_lead_minutes" type="number" min={0} max={10080} defaultValue={s.booking_min_lead_minutes} /></Field>
        <Field label="Réservation jusqu'à (jours)" htmlFor="b-max"><Input id="b-max" name="booking_max_days_ahead" type="number" min={1} max={365} defaultValue={s.booking_max_days_ahead} /></Field>
        <Field label="Demandes en attente max. par téléphone" htmlFor="b-pend"><Input id="b-pend" name="max_pending_bookings_per_phone" type="number" min={1} max={20} defaultValue={s.max_pending_bookings_per_phone} /></Field>
        <Field label="Politique d'acompte" htmlFor="b-dep"><Select id="b-dep" name="deposit_policy" defaultValue={s.deposit_policy}><option value="none">Aucun acompte</option><option value="percent">Pourcentage du prix</option><option value="fixed">Montant fixe (FCFA)</option></Select></Field>
        <Field label="Valeur de l'acompte (% ou FCFA)" htmlFor="b-depv" hint="Une prestation peut définir son propre acompte."><Input id="b-depv" name="deposit_value" type="number" min={0} defaultValue={s.deposit_value} /></Field>
      </div>
      <Field label="Politique d'annulation (affichée aux clientes)" htmlFor="b-cancel"><Textarea id="b-cancel" name="cancellation_policy" defaultValue={s.cancellation_policy ?? ''} maxLength={3000} /></Field>
      <Field label="Conditions de réservation complémentaires" htmlFor="b-terms"><Textarea id="b-terms" name="booking_terms" defaultValue={s.booking_terms ?? ''} maxLength={3000} /></Field>
    </SettingsForm>
  );
}

export function ShopSettingsForm({ s }: { s: BusinessSettings }) {
  return (
    <SettingsForm action={saveShop}>
      <Toggle name="shop_enabled" label="Boutique en ligne ouverte" defaultChecked={s.shop_enabled} />
      <Toggle name="pickup_enabled" label="Retrait au salon" defaultChecked={s.pickup_enabled} />
      <Toggle name="delivery_enabled" label="Livraison" defaultChecked={s.delivery_enabled} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Frais de livraison (FCFA)" htmlFor="sh-fee" hint="Vide = frais confirmés par le salon après commande."><Input id="sh-fee" name="delivery_fee" type="number" min={0} defaultValue={s.delivery_fee ?? ''} /></Field>
        <Field label="Zones / délais de livraison" htmlFor="sh-zones"><Input id="sh-zones" name="delivery_zones_note" defaultValue={s.delivery_zones_note ?? ''} maxLength={1000} /></Field>
      </div>
    </SettingsForm>
  );
}

const METHOD_LABEL: Record<string, string> = { cash: 'Espèces', wave: 'Wave', orange_money: 'Orange Money', card: 'Carte bancaire', bank_transfer: 'Virement', other: 'Autre' };

export function PaymentSettingsForm({ s }: { s: BusinessSettings }) {
  return (
    <SettingsForm action={savePayments}>
      <fieldset>
        <legend className="label">Moyens de paiement acceptés (affichés aux clientes)</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(METHOD_LABEL).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm has-[:checked]:border-rosewood has-[:checked]:bg-powder-50">
              <input type="checkbox" name="accepted_payment_methods" value={k} defaultChecked={s.accepted_payment_methods.includes(k as never)} className="accent-[var(--color-rosewood)]" />{l}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Numéro / nom marchand Wave affiché" htmlFor="pm-wave" hint="Communiqué aux clientes pour régler un acompte."><Input id="pm-wave" name="wave_merchant_display" defaultValue={s.wave_merchant_display ?? ''} maxLength={60} /></Field>
        <Field label="Numéro marchand Orange Money affiché" htmlFor="pm-om"><Input id="pm-om" name="orange_money_merchant_display" defaultValue={s.orange_money_merchant_display ?? ''} maxLength={60} /></Field>
      </div>
    </SettingsForm>
  );
}

export function LoyaltySettingsForm({ s }: { s: BusinessSettings }) {
  return (
    <SettingsForm action={saveLoyalty}>
      <Toggle name="loyalty_enabled" label="Programme de fidélité actif" defaultChecked={s.loyalty_enabled} hint="Points attribués automatiquement aux prestations terminées et intégralement payées (jamais aux absences)." />
      <Field label="Points par tranche de 1 000 FCFA" htmlFor="l-pts"><Input id="l-pts" name="loyalty_points_per_1000_xof" type="number" min={0} max={1000} defaultValue={s.loyalty_points_per_1000_xof} /></Field>
    </SettingsForm>
  );
}

export function HoursForm({ hours }: { hours: BusinessHour[] }) {
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  return (
    <SettingsForm action={saveHours} submit="Enregistrer les horaires">
      <div className="grid gap-2">
        {WEEKDAYS_FR.map((label, i) => {
          const d = i + 1;
          const h = byDay.get(d);
          return (
            <div key={d} className="grid grid-cols-[6.5rem_auto_1fr_1fr] items-center gap-2 text-sm">
              <span className="font-medium">{label}</span>
              <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name={`open_${d}`} defaultChecked={h ? !h.is_closed : false} className="accent-[var(--color-rosewood)]" /> Ouvert</label>
              <Input type="time" name={`from_${d}`} defaultValue={h?.open_time?.slice(0, 5) ?? ''} aria-label={`${label} ouverture`} className="py-2" />
              <Input type="time" name={`to_${d}`} defaultValue={h?.close_time?.slice(0, 5) ?? ''} aria-label={`${label} fermeture`} className="py-2" />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">Les pauses se gèrent dans le planning de chaque employée (plusieurs plages par jour).</p>
    </SettingsForm>
  );
}

export function ClosuresManager({ closures }: { closures: { id: string; start_date: string; end_date: string; reason: string | null }[] }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4">
      <SettingsForm action={addClosure} submit="Ajouter la fermeture">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Du" htmlFor="c-from"><Input id="c-from" name="start_date" type="date" required /></Field>
          <Field label="Au (inclus)" htmlFor="c-to"><Input id="c-to" name="end_date" type="date" /></Field>
          <Field label="Motif" htmlFor="c-reason"><Input id="c-reason" name="reason" maxLength={200} placeholder="Tabaski, congés…" /></Field>
        </div>
      </SettingsForm>
      <FormFeedback state={state} />
      {closures.length > 0 && (
        <ul className="divide-y divide-line/70 rounded-xl border border-line text-sm">
          {closures.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>{c.start_date === c.end_date ? c.start_date : `${c.start_date} → ${c.end_date}`}{c.reason && <span className="text-muted"> · {c.reason}</span>}</span>
              <button type="button" disabled={pending} onClick={() => start(async () => setState(await deleteClosure(c.id)))} className="p-1 text-muted hover:text-danger" aria-label="Supprimer"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CompleteOnboardingButton({ disabled }: { disabled: boolean }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <FormFeedback state={state} />
      <Button disabled={disabled || pending} onClick={() => start(async () => setState(await completeOnboarding()))}>Marquer la configuration comme terminée</Button>
      {disabled && <p className="text-xs text-muted">Terminez d&apos;abord les étapes essentielles.</p>}
    </div>
  );
}
