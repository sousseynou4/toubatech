'use client';

import { useActionState, useState } from 'react';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, Field, Input, Textarea } from '@/components/ui/field';
import { submitReview, type ActionResult } from '@/server/public-actions';

export function ReviewForm({ token }: { token: string }) {
  const [rating, setRating] = useState(5);
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(submitReview, null);
  if (state?.ok) return <div className="card p-8 text-center"><Check className="mx-auto size-10 text-rosewood" /><p className="mt-3 font-display text-2xl">Merci pour votre avis !</p><p className="mt-1 text-sm text-muted">Il sera publié après relecture.</p></div>;
  return (
    <form action={action} className="card grid gap-5 p-6">
      {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="rating" value={rating} />
      <div className="flex justify-center gap-1" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} étoile${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}>
            <Star className={`size-9 ${n <= rating ? 'fill-gold text-gold' : 'text-line'}`} />
          </button>
        ))}
      </div>
      <Field label="Prénom affiché" htmlFor="r-name"><Input id="r-name" name="displayName" required maxLength={60} /></Field>
      <Field label="Votre commentaire" htmlFor="r-comment"><Textarea id="r-comment" name="comment" maxLength={1500} /></Field>
      <Button type="submit" disabled={pending}>Publier mon avis</Button>
    </form>
  );
}
