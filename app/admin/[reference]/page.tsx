import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, Sparkles, MapPin } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatusSelect } from '@/components/admin/StatusSelect';
import { NotesEditor } from '@/components/admin/NotesEditor';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { getServerSupabase } from '@/lib/supabase';
import {
  DEVICE_LABELS,
  PROBLEM_LABELS,
  INCIDENT_LABELS,
  PICKUP_LABELS,
  TIME_LABELS,
  type DiagnosticStatus,
} from '@/lib/labels';

interface DiagnosticDetail {
  id: string;
  reference: string;
  status: DiagnosticStatus;
  device: string;
  brand: string;
  model: string;
  problems: string[];
  problem_details: string | null;
  incident: string;
  incident_details: string | null;
  full_name: string;
  email: string;
  phone: string;
  pickup: string;
  preferred_date: string | null;
  preferred_time: string | null;
  consent_given: boolean;
  ai_report: Record<string, unknown> | null;
  ai_processed_at: string | null;
  estimated_cost_min: number | null;
  estimated_cost_max: number | null;
  technician_notes: string | null;
  source: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

async function getDiagnostic(reference: string): Promise<DiagnosticDetail | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('diagnostics')
    .select('*')
    .eq('reference', reference)
    .single();

  if (error || !data) {
    return null;
  }
  return data as DiagnosticDetail;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function DiagnosticDetailPage({
  params,
}: {
  params: { reference: string };
}) {
  const diagnostic = await getDiagnostic(params.reference);
  if (!diagnostic) {
    notFound();
  }

  return (
    <>
      <AdminHeader />
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-12">
        {/* Back nav */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Toutes les demandes
        </Link>

        {/* Header */}
        <header className="mt-6 flex flex-col gap-6 border-b border-ink/8 pb-8 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-mono text-lg font-medium tracking-tight text-ink md:text-xl">
                {diagnostic.reference}
              </p>
              <StatusBadge status={diagnostic.status} />
            </div>
            <h1 className="mt-3 text-h1 text-ink">
              {diagnostic.brand} {diagnostic.model}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              {DEVICE_LABELS[diagnostic.device] ?? diagnostic.device} ·{' '}
              {formatDateTime(diagnostic.created_at)}
            </p>
          </div>

          <div className="w-full md:w-72">
            <p className="mb-2 font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
              Statut du ticket
            </p>
            <StatusSelect
              diagnosticId={diagnostic.id}
              initialStatus={diagnostic.status}
            />
          </div>
        </header>

        {/* Main two-column layout */}
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          {/* Left column — content */}
          <div className="space-y-8 lg:col-span-2">
            <Card title="Client">
              <ContactGrid
                fullName={diagnostic.full_name}
                email={diagnostic.email}
                phone={diagnostic.phone}
              />
            </Card>

            <Card title="Problème identifié">
              <div className="flex flex-wrap gap-2">
                {diagnostic.problems.map((problem) => (
                  <span
                    key={problem}
                    className="inline-flex items-center rounded-full bg-ink/5 px-3 py-1 text-sm text-ink"
                  >
                    {PROBLEM_LABELS[problem] ?? problem}
                  </span>
                ))}
              </div>
              {diagnostic.problem_details && (
                <Quote>{diagnostic.problem_details}</Quote>
              )}
            </Card>

            <Card title="Historique & contexte">
              <p className="text-[15px] text-ink">
                {INCIDENT_LABELS[diagnostic.incident] ?? diagnostic.incident}
              </p>
              {diagnostic.incident_details && (
                <Quote>{diagnostic.incident_details}</Quote>
              )}
            </Card>

            {/* AI report placeholder */}
            <Card title="Rapport IA" eyebrowAccent>
              {diagnostic.ai_report ? (
                <pre className="overflow-x-auto rounded-lg bg-ink-700 p-4 text-xs text-bone">
                  {JSON.stringify(diagnostic.ai_report, null, 2)}
                </pre>
              ) : (
                <div className="rounded-2xl border border-dashed border-emerald/30 bg-emerald/5 p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald/10">
                      <Sparkles className="h-4 w-4 text-emerald" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">
                        En attente d'analyse IA
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-500">
                        L'agent IA générera automatiquement un rapport technique
                        pré-rempli (pièces probables, complexité estimée, durée estimée)
                        dès qu'il sera déployé. Le champ <code className="font-mono text-[11px] text-ink">ai_report</code>{' '}
                        est prêt à recevoir ces données.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {diagnostic.estimated_cost_min !== null && diagnostic.estimated_cost_max !== null && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2">
                  <span className="font-mono text-[10px] tracking-wider text-ink-400 uppercase">
                    Estimation
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {(diagnostic.estimated_cost_min / 100).toFixed(2)} € –{' '}
                    {(diagnostic.estimated_cost_max / 100).toFixed(2)} €
                  </span>
                </div>
              )}
            </Card>

            {/* Technician notes — editable */}
            <Card title="Espace technicien" eyebrowAccent>
              <NotesEditor
                diagnosticId={diagnostic.id}
                initialNotes={diagnostic.technician_notes ?? ''}
              />
            </Card>
          </div>

          {/* Right column — meta */}
          <aside className="space-y-6">
            <Card title="Prise en charge" compact>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" />
                  <p className="text-ink">
                    {PICKUP_LABELS[diagnostic.pickup] ?? diagnostic.pickup}
                  </p>
                </div>
                {diagnostic.preferred_date && (
                  <div className="flex items-start gap-2.5">
                    <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" />
                    <div>
                      <p className="text-ink">{formatDate(diagnostic.preferred_date)}</p>
                      {diagnostic.preferred_time && (
                        <p className="text-xs text-ink-400">
                          {TIME_LABELS[diagnostic.preferred_time] ??
                            diagnostic.preferred_time}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Métadonnées" compact>
              <dl className="space-y-3 text-xs">
                <MetaRow label="Reçue le" value={formatDateTime(diagnostic.created_at)} />
                <MetaRow
                  label="Mise à jour"
                  value={formatDateTime(diagnostic.updated_at)}
                />
                <MetaRow label="Source" value={diagnostic.source ?? '—'} mono />
                {diagnostic.ip_address && (
                  <MetaRow label="IP" value={diagnostic.ip_address} mono />
                )}
                <MetaRow
                  label="Consentement RGPD"
                  value={diagnostic.consent_given ? '✓ Accordé' : '— Non accordé'}
                />
              </dl>
            </Card>

            <Card title="Actions rapides" compact>
              <div className="flex flex-col gap-2">
                <a
                  href={`mailto:${diagnostic.email}?subject=Votre%20diagnostic%20${diagnostic.reference}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-xs text-ink-600 transition-colors hover:border-ink/25 hover:text-ink"
                >
                  <Mail className="h-3 w-3" />
                  Répondre par email
                </a>
                <a
                  href={`tel:${diagnostic.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 px-3 py-2 text-xs text-ink-600 transition-colors hover:border-ink/25 hover:text-ink"
                >
                  <Phone className="h-3 w-3" />
                  Appeler le client
                </a>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────── helpers ──────────────────────────────────── */

function Card({
  title,
  eyebrowAccent,
  compact,
  children,
}: {
  title: string;
  eyebrowAccent?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-ink/10 bg-bone ${compact ? 'p-5' : 'p-6 md:p-7'}`}
    >
      <p
        className={`font-mono text-[10px] tracking-[0.2em] uppercase ${
          eyebrowAccent ? 'text-emerald' : 'text-ink-400'
        }`}
      >
        {title}
      </p>
      <div className={compact ? 'mt-4' : 'mt-5'}>{children}</div>
    </section>
  );
}

function ContactGrid({
  fullName,
  email,
  phone,
}: {
  fullName: string;
  email: string;
  phone: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[17px] font-medium tracking-tight text-ink">{fullName}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={`mailto:${email}`}
          className="group inline-flex items-center gap-2 rounded-lg bg-mist/40 px-3 py-2 text-sm text-ink-600 transition-colors hover:bg-mist hover:text-ink"
        >
          <Mail className="h-3.5 w-3.5 text-ink-400 group-hover:text-emerald" />
          <span className="truncate font-mono text-[13px]">{email}</span>
        </a>
        <a
          href={`tel:${phone.replace(/\s/g, '')}`}
          className="group inline-flex items-center gap-2 rounded-lg bg-mist/40 px-3 py-2 text-sm text-ink-600 transition-colors hover:bg-mist hover:text-ink"
        >
          <Phone className="h-3.5 w-3.5 text-ink-400 group-hover:text-emerald" />
          <span className="font-mono text-[13px]">{phone}</span>
        </a>
      </div>
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="mt-4 border-l-2 border-emerald/40 bg-emerald/5 px-4 py-3 text-sm leading-relaxed text-ink-700">
      <p className="whitespace-pre-line">{children}</p>
    </blockquote>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="font-mono text-[10px] tracking-[0.15em] text-ink-400 uppercase">
        {label}
      </dt>
      <dd
        className={`text-right text-[12px] text-ink ${mono ? 'font-mono' : ''}`}
        style={{ maxWidth: '60%' }}
      >
        {value}
      </dd>
    </div>
  );
}
