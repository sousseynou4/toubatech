import Link from 'next/link';
import { cn } from '@/lib/cn';

/** Logotype typographique (remplaçable par le logo officiel via les paramètres). */
export function Logo({ className, href = '/', subtitle = true }: { className?: string; href?: string; subtitle?: boolean }) {
  return (
    <Link href={href} className={cn('group inline-flex flex-col leading-none', className)} aria-label="Dada Beauty — accueil">
      <span className="font-display text-[1.65rem] font-semibold tracking-tight text-ink">
        Dada <span className="italic font-medium text-rosewood">Beauty</span>
      </span>
      {subtitle && <span className="mt-1 text-[0.58rem] uppercase tracking-[0.34em] text-gold-dark">Institut · Guédiawaye</span>}
    </Link>
  );
}
