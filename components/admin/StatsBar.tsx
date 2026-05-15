import type { DiagnosticStatus } from '@/lib/labels';

interface Diagnostic {
  status: DiagnosticStatus;
  created_at: string;
}

const IN_PROGRESS: DiagnosticStatus[] = [
  'analyzing',
  'quoted',
  'approved',
  'in_progress',
  'testing',
  'ready',
];

export function StatsBar({ diagnostics }: { diagnostics: Diagnostic[] }) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const total = diagnostics.length;
  const nouvelles = diagnostics.filter((d) => d.status === 'received').length;
  const enCours = diagnostics.filter((d) => IN_PROGRESS.includes(d.status)).length;
  const termineesCeMois = diagnostics.filter(
    (d) => d.status === 'completed' && new Date(d.created_at) >= firstOfMonth
  ).length;

  const items = [
    { label: 'Total', value: total, tone: 'neutral' as const },
    { label: 'Nouvelles', value: nouvelles, tone: 'blue' as const },
    { label: 'En cours', value: enCours, tone: 'amber' as const },
    { label: 'Terminées ce mois', value: termineesCeMois, tone: 'emerald' as const },
  ];

  return (
    <div className="grid gap-px overflow-hidden rounded-2xl bg-ink/8 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-bone p-5 lg:p-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">
            {item.label}
          </p>
          <p className="mt-2 text-3xl font-medium tracking-tight text-ink lg:text-4xl">
            {item.value}
          </p>
          {item.tone === 'blue' && nouvelles > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ink-500">
              <span className="h-1.5 w-1.5 rounded-full bg-ink animate-pulse" />
              À traiter
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
