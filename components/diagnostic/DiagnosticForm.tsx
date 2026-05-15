'use client';

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  type DiagnosticData,
  initialData,
  STEPS,
} from './types';
import {
  Step1Device,
  Step2Model,
  Step3Problem,
  Step4History,
  Step5Contact,
} from './Steps';
import { Step6Summary } from './Summary';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function DiagnosticForm() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<DiagnosticData>(initialData);
  const [status, setStatus] = useState<Status>('idle');
  const [reference, setReference] = useState<string | null>(null);

  const update = useCallback(
    <K extends keyof DiagnosticData>(key: K, value: DiagnosticData[K]) => {
      setData((d) => ({ ...d, [key]: value }));
    },
    []
  );

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return !!data.device;
      case 2:
        return data.brand.length > 0 && data.model.trim().length > 0;
      case 3:
        return data.problems.length > 0;
      case 4:
        return !!data.incident;
      case 5:
        return (
          data.fullName.trim().length > 1 &&
          /^\S+@\S+\.\S+$/.test(data.email) &&
          data.phone.trim().length >= 8 &&
          !!data.pickup &&
          data.consent
        );
      case 6:
        return true;
      default:
        return false;
    }
  }, [step, data]);

  const next = () => setStep((s) => Math.min(s + 1, 6));
  const prev = () => setStep((s) => Math.max(s - 1, 1));
  const goTo = (s: number) => setStep(s);

  const submit = async () => {
    setStatus('submitting');
    try {
      const res = await fetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Submission failed');
      const json = await res.json();
      setReference(json.reference);
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return <SuccessScreen reference={reference} />;
  }

  return (
    <div className="relative">
      {/* Progress rail */}
      <ProgressRail currentStep={step} />

      {/* Form card */}
      <div className="relative mt-8 overflow-hidden rounded-3xl border border-ink/10 bg-bone shadow-soft md:mt-12">
        {/* Subtle decorative gradient at top */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ink via-emerald to-ink opacity-40" />

        <div className="px-5 py-10 md:px-12 md:py-14">
          <AnimatePresence mode="wait">
            <motion.div key={step}>
              {step === 1 && <Step1Device data={data} update={update} />}
              {step === 2 && <Step2Model data={data} update={update} />}
              {step === 3 && <Step3Problem data={data} update={update} />}
              {step === 4 && <Step4History data={data} update={update} />}
              {step === 5 && <Step5Contact data={data} update={update} />}
              {step === 6 && <Step6Summary data={data} onEdit={goTo} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation footer */}
        <div className="flex flex-col gap-3 border-t border-ink/8 bg-mist/30 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-12">
          <Button
            type="button"
            variant="ghost"
            onClick={prev}
            disabled={step === 1 || status === 'submitting'}
            className="order-2 md:order-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>

          <p className="order-1 text-center font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase md:order-2">
            Étape {step} / {STEPS.length}
          </p>

          {step < 6 ? (
            <Button
              type="button"
              onClick={next}
              disabled={!canProceed}
              className="order-3"
            >
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="emerald"
              onClick={submit}
              disabled={status === 'submitting'}
              className="order-3"
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi en cours
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Envoyer ma demande
                </>
              )}
            </Button>
          )}
        </div>

        {status === 'error' && (
          <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800 md:px-12">
            Une erreur est survenue. Vérifiez votre connexion et réessayez, ou contactez-nous
            directement.
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────  PROGRESS  ───────────────────────────────── */
function ProgressRail({ currentStep }: { currentStep: number }) {
  return (
    <div className="relative">
      {/* Step labels — desktop */}
      <ol className="hidden grid-cols-6 gap-2 md:grid" aria-label="Progression du diagnostic">
        {STEPS.map((s) => {
          const done = s.id < currentStep;
          const active = s.id === currentStep;
          return (
            <li key={s.id} className="flex flex-col gap-2">
              <div className="relative h-[3px] overflow-hidden rounded-full bg-ink/8">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald"
                  initial={false}
                  animate={{ width: done ? '100%' : active ? '50%' : '0%' }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] transition-colors ${
                    done
                      ? 'bg-emerald text-bone'
                      : active
                      ? 'bg-ink text-bone'
                      : 'bg-ink/8 text-ink-400'
                  }`}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : s.id}
                </span>
                <span
                  className={`text-xs ${active ? 'font-medium text-ink' : 'text-ink-400'}`}
                >
                  {s.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile: simple progress bar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-[0.18em] text-ink-400 uppercase">
            Étape {currentStep} / 6
          </span>
          <span className="text-xs font-medium text-ink">
            {STEPS[currentStep - 1]?.label}
          </span>
        </div>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-ink/8">
          <motion.div
            className="h-full bg-gradient-to-r from-ink to-emerald"
            initial={false}
            animate={{ width: `${(currentStep / 6) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────  SUCCESS  ───────────────────────────────── */
function SuccessScreen({ reference }: { reference: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-emerald/20 bg-bone p-10 shadow-lift md:p-16"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-ink/5 blur-3xl" />

      <div className="relative">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald text-bone">
          <Check className="h-7 w-7" strokeWidth={2.5} />
        </div>
        <h2 className="mt-6 text-h1 text-ink">Demande bien reçue</h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-500">
          Un email de confirmation vient de partir vers votre boîte. Notre équipe analyse votre
          demande et vous recontacte sous 24h ouvrées avec un pré-diagnostic et une estimation
          tarifaire.
        </p>
        {reference && (
          <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-ink/10 bg-mist/40 px-4 py-2.5">
            <span className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
              Référence
            </span>
            <span className="font-mono text-sm font-medium text-ink">{reference}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
