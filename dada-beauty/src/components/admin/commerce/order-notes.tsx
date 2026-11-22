'use client';

import { useActionState } from 'react';
import { Textarea } from '@/components/ui/field';
import { FormFeedback, SubmitButton } from '@/components/admin/form-bits';
import { saveOrderNotes } from '@/server/admin/commerce';

export function OrderNotesForm({ id, notes }: { id: string; notes: string }) {
  const [state, action] = useActionState(saveOrderNotes, null);
  return (
    <form action={action} className="grid gap-3">
      <FormFeedback state={state} />
      <input type="hidden" name="id" value={id} />
      <Textarea name="notes" defaultValue={notes} maxLength={4000} aria-label="Notes internes" placeholder="Visible uniquement par l'équipe" />
      <SubmitButton size="sm" variant="outline">Enregistrer les notes</SubmitButton>
    </form>
  );
}
