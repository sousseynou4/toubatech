import { cn } from '@/lib/utils';

export type Grade = 'A' | 'B' | 'C';

const GRADE_CONFIG: Record<
  Grade,
  { label: string; classes: string; description: string }
> = {
  A: {
    label: 'Grade A',
    classes: 'border-emerald/25 bg-emerald/8 text-emerald',
    description: 'Comme neuf',
  },
  B: {
    label: 'Grade B',
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
    description: 'Très bon état',
  },
  C: {
    label: 'Grade C',
    classes: 'border-ink/15 bg-ink/5 text-ink-600',
    description: 'État correct',
  },
};

export function GradeBadge({
  grade,
  size = 'md',
  showDescription = false,
}: {
  grade: Grade;
  size?: 'sm' | 'md';
  showDescription?: boolean;
}) {
  const config = GRADE_CONFIG[grade];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-mono font-medium uppercase tracking-[0.12em]',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        config.classes
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full font-bold leading-none',
          size === 'sm' ? 'h-3.5 w-3.5 text-[9px]' : 'h-4 w-4 text-[10px]',
          grade === 'A' && 'bg-emerald text-bone',
          grade === 'B' && 'bg-amber-500 text-bone',
          grade === 'C' && 'bg-ink-400 text-bone'
        )}
      >
        {grade}
      </span>
      {showDescription ? config.description : config.label}
    </span>
  );
}
