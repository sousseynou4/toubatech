'use client';

import { motion } from 'framer-motion';
import { Check, Smartphone, Tablet, Laptop, Gamepad2, HelpCircle, AlertCircle } from 'lucide-react';
import {
  type DiagnosticData,
  type DeviceType,
  type ProblemKey,
  type IncidentKey,
  type Pickup,
  DEVICE_OPTIONS,
  BRAND_CATALOG,
  PROBLEM_OPTIONS,
  INCIDENT_OPTIONS,
  PICKUP_OPTIONS,
} from './types';
import { cn } from '@/lib/utils';

const DEVICE_ICONS: Record<DeviceType, typeof Smartphone> = {
  smartphone: Smartphone,
  tablette: Tablet,
  'pc-portable': Laptop,
  console: Gamepad2,
  autre: HelpCircle,
};

const stepMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
};

interface StepProps {
  data: DiagnosticData;
  update: <K extends keyof DiagnosticData>(key: K, value: DiagnosticData[K]) => void;
}

/* ─────────────────────────────────  STEP 1  ───────────────────────────────── */
export function Step1Device({ data, update }: StepProps) {
  return (
    <motion.div {...stepMotion}>
      <StepHeader
        eyebrow="Étape 1 sur 5"
        title="Quel type d'appareil souhaitez-vous diagnostiquer ?"
        subtitle="Cette information nous aide à orienter votre demande vers le bon technicien."
      />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEVICE_OPTIONS.map((opt, i) => {
          const Icon = DEVICE_ICONS[opt.key];
          const selected = data.device === opt.key;
          return (
            <motion.button
              key={opt.key}
              type="button"
              onClick={() => update('device', opt.key)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border p-5 text-left transition-all',
                selected
                  ? 'border-ink bg-ink text-bone shadow-lift'
                  : 'border-ink/10 bg-bone hover:border-ink/25 hover:shadow-soft'
              )}
              aria-pressed={selected}
            >
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                  selected ? 'bg-bone/10 text-bone' : 'bg-ink/5 text-ink group-hover:bg-ink/8'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] font-medium tracking-tight">{opt.label}</h3>
                <p className={cn('text-xs', selected ? 'text-bone/70' : 'text-ink-400')}>
                  {opt.description}
                </p>
              </div>
              {selected && (
                <motion.div
                  layoutId="step1-check"
                  className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-emerald"
                >
                  <Check className="h-3.5 w-3.5 text-bone" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────  STEP 2  ───────────────────────────────── */
export function Step2Model({ data, update }: StepProps) {
  const brands = data.device ? BRAND_CATALOG[data.device] : [];
  return (
    <motion.div {...stepMotion}>
      <StepHeader
        eyebrow="Étape 2 sur 5"
        title="Précisez la marque et le modèle"
        subtitle="Plus l'information est précise, plus le diagnostic sera rapide."
      />
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Field label="Marque" htmlFor="brand">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {brands.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => update('brand', brand)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm transition-all',
                  data.brand === brand
                    ? 'border-ink bg-ink text-bone'
                    : 'border-ink/10 bg-bone hover:border-ink/25'
                )}
                aria-pressed={data.brand === brand}
              >
                {brand}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Modèle" htmlFor="model" hint="Ex : iPhone 13 Pro, Galaxy S22, MacBook Air M2…">
          <input
            id="model"
            type="text"
            value={data.model}
            onChange={(e) => update('model', e.target.value)}
            placeholder="Saisissez votre modèle"
            className="w-full rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </Field>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────  STEP 3  ───────────────────────────────── */
export function Step3Problem({ data, update }: StepProps) {
  const toggle = (key: ProblemKey) => {
    const next = data.problems.includes(key)
      ? data.problems.filter((p) => p !== key)
      : [...data.problems, key];
    update('problems', next);
  };
  return (
    <motion.div {...stepMotion}>
      <StepHeader
        eyebrow="Étape 3 sur 5"
        title="Décrivez le problème rencontré"
        subtitle="Sélectionnez tout ce qui s'applique. Plusieurs choix possibles."
      />
      <div className="mt-10 grid gap-3 md:grid-cols-2">
        {PROBLEM_OPTIONS.map((opt) => {
          const selected = data.problems.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key)}
              className={cn(
                'group relative flex items-start gap-4 rounded-2xl border p-4 text-left transition-all',
                selected
                  ? 'border-emerald bg-emerald/5'
                  : 'border-ink/10 bg-bone hover:border-ink/25'
              )}
              aria-pressed={selected}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all',
                  selected ? 'border-emerald bg-emerald' : 'border-ink/20'
                )}
              >
                {selected && <Check className="h-3 w-3 text-bone" strokeWidth={3.5} />}
              </div>
              <div>
                <h3 className="text-[15px] font-medium tracking-tight text-ink">
                  {opt.label}
                </h3>
                <p className="mt-0.5 text-xs text-ink-400">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>
      <Field label="Précisions complémentaires (optionnel)" htmlFor="problem-details" className="mt-6">
        <textarea
          id="problem-details"
          rows={4}
          value={data.problemDetails}
          onChange={(e) => update('problemDetails', e.target.value)}
          placeholder="Décrivez le contexte d'apparition de la panne, les symptômes…"
          className="w-full resize-none rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
      </Field>
    </motion.div>
  );
}

/* ─────────────────────────────────  STEP 4  ───────────────────────────────── */
export function Step4History({ data, update }: StepProps) {
  return (
    <motion.div {...stepMotion}>
      <StepHeader
        eyebrow="Étape 4 sur 5"
        title="Y a-t-il eu un événement déclencheur ?"
        subtitle="Cette information nous aide à anticiper les éventuelles complications."
      />
      <div className="mt-10 space-y-2.5">
        {INCIDENT_OPTIONS.map((opt) => {
          const selected = data.incident === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => update('incident', opt.key as IncidentKey)}
              className={cn(
                'group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all',
                selected
                  ? 'border-ink bg-ink/5'
                  : 'border-ink/10 bg-bone hover:border-ink/25'
              )}
              aria-pressed={selected}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                    selected ? 'border-ink' : 'border-ink/20'
                  )}
                >
                  {selected && <div className="h-2 w-2 rounded-full bg-ink" />}
                </div>
                <span className="text-[15px] text-ink">{opt.label}</span>
              </div>
              {opt.key === 'eau' && (
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald/8 px-2.5 py-1 font-mono text-[10px] tracking-wider text-emerald uppercase sm:inline-flex">
                  <AlertCircle className="h-3 w-3" /> Désox. en salle blanche
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Field label="Précisez le contexte (optionnel)" htmlFor="incident-details" className="mt-6">
        <textarea
          id="incident-details"
          rows={3}
          value={data.incidentDetails}
          onChange={(e) => update('incidentDetails', e.target.value)}
          placeholder="Quand cela s'est-il produit ? Avez-vous tenté quelque chose depuis ?"
          className="w-full resize-none rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        />
      </Field>
    </motion.div>
  );
}

/* ─────────────────────────────────  STEP 5  ───────────────────────────────── */
export function Step5Contact({ data, update }: StepProps) {
  return (
    <motion.div {...stepMotion}>
      <StepHeader
        eyebrow="Étape 5 sur 5"
        title="Vos coordonnées et la prise en charge"
        subtitle="Nous vous recontactons sous 24h ouvrées avec un pré-diagnostic et une estimation."
      />
      <div className="mt-10 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nom complet" htmlFor="fullName" required>
            <input
              id="fullName"
              type="text"
              value={data.fullName}
              onChange={(e) => update('fullName', e.target.value)}
              required
              autoComplete="name"
              className="w-full rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </Field>
          <Field label="Téléphone" htmlFor="phone" required>
            <input
              id="phone"
              type="tel"
              value={data.phone}
              onChange={(e) => update('phone', e.target.value)}
              required
              autoComplete="tel"
              placeholder="06 XX XX XX XX"
              className="w-full rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </Field>
        </div>
        <Field label="Email" htmlFor="email" required>
          <input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
            className="w-full rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[15px] text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
          />
        </Field>

        <div>
          <p className="mb-3 font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
            Mode de prise en charge
          </p>
          <div className="space-y-2.5">
            {PICKUP_OPTIONS.map((opt) => {
              const selected = data.pickup === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => update('pickup', opt.key as Pickup)}
                  className={cn(
                    'group flex w-full items-start justify-between gap-4 rounded-2xl border px-5 py-4 text-left transition-all',
                    selected
                      ? 'border-emerald bg-emerald/5'
                      : 'border-ink/10 bg-bone hover:border-ink/25'
                  )}
                  aria-pressed={selected}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                        selected ? 'border-emerald' : 'border-ink/20'
                      )}
                    >
                      {selected && <div className="h-2 w-2 rounded-full bg-emerald" />}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium tracking-tight text-ink">
                        {opt.label}
                      </h3>
                      <p className="mt-0.5 text-xs text-ink-400">{opt.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Date souhaitée (optionnel)" htmlFor="preferredDate">
            <input
              id="preferredDate"
              type="date"
              value={data.preferredDate}
              onChange={(e) => update('preferredDate', e.target.value)}
              className="w-full rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            />
          </Field>
          <Field label="Créneau" htmlFor="preferredTime">
            <select
              id="preferredTime"
              value={data.preferredTime}
              onChange={(e) => update('preferredTime', e.target.value)}
              className="w-full rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[15px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
            >
              <option value="">— Sélectionnez —</option>
              <option value="matin">Matin (9h – 12h)</option>
              <option value="apres-midi">Après-midi (14h – 18h)</option>
              <option value="indifferent">Indifférent</option>
            </select>
          </Field>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/8 bg-mist/40 p-4">
          <input
            type="checkbox"
            checked={data.consent}
            onChange={(e) => update('consent', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink/20 text-ink focus:ring-ink/20"
          />
          <span className="text-xs leading-relaxed text-ink-500">
            J'accepte que TOUBA TECH traite mes données pour me recontacter au sujet de cette
            demande de diagnostic. Aucune communication marketing sans consentement explicite.
          </span>
        </label>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────  HELPERS  ───────────────────────────────── */
function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] tracking-[0.2em] text-emerald uppercase">{eyebrow}</p>
      <h2 className="text-h1 text-ink">{title}</h2>
      {subtitle && <p className="max-w-xl text-[15px] leading-relaxed text-ink-500">{subtitle}</p>}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-ink">
        {label}
        {required && <span className="text-emerald">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
