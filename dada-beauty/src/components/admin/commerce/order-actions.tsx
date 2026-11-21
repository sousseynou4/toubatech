'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { FormFeedback } from '@/components/admin/form-bits';
import { setOrderStatus } from '@/server/admin/commerce';
import type { FormState } from '@/server/admin/common';
import type { OrderStatus } from '@/lib/types';

/** Transitions autorisées (identiques à public.set_order_status). */
const NEXT: Record<OrderStatus, { to: OrderStatus; label: string; variant: 'primary' | 'outline' | 'danger' }[]> = {
  pending: [{ to: 'confirmed', label: 'Confirmer', variant: 'primary' }, { to: 'processing', label: 'En préparation', variant: 'outline' }, { to: 'cancelled', label: 'Annuler', variant: 'danger' }],
  confirmed: [{ to: 'processing', label: 'En préparation', variant: 'primary' }, { to: 'ready_for_pickup', label: 'Prête à retirer', variant: 'outline' }, { to: 'shipped', label: 'Expédiée', variant: 'outline' }, { to: 'cancelled', label: 'Annuler', variant: 'danger' }],
  processing: [{ to: 'ready_for_pickup', label: 'Prête à retirer', variant: 'primary' }, { to: 'shipped', label: 'Expédiée', variant: 'outline' }, { to: 'cancelled', label: 'Annuler', variant: 'danger' }],
  ready_for_pickup: [{ to: 'delivered', label: 'Remise à la cliente', variant: 'primary' }, { to: 'cancelled', label: 'Annuler', variant: 'danger' }],
  shipped: [{ to: 'delivered', label: 'Livrée', variant: 'primary' }, { to: 'cancelled', label: 'Annuler', variant: 'danger' }],
  delivered: [{ to: 'refunded', label: 'Marquer remboursée', variant: 'danger' }],
  completed: [{ to: 'refunded', label: 'Marquer remboursée', variant: 'danger' }],
  cancelled: [], refunded: [],
};

export function OrderStatusActions({ id, status, fulfillment, canRefund }: { id: string; status: OrderStatus; fulfillment: string; canRefund: boolean }) {
  const [state, setState] = useState<FormState>(null);
  const [pending, start] = useTransition();
  const actions = NEXT[status]
    .filter((a) => !(fulfillment === 'pickup' && a.to === 'shipped'))
    .filter((a) => !(fulfillment === 'delivery' && a.to === 'ready_for_pickup'))
    .filter((a) => a.to !== 'refunded' || canRefund);
  if (!actions.length) return <p className="text-sm text-muted">Commande clôturée.</p>;
  return (
    <div className="grid gap-3">
      <FormFeedback state={state} />
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.to} size="sm" variant={a.variant} disabled={pending} onClick={() => {
            let note: string | undefined;
            if (a.to === 'cancelled' || a.to === 'refunded') {
              const r = prompt(a.to === 'cancelled' ? 'Motif de l\'annulation (le stock sera remis en vente) :' : 'Motif du remboursement (le stock sera réintégré). Enregistrez aussi le remboursement dans Paiements :');
              if (r === null) return; note = r;
            }
            start(async () => setState(await setOrderStatus(id, a.to, note)));
          }}>{a.label}</Button>
        ))}
      </div>
    </div>
  );
}
