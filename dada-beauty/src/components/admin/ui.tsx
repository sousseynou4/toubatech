import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Badge, type Tone } from '@/components/ui/badge';
import { APPOINTMENT_STATUS_LABEL, ORDER_STATUS_LABEL, type AppointmentStatus, type OrderStatus } from '@/lib/types';

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && <Link href={back.href} className="mb-2 inline-block text-xs text-muted hover:text-ink">← {back.label}</Link>}
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, padded = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn('rounded-[1.25rem] border border-line bg-white shadow-soft', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
          <h2 className="text-[0.95rem] font-semibold">{title}</h2>{action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function KpiCard({ label, value, hint, icon, tone = 'rose', href }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: 'rose' | 'gold' | 'nude' | 'ink'; href?: string }) {
  const tones = { rose: 'bg-powder-100 text-rosewood', gold: 'bg-champagne/45 text-gold-dark', nude: 'bg-nude-50 text-ink-soft', ink: 'bg-ink text-ivory' };
  const body = (
    <div className="flex h-full flex-col rounded-[1.25rem] border border-line bg-white p-5 shadow-soft transition hover:shadow-lift">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span className={cn('grid size-10 place-items-center rounded-xl', tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 font-display text-[2rem] font-semibold leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-powder-200 bg-powder-50/50 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[36rem] text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted [&_tbody_tr]:border-t [&_tbody_tr]:border-line/70 [&_tbody_tr:hover]:bg-powder-50/40">
        {children}
      </table>
    </div>
  );
}

const APPT_TONE: Record<AppointmentStatus, Tone> = {
  pending: 'warning', confirmed: 'info', deposit_paid: 'gold', in_progress: 'rose', completed: 'success', cancelled: 'neutral', no_show: 'danger',
};
export function AppointmentBadge({ status }: { status: AppointmentStatus }) {
  return <Badge tone={APPT_TONE[status]}>{APPOINTMENT_STATUS_LABEL[status]}</Badge>;
}
const ORDER_TONE: Record<OrderStatus, Tone> = {
  pending: 'warning', confirmed: 'info', processing: 'rose', ready_for_pickup: 'gold', shipped: 'info', delivered: 'success', completed: 'success', cancelled: 'neutral', refunded: 'danger',
};
export function OrderBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}
export function ConfigBadge({ status }: { status: 'to_configure' | 'active' | 'inactive' }) {
  return status === 'active' ? <Badge tone="success">Active</Badge> : status === 'inactive' ? <Badge tone="neutral">Inactive</Badge> : <Badge tone="warning">À configurer</Badge>;
}
