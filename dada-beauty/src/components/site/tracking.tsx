'use client';

import { useState, useTransition } from 'react';
import { CalendarHeart, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, Field, Input } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime, formatTime, formatXOF } from '@/lib/format';
import { APPOINTMENT_STATUS_LABEL, ORDER_STATUS_LABEL, type AppointmentStatus, type OrderStatus } from '@/lib/types';
import { cancelBooking, lookupBooking, trackOrder, type PublicBooking, type TrackedOrder } from '@/server/public-actions';
import { cn } from '@/lib/cn';

export function Tracking({ initialTab = 'rdv' }: { initialTab?: 'rdv' | 'commande' }) {
  const [tab, setTab] = useState(initialTab);
  return (
    <div className="mx-auto max-w-xl">
      <div role="tablist" className="grid grid-cols-2 rounded-full bg-powder-100 p-1">
        {([['rdv', 'Rendez-vous', CalendarHeart], ['commande', 'Commande', Package]] as const).map(([key, label, Icon]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cn('flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition', tab === key ? 'bg-white shadow-soft' : 'text-muted')}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>
      <div className="mt-8">{tab === 'rdv' ? <BookingLookup /> : <OrderLookup />}</div>
    </div>
  );
}

function BookingLookup() {
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const search = () => start(async () => {
    setError(null); setInfo(null);
    const r = await lookupBooking({ reference, phone });
    if (r.ok) setBooking(r.data); else { setBooking(null); setError(r.error); }
  });
  const cancel = () => {
    if (!confirm('Confirmer l\'annulation de ce rendez-vous ?')) return;
    start(async () => {
      const r = await cancelBooking({ reference, phone });
      if (r.ok) { setInfo('Votre rendez-vous a été annulé.'); setBooking((b) => (b ? { ...b, status: 'cancelled' } : b)); }
      else setError(r.error);
    });
  };

  return (
    <>
      <form className="card grid gap-4 p-6" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <Field label="Référence du rendez-vous" htmlFor="ref"><Input id="ref" placeholder="RDV-…" value={reference} onChange={(e) => setReference(e.target.value)} required autoCapitalize="characters" /></Field>
        <Field label="Téléphone utilisé lors de la réservation" htmlFor="tel"><Input id="tel" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></Field>
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Rechercher</Button>
      </form>
      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      {info && <Alert tone="success" className="mt-4">{info}</Alert>}
      {booking && (
        <div className="card mt-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono font-semibold">{booking.reference}</p>
            <Badge tone={booking.status === 'cancelled' ? 'danger' : booking.status === 'pending' ? 'warning' : 'success'}>{APPOINTMENT_STATUS_LABEL[booking.status as AppointmentStatus]}</Badge>
          </div>
          <p className="mt-4 font-display text-2xl">{booking.services.map((s) => s.name).join(', ')}</p>
          <p className="mt-1 text-ink-soft">{formatDate(booking.start_at)} à {formatTime(booking.start_at)} · avec {booking.employee_name}</p>
          <dl className="mt-4 grid gap-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Montant</dt><dd>{formatXOF(booking.total_amount)}</dd></div>
            {booking.deposit_required > 0 && <div className="flex justify-between"><dt className="text-muted">Acompte</dt><dd>{formatXOF(booking.deposit_required)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Déjà réglé</dt><dd>{formatXOF(booking.paid_amount)}</dd></div>
          </dl>
          {['pending', 'confirmed'].includes(booking.status) && (
            <Button variant="outline" className="mt-6 w-full" onClick={cancel} disabled={pending}>Annuler ce rendez-vous</Button>
          )}
        </div>
      )}
    </>
  );
}

function OrderLookup() {
  const [reference, setReference] = useState('');
  const [secret, setSecret] = useState('');
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const search = () => start(async () => {
    setError(null);
    const r = await trackOrder({ reference, secret });
    if (r.ok) setOrder(r.data); else { setOrder(null); setError(r.error); }
  });
  return (
    <>
      <form className="card grid gap-4 p-6" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <Field label="Référence de commande" htmlFor="oref"><Input id="oref" placeholder="CMD-…" value={reference} onChange={(e) => setReference(e.target.value)} required /></Field>
        <Field label="Code de suivi ou téléphone" htmlFor="osecret"><Input id="osecret" value={secret} onChange={(e) => setSecret(e.target.value)} required /></Field>
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null} Suivre ma commande</Button>
      </form>
      {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
      {order && (
        <div className="card mt-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono font-semibold">{order.reference}</p>
            <Badge tone={['cancelled', 'refunded'].includes(order.status) ? 'danger' : 'rose'}>{ORDER_STATUS_LABEL[order.status as OrderStatus]}</Badge>
          </div>
          <ul className="mt-4 divide-y divide-line text-sm">
            {order.items.map((i, idx) => <li key={idx} className="flex justify-between py-2"><span>{i.quantity} × {i.label}</span><span>{formatXOF(i.line_total)}</span></li>)}
          </ul>
          <p className="mt-3 flex justify-between font-semibold"><span>Total</span><span>{formatXOF(order.total_amount)}</span></p>
          {order.history && (
            <ol className="mt-6 border-l border-powder-200 pl-4 text-sm">
              {order.history.map((h, i) => <li key={i} className="mb-2"><span className="font-medium">{ORDER_STATUS_LABEL[h.status as OrderStatus]}</span> <span className="text-muted">— {formatDateTime(h.at)}</span></li>)}
            </ol>
          )}
        </div>
      )}
    </>
  );
}
