import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function SectionHeading({
  eyebrow, title, intro, align = 'left', className, as: Tag = 'h2',
}: { eyebrow?: string; title: ReactNode; intro?: ReactNode; align?: 'left' | 'center'; className?: string; as?: 'h1' | 'h2' }) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <Tag className="font-display text-[2.1rem] leading-[1.05] font-medium text-ink sm:text-5xl">{title}</Tag>
      {intro && <p className="mt-4 text-[1.02rem] leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}

export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('py-16 sm:py-24', className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}
