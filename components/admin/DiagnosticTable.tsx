import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { DEVICE_LABELS, type DiagnosticStatus } from '@/lib/labels';

interface Diagnostic {
  id: string;
  reference: string;
  status: DiagnosticStatus;
  device: string;
  brand: string;
  model: string;
  full_name: string;
  problems: string[];
  created_at: string;
}

function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function DiagnosticTable({ diagnostics }: { diagnostics: Diagnostic[] }) {
  if (diagnostics.length === 0) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-bone p-12 text-center">
        <p className="font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase">
          Aucune demande
        </p>
        <p className="mt-3 text-[15px] text-ink-500">
          Dès qu'un client soumet une demande de diagnostic, elle apparaîtra ici.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-bone">
      {/* Column headers — desktop only */}
      <div className="hidden border-b border-ink/8 bg-mist/40 px-6 py-3 md:grid md:grid-cols-12 md:gap-4">
        <div className="col-span-2 font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
          Référence
        </div>
        <div className="col-span-3 font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
          Appareil
        </div>
        <div className="col-span-2 font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
          Client
        </div>
        <div className="col-span-3 font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
          Statut
        </div>
        <div className="col-span-2 text-right font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase">
          Reçue
        </div>
      </div>

      <ul className="divide-y divide-ink/8">
        {diagnostics.map((d) => (
          <li key={d.id}>
            <Link
              href={`/admin/${d.reference}`}
              className="group block px-5 py-4 transition-colors hover:bg-mist/40 md:px-6 md:py-4"
            >
              {/* Mobile layout */}
              <div className="flex items-start gap-3 md:hidden">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-ink">
                      {d.reference}
                    </span>
                    <StatusBadge status={d.status} size="sm" />
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-ink">
                    {DEVICE_LABELS[d.device]} · {d.brand} {d.model}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-400">
                    {d.full_name} · {timeAgo(d.created_at)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-300 group-hover:text-ink" />
              </div>

              {/* Desktop layout */}
              <div className="hidden md:grid md:grid-cols-12 md:items-center md:gap-4">
                <div className="col-span-2 font-mono text-[13px] font-medium text-ink">
                  {d.reference}
                </div>
                <div className="col-span-3 min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {d.brand} {d.model}
                  </p>
                  <p className="truncate text-[11px] text-ink-400">
                    {DEVICE_LABELS[d.device]}
                  </p>
                </div>
                <div className="col-span-2 min-w-0">
                  <p className="truncate text-sm text-ink">{d.full_name}</p>
                </div>
                <div className="col-span-3">
                  <StatusBadge status={d.status} />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-2 text-xs text-ink-400">
                  {timeAgo(d.created_at)}
                  <ChevronRight className="h-3.5 w-3.5 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
