import { cn } from '@/lib/utils';
import {
  STATUS_LABELS,
  STATUS_TONES,
  type DiagnosticStatus,
  type StatusTone,
} from '@/lib/labels';

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-ink/8 text-ink-600 ring-ink/10',
  blue: 'bg-ink/10 text-ink ring-ink/15',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  emerald: 'bg-emerald/10 text-emerald ring-emerald/20',
  red: 'bg-red-50 text-red-700 ring-red-200',
};

const DOT_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-ink-300',
  blue: 'bg-ink',
  amber: 'bg-amber-500',
  emerald: 'bg-emerald',
  red: 'bg-red-500',
};

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: DiagnosticStatus;
  size?: 'sm' | 'md';
}) {
  const tone = STATUS_TONES[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONE_CLASSES[tone]
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full',
          size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
          DOT_CLASSES[tone]
        )}
      />
      {label}
    </span>
  );
}
