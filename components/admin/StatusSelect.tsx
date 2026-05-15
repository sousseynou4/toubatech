'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import {
  STATUS_LABELS,
  STATUS_ORDER,
  STATUS_TONES,
  type DiagnosticStatus,
} from '@/lib/labels';
import { cn } from '@/lib/utils';

const TONE_DOT: Record<string, string> = {
  neutral: 'bg-ink-300',
  blue: 'bg-ink',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald',
  red: 'bg-red-500',
};

export function StatusSelect({
  diagnosticId,
  initialStatus,
}: {
  diagnosticId: string;
  initialStatus: DiagnosticStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<DiagnosticStatus>(initialStatus);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function changeStatus(next: DiagnosticStatus) {
    if (next === status) {
      setOpen(false);
      return;
    }

    const previous = status;
    setStatus(next); // optimistic
    setOpen(false);
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/diagnostics/${diagnosticId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });

      if (!response.ok) {
        throw new Error('update_failed');
      }

      // Refresh server data so timestamps stay in sync
      startTransition(() => router.refresh());
    } catch {
      setStatus(previous); // rollback
      setError('Mise à jour impossible — réessayez.');
    } finally {
      setSaving(false);
    }
  }

  const tone = STATUS_TONES[status];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={saving}
        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-ink/12 bg-bone px-4 py-3 text-left transition-all hover:border-ink/25 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <span className={cn('h-2 w-2 rounded-full', TONE_DOT[tone])} />
          <span className="text-sm font-medium text-ink">{STATUS_LABELS[status]}</span>
        </span>
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-400" />
        ) : (
          <ChevronDown
            className={cn(
              'h-4 w-4 text-ink-400 transition-transform',
              open && 'rotate-180'
            )}
          />
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="listbox"
            className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-ink/10 bg-bone shadow-lift"
          >
            {STATUS_ORDER.map((option) => {
              const optionTone = STATUS_TONES[option];
              const selected = option === status;
              return (
                <li key={option} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => changeStatus(option)}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors',
                      selected ? 'bg-mist/40' : 'hover:bg-mist/40'
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={cn('h-2 w-2 rounded-full', TONE_DOT[optionTone])} />
                      <span className="text-ink">{STATUS_LABELS[option]}</span>
                    </span>
                    {selected && <Check className="h-3.5 w-3.5 text-emerald" strokeWidth={3} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
