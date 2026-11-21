import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Field({ label, error, hint, children, className, htmlFor }: {
  label: string; error?: string; hint?: ReactNode; children: ReactNode; className?: string; htmlFor?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
}

export function Input({ className, invalid, ...props }: ComponentProps<'input'> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn('field', className)} {...props} />;
}
export function Textarea({ className, invalid, ...props }: ComponentProps<'textarea'> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cn('field min-h-24', className)} {...props} />;
}
export function Select({ className, invalid, ...props }: ComponentProps<'select'> & { invalid?: boolean }) {
  return <select aria-invalid={invalid || undefined} className={cn('field appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10', className)}
    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2381747A' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")" }} {...props} />;
}

export function Alert({ tone = 'info', children, className }: { tone?: 'info' | 'success' | 'warning' | 'danger'; children: ReactNode; className?: string }) {
  const tones = {
    info: 'bg-powder-50 border-powder-200 text-ink-soft',
    success: 'bg-[#eef5f0] border-[#cfe2d7] text-success',
    warning: 'bg-[#fcf5e8] border-[#f1dfbd] text-[#8a6320]',
    danger: 'bg-[#fbeeee] border-[#efcfcf] text-danger',
  };
  return <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-2xl border px-4 py-3 text-sm leading-relaxed', tones[tone], className)}>{children}</div>;
}
