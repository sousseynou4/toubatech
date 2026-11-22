import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'rose' | 'gold' | 'success' | 'warning' | 'danger' | 'info';
const tones: Record<Tone, string> = {
  neutral: 'bg-nude-50 text-ink-soft ring-nude',
  rose: 'bg-powder-100 text-rosewood-dark ring-powder-200',
  gold: 'bg-champagne/40 text-gold-dark ring-champagne',
  success: 'bg-[#e8f1ec] text-success ring-[#cfe2d7]',
  warning: 'bg-[#fbf1df] text-warning ring-[#f1dfbd]',
  danger: 'bg-[#f8e6e6] text-danger ring-[#efcfcf]',
  info: 'bg-[#eef0f7] text-[#4b5a86] ring-[#dce0ef]',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  );
}
