import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

export function Section({
  className,
  containerClassName,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { containerClassName?: string }) {
  return (
    <section className={cn('py-20 md:py-30', className)} {...props}>
      <div className={cn('mx-auto max-w-7xl px-5 md:px-8', containerClassName)}>
        {children}
      </div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-emerald uppercase',
        className
      )}
    >
      <span className="h-px w-6 bg-emerald" aria-hidden="true" />
      {children}
    </span>
  );
}
