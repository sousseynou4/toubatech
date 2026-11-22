'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, Loader2, MessageCircle, Tag, User, Wallet, X } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { Alert, Field, Input, Textarea } from '@/components/ui/field';
import { ArtImage } from '@/components/ui/art-image';
import { addDays, formatDate, formatDuration, formatPrice, formatTime, formatXOF, isoWeekday, todayInDakar } from '@/lib/format';
import { whatsappLink } from '@/lib/phone';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/types';
import { cn } from '@/lib/cn';
import { fetchServiceEmployees, fetchSlots, previewBookingPromotion, submitBooking, type BookingConfirmation, type BookingPromotionPreview, type Slot } from '@/server/public-actions';

export interface WizardService {
  id: string; slug: string; name: string; short_description: string | null; description: string | null; price: number;
  price_is_from: boolean; duration_minutes: number; deposit: number; conditions: string | null; imageUrl: string | null;
}
export interface WizardCategory { slug: string; name: string; tagline: string | null; services: WizardService[] }
export interface WizardSettings {
  maxDaysAhead: number; closedWeekdays: number[]; paymentMethods: PaymentMethod[]; whatsapp: string;
  waveMerchant: string | null; orangeMerchant: string | null; cancellationPolicy: string | null;
}

function findInitial(categories: WizardCategory[], slug?: string) {
  for (const c of categories) {
    const s = c.services.find((x) => x.slug === slug);
    if (s) return { cat: c.slug, svc: s.id };
  }
  return null;
}

const STEPS = ['Catégorie', 'Prestation', 'Détails', 'Experte', 'Date', 'Heure', 'Coordonnées', 'Paiement', 'Validation'] as const;

export function BookingWizard({ categories, settings, initialService }: { categories: WizardCategory[]; settings: WizardSettings; initialService?: string }) {
  const initial = findInitial(categories, initialService);

  const [step, setStep] = useState(initial ? 2 : 0);
  const [categorySlug, setCategorySlug] = useState(initial?.cat ?? '');
  const [serviceId, setServiceId] = useState(initial?.svc ?? '');
  const [employees, setEmployees] = useState<{ id: string; display_name: string; specialties: string[] }[] | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  // Incrémenté quand un créneau vient d'être pris : force le rechargement des disponibilités.
  const [slotsVersion, setSlotsVersion] = useState(0);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [contact, setContact] = useState({ fullName: '', phone: '', email: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingConfirmation | null>(null);
  const [pending, startTransition] = useTransition();
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<(BookingPromotionPreview & { serviceId: string }) | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, startPromo] = useTransition();

  const category = categories.find((c) => c.slug === categorySlug);
  const service = categories.flatMap((c) => c.services).find((s) => s.id === serviceId);
  // La remise est liée à la prestation choisie : si elle change, le code doit être réappliqué.
  const activePromo = promo && promo.serviceId === serviceId ? promo : null;

  function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code || !serviceId) return;
    setPromoError(null);
    startPromo(async () => {
      const r = await previewBookingPromotion({ code, serviceId });
      if (r.ok) { setPromo({ ...r.data, serviceId }); setPromoInput(r.data.code); }
      else { setPromo(null); setPromoError(r.error); }
    });
  }
  const today = todayInDakar();
  const days = useMemo(() => Array.from({ length: Math.min(settings.maxDaysAhead + 1, 120) }, (_, i) => addDays(today, i)), [today, settings.maxDaysAhead]);
  const visibleDays = days.slice(weekOffset * 7, weekOffset * 7 + 7);

  useEffect(() => {
    if (!serviceId) return;
    let cancelled = false;
    fetchServiceEmployees(serviceId).then((r) => { if (!cancelled) setEmployees(r.ok ? r.data : []); });
    return () => { cancelled = true; };
  }, [serviceId]);

  useEffect(() => {
    if (!serviceId || !date) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots(null);
    fetchSlots({ serviceId, date, employeeId: employeeId || undefined }).then((r) => {
      if (cancelled) return;
      if (r.ok) setSlots(r.data); else { setSlots([]); setError(r.error); }
    });
    return () => { cancelled = true; };
  }, [serviceId, date, employeeId, slotsVersion]);

  const go = (n: number) => { setError(null); setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  function validateContact() {
    const e: Record<string, string> = {};
    if (contact.fullName.trim().length < 2) e.fullName = 'Indiquez votre nom';
    if (contact.phone.replace(/\D/g, '').length < 9) e.phone = 'Numéro de téléphone invalide';
    if (contact.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) e.email = 'Email invalide';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    if (!service || !slot) return;
    if (!acceptTerms) { setErrors({ acceptTerms: 'Merci d\'accepter les conditions' }); return; }
    setError(null);
    startTransition(async () => {
      const r = await submitBooking({
        serviceId: service.id, employeeId: employeeId || undefined, start: slot.start, fullName: contact.fullName,
        phone: contact.phone, email: contact.email || undefined, notes: contact.notes || undefined,
        paymentMethod: paymentMethod || undefined, marketingConsent, acceptTerms, promotionCode: activePromo?.code,
      });
      if (r.ok) { setResult(r.data); setStep(9); window.scrollTo({ top: 0 }); return; }
      if (r.error.includes('créneau')) {
        // Créneau pris entre-temps : retour au choix de l'heure avec des disponibilités à jour.
        // go() efface l'erreur, elle est donc posée après.
        setSlot(null); go(5); setSlotsVersion((v) => v + 1);
      }
      // Code devenu invalide entre l'aperçu et la validation (épuisé, expiré…) : on le retire pour permettre de réserver sans.
      if (r.error.startsWith('Ce code promo') || r.error.startsWith('Le montant minimum')) { setPromo(null); setPromoError(r.error); }
      setError(r.error);
      if (r.fields) setErrors(r.fields);
    });
  }

  if (categories.length === 0) {
    return (
      <Alert className="mx-auto max-w-xl">
        La réservation en ligne sera disponible dès que les prestations, tarifs et horaires auront été configurés par le salon.
        <a href={whatsappLink('Bonjour Dada Beauty, je souhaite prendre rendez-vous.', settings.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'md', 'mt-4 w-full')}>
          <MessageCircle className="size-4" /> Réserver sur WhatsApp
        </a>
      </Alert>
    );
  }

  // ── Étape 10 : récapitulatif
  if (step === 9 && result) {
    return (
      <div className="mx-auto max-w-xl animate-fade-up text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-powder-100"><Check className="size-8 text-rosewood" /></div>
        <h2 className="mt-6 font-display text-4xl">Demande envoyée !</h2>
        <p className="mt-3 text-ink-soft">Votre demande de rendez-vous est enregistrée. Le salon vous contacte pour la confirmer.</p>
        <div className="card mt-8 p-6 text-left">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Référence</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-wider" data-testid="booking-reference">{result.reference}</p>
          <dl className="mt-5 grid gap-3 text-sm">
            <Row label="Prestation" value={result.service_name} />
            <Row label="Date" value={`${formatDate(result.start_at)} à ${formatTime(result.start_at)}`} />
            <Row label="Avec" value={result.employee_name} />
            {result.discount_amount > 0 && <Row label={`Remise (${result.promotion_code})`} value={`−${formatXOF(result.discount_amount)}`} />}
            <Row label="Montant" value={formatXOF(result.total_amount)} />
            {result.deposit_required > 0 && <Row label="Acompte à régler" value={formatXOF(result.deposit_required)} />}
          </dl>
          {result.deposit_required > 0 && (
            <p className="mt-4 rounded-xl bg-powder-50 p-3 text-xs text-ink-soft">
              Le salon vous indiquera comment régler l&apos;acompte{settings.waveMerchant ? ` (Wave : ${settings.waveMerchant})` : ''}{settings.orangeMerchant ? ` (Orange Money : ${settings.orangeMerchant})` : ''}. Le rendez-vous est confirmé après réception.
            </p>
          )}
        </div>
        <p className="mt-6 text-sm text-muted">Conservez votre référence : elle vous permet de consulter ou d&apos;annuler votre rendez-vous.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a href={whatsappLink(`Bonjour Dada Beauty, je viens de faire une demande de rendez-vous (réf. ${result.reference}).`, settings.whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClass('primary')}>
            <MessageCircle className="size-4" /> Prévenir le salon sur WhatsApp
          </a>
          <Link href="/suivi" className={buttonClass('outline')}>Gérer mon rendez-vous</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progression */}
      <ol className="mb-8 flex gap-1" aria-label="Étapes de la réservation">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1" aria-current={i === step ? 'step' : undefined}>
            <div className={cn('h-1 rounded-full transition-colors', i <= step ? 'bg-rosewood' : 'bg-powder-200')} />
            <span className={cn('mt-2 hidden text-[0.68rem] sm:block', i === step ? 'font-semibold text-ink' : 'text-muted')}>{label}</span>
          </li>
        ))}
      </ol>
      <p className="mb-2 text-xs text-muted sm:hidden">Étape {step + 1} / {STEPS.length} · {STEPS[step]}</p>
      {step > 0 && (
        <button type="button" onClick={() => go(step === 2 && !category ? 0 : step - 1)} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Retour
        </button>
      )}
      {error && <Alert tone="danger" className="mb-5">{error}</Alert>}

      {step === 0 && (
        <StepTitle title="Quelle envie aujourd'hui ?">
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.map((c) => (
              <button key={c.slug} type="button" onClick={() => { setCategorySlug(c.slug); go(1); }}
                className="card group flex items-center gap-4 p-3 text-left transition hover:shadow-lift">
                <ArtImage alt={c.name} theme={c.slug} label=" " className="size-20 shrink-0 rounded-xl" showPlaceholderTag={false} />
                <span>
                  <span className="block font-display text-2xl">{c.name}</span>
                  <span className="text-xs text-muted">{c.services.length} prestation{c.services.length > 1 ? 's' : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </StepTitle>
      )}

      {step === 1 && category && (
        <StepTitle title={category.name} subtitle="Choisissez votre prestation">
          <div className="grid gap-3">
            {category.services.map((s) => (
              <button key={s.id} type="button" onClick={() => { setServiceId(s.id); setEmployeeId(''); setDate(''); setSlot(null); go(2); }}
                className={cn('card flex items-center justify-between gap-4 p-5 text-left transition hover:shadow-lift', serviceId === s.id && 'ring-2 ring-blush')}>
                <span>
                  <span className="block text-lg font-medium">{s.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-sm text-muted"><Clock className="size-3.5" />{formatDuration(s.duration_minutes)}</span>
                </span>
                <span className="shrink-0 font-semibold">{formatPrice(s.price, s.price_is_from)}</span>
              </button>
            ))}
          </div>
        </StepTitle>
      )}

      {step === 2 && service && (
        <StepTitle title={service.name}>
          <div className="card overflow-hidden">
            <ArtImage src={service.imageUrl} alt={service.name} theme={categorySlug} label={service.name} className="aspect-[16/7]" showPlaceholderTag={false} />
            <div className="p-6">
              {service.short_description && <p className="text-ink-soft">{service.short_description}</p>}
              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Info icon={<Wallet className="size-4" />} label="Prix" value={formatPrice(service.price, service.price_is_from)} />
                <Info icon={<Clock className="size-4" />} label="Durée" value={formatDuration(service.duration_minutes)} />
                {service.deposit > 0 && <Info icon={<Wallet className="size-4" />} label="Acompte" value={formatXOF(service.deposit)} />}
              </dl>
              {service.description && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{service.description}</p>}
              {service.conditions && <p className="mt-4 rounded-xl bg-powder-50 p-3 text-sm text-ink-soft">{service.conditions}</p>}
              <Button className="mt-6 w-full sm:w-auto" onClick={() => go(3)}>Continuer</Button>
            </div>
          </div>
        </StepTitle>
      )}

      {step === 3 && service && (
        <StepTitle title="Avec qui ?" subtitle="Choisissez une experte ou laissez-nous vous attribuer la première disponible.">
          {employees === null ? <Loading /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard selected={employeeId === ''} onClick={() => { setEmployeeId(''); setSlot(null); go(4); }} title="Peu importe" subtitle="Première experte disponible" />
              {employees.map((e) => (
                <ChoiceCard key={e.id} selected={employeeId === e.id} onClick={() => { setEmployeeId(e.id); setSlot(null); go(4); }}
                  title={e.display_name} subtitle={e.specialties.join(' · ') || 'Experte beauté'} />
              ))}
              {employees.length === 0 && <Alert tone="warning" className="sm:col-span-2">Aucune experte n&apos;est encore disponible en ligne pour cette prestation. Contactez-nous sur WhatsApp.</Alert>}
            </div>
          )}
        </StepTitle>
      )}

      {step === 4 && service && (
        <StepTitle title="Quel jour ?">
          <div className="flex items-center justify-between">
            <button type="button" className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-30" disabled={weekOffset === 0} onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semaine précédente"><ChevronLeft className="size-5" /></button>
            <p className="text-sm font-medium capitalize text-ink-soft">{visibleDays[0] && new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(visibleDays[0]))}</p>
            <button type="button" className="grid size-10 place-items-center rounded-full border border-line disabled:opacity-30" disabled={(weekOffset + 1) * 7 >= days.length} onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semaine suivante"><ChevronRight className="size-5" /></button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
            {visibleDays.map((d) => {
              const closed = settings.closedWeekdays.includes(isoWeekday(d));
              const dt = new Date(`${d}T12:00:00Z`);
              return (
                <button key={d} type="button" disabled={closed} onClick={() => { setDate(d); setSlot(null); go(5); }}
                  aria-label={formatDate(`${d}T12:00:00Z`)}
                  className={cn('flex flex-col items-center rounded-2xl border py-3 text-center transition', closed ? 'cursor-not-allowed border-transparent bg-nude-50 text-muted/60 line-through' : 'border-line bg-white hover:border-blush', date === d && 'border-rosewood bg-powder-50')}>
                  <span className="text-[0.65rem] uppercase text-muted">{new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(dt).replace('.', '')}</span>
                  <span className="mt-1 text-lg font-semibold">{dt.getUTCDate()}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">Les jours barrés correspondent aux jours de fermeture du salon.</p>
        </StepTitle>
      )}

      {step === 5 && service && date && (
        <StepTitle title="À quelle heure ?" subtitle={formatDate(`${date}T12:00:00Z`)}>
          {slots === null ? <Loading /> : slots.length === 0 ? (
            <Alert tone="warning">Aucun créneau disponible ce jour-là. <button className="font-semibold underline" onClick={() => go(4)}>Choisir une autre date</button></Alert>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="listbox" aria-label="Créneaux disponibles">
              {slots.map((s) => (
                <button key={s.start} type="button" role="option" aria-selected={slot?.start === s.start} onClick={() => { setSlot(s); go(6); }}
                  className={cn('rounded-xl border py-3 text-sm font-medium tabular-nums transition', slot?.start === s.start ? 'border-rosewood bg-rosewood text-white' : 'border-line bg-white hover:border-blush')}>
                  {formatTime(s.start)}
                </button>
              ))}
            </div>
          )}
        </StepTitle>
      )}

      {step === 6 && (
        <StepTitle title="Vos coordonnées" subtitle="Pour vous confirmer le rendez-vous.">
          <form className="card grid gap-4 p-6" onSubmit={(e) => { e.preventDefault(); if (validateContact()) go(7); }} noValidate>
            <Field label="Nom et prénom" error={errors.fullName} htmlFor="fullName">
              <Input id="fullName" autoComplete="name" value={contact.fullName} invalid={!!errors.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} required />
            </Field>
            <Field label="Téléphone (WhatsApp de préférence)" error={errors.phone} htmlFor="phone" hint="Ex. 77 123 45 67">
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={contact.phone} invalid={!!errors.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} required />
            </Field>
            <Field label="Email (facultatif)" error={errors.email} htmlFor="email">
              <Input id="email" type="email" autoComplete="email" value={contact.email} invalid={!!errors.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            </Field>
            <Field label="Remarques (facultatif)" htmlFor="notes" hint="Allergies, inspiration, occasion…">
              <Textarea id="notes" maxLength={1000} value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} />
            </Field>
            <Button type="submit" className="mt-2">Continuer</Button>
          </form>
        </StepTitle>
      )}

      {step === 7 && service && (
        <StepTitle title="Paiement" subtitle={service.deposit > 0 ? `Un acompte de ${formatXOF(service.deposit)} sera demandé pour confirmer le rendez-vous.` : 'Le règlement s\'effectue au salon, aucun paiement n\'est demandé maintenant.'}>
          <div className="grid gap-3 sm:grid-cols-2">
            {settings.paymentMethods.map((m) => (
              <ChoiceCard key={m} selected={paymentMethod === m} onClick={() => setPaymentMethod(m)} title={PAYMENT_METHOD_LABEL[m]}
                subtitle={m === 'cash' ? 'Au salon' : m === 'wave' && settings.waveMerchant ? `Numéro : ${settings.waveMerchant}` : m === 'orange_money' && settings.orangeMerchant ? `Numéro : ${settings.orangeMerchant}` : 'Selon les instructions du salon'} />
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">Aucun paiement n&apos;est encaissé en ligne à cette étape : vous indiquez simplement votre moyen de paiement préféré.</p>
          <Button className="mt-6 w-full sm:w-auto" onClick={() => go(8)}>Continuer</Button>
        </StepTitle>
      )}

      {step === 8 && service && slot && (
        <StepTitle title="Récapitulatif">
          <div className="card p-6">
            <dl className="grid gap-3 text-sm">
              <Row label="Prestation" value={service.name} />
              <Row label="Date" value={`${formatDate(slot.start)} à ${formatTime(slot.start)}`} />
              <Row label="Durée" value={formatDuration(service.duration_minutes)} />
              <Row label="Experte" value={employeeId ? employees?.find((e) => e.id === employeeId)?.display_name ?? '—' : 'Première disponible'} />
              <Row label="Nom" value={contact.fullName} />
              <Row label="Téléphone" value={contact.phone} />
              {paymentMethod && <Row label="Paiement" value={PAYMENT_METHOD_LABEL[paymentMethod]} />}
              <div className="gold-rule my-2" />
              {activePromo ? (
                <>
                  <Row label="Prix" value={formatPrice(service.price, service.price_is_from)} />
                  <Row label={`Remise (${activePromo.code})`} value={`−${formatXOF(activePromo.discount)}`} />
                  <Row label="Total" value={formatXOF(activePromo.total_amount)} strong />
                  {activePromo.deposit_required > 0 && <Row label="Acompte" value={formatXOF(activePromo.deposit_required)} />}
                </>
              ) : (
                <>
                  <Row label="Total" value={formatPrice(service.price, service.price_is_from)} strong />
                  {service.deposit > 0 && <Row label="Acompte" value={formatXOF(service.deposit)} />}
                </>
              )}
            </dl>
            <div className="mt-5">
              <label htmlFor="b-promo" className="label">Code promo (facultatif)</label>
              {activePromo ? (
                <p className="flex items-center justify-between rounded-2xl border border-rosewood bg-powder-50 px-4 py-2.5 text-sm">
                  <span><Tag className="mr-1.5 inline size-4 text-rosewood" /><strong className="font-mono">{activePromo.code}</strong>
                    {activePromo.description && <span className="text-muted"> · {activePromo.description}</span>}</span>
                  <button type="button" onClick={() => { setPromo(null); setPromoInput(''); }} className="p-1 text-muted hover:text-danger" aria-label="Retirer le code promo"><X className="size-4" /></button>
                </p>
              ) : (
                <div className="flex gap-2">
                  <Input id="b-promo" value={promoInput} onChange={(e) => setPromoInput(e.target.value)} maxLength={30} className="uppercase" autoComplete="off"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } }} />
                  <Button type="button" variant="outline" onClick={applyPromo} disabled={promoPending || !promoInput.trim()}>
                    {promoPending && <Loader2 className="size-4 animate-spin" />} Appliquer
                  </Button>
                </div>
              )}
              {promoError && <p className="mt-1.5 text-xs text-danger" role="alert">{promoError}</p>}
            </div>
            {settings.cancellationPolicy && <p className="mt-5 whitespace-pre-line rounded-xl bg-powder-50 p-3 text-xs text-ink-soft">{settings.cancellationPolicy}</p>}
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-rosewood)]" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
              <span>J&apos;accepte les <Link href="/conditions" target="_blank" className="text-rosewood underline">conditions de réservation</Link>.</span>
            </label>
            {errors.acceptTerms && <p className="mt-1 text-xs text-danger">{errors.acceptTerms}</p>}
            <label className="mt-3 flex items-start gap-3 text-sm text-ink-soft">
              <input type="checkbox" className="mt-0.5 size-4 accent-[var(--color-rosewood)]" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} />
              <span>J&apos;accepte de recevoir les offres et nouveautés de Dada Beauty (facultatif).</span>
            </label>
            <Button className="mt-6 w-full" size="lg" onClick={submit} disabled={pending}>
              {pending ? <><Loader2 className="size-5 animate-spin" /> Envoi…</> : 'Confirmer ma demande'}
            </Button>
          </div>
        </StepTitle>
      )}
    </div>
  );
}

function StepTitle({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade-up">
      <h2 className="font-display text-3xl sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-1 text-muted first-letter:uppercase">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
function ChoiceCard({ selected, onClick, title, subtitle }: { selected: boolean; onClick: () => void; title: string; subtitle?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cn('card flex items-center gap-4 p-5 text-left transition hover:shadow-lift', selected && 'ring-2 ring-rosewood')}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-powder-100 text-rosewood"><User className="size-5" /></span>
      <span><span className="block font-medium">{title}</span>{subtitle && <span className="text-sm text-muted">{subtitle}</span>}</span>
    </button>
  );
}
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between gap-4"><dt className="text-muted">{label}</dt><dd className={cn('text-right', strong && 'font-semibold text-ink')}>{value}</dd></div>;
}
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl bg-powder-50 p-3"><dt className="flex items-center gap-1 text-xs text-muted">{icon}{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>;
}
function Loading() {
  return <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton h-12" />)}</div>;
}
