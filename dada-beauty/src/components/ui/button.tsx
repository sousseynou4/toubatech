import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap';
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-ivory hover:bg-ink-soft shadow-[0_8px_24px_-12px_rgb(41_35_41/0.6)]',
  secondary: 'bg-powder-100 text-ink hover:bg-powder-200',
  outline: 'border border-ink/15 bg-white/70 text-ink hover:border-rosewood hover:text-rosewood backdrop-blur',
  ghost: 'text-ink-soft hover:bg-powder-100 hover:text-ink',
  gold: 'bg-gold text-ink hover:bg-champagne',
  danger: 'bg-danger text-white hover:opacity-90',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-[0.95rem]',
  lg: 'h-13 px-8 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = 'primary', size = 'md', className, ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href, variant = 'primary', size = 'md', className, children, ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
