'use client';

import { useEffect, useRef } from 'react';

/** Vide le formulaire après un enregistrement réussi. */
export function useResetOnSuccess(state: { ok?: boolean } | null) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return ref;
}
