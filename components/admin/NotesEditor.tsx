'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, AlertCircle } from 'lucide-react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function NotesEditor({
  diagnosticId,
  initialNotes,
}: {
  diagnosticId: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialNotes);

  // Auto-save with a 1.2s debounce after user stops typing
  useEffect(() => {
    if (notes === lastSavedRef.current) {
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState('idle');

    timerRef.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        const response = await fetch(`/api/admin/diagnostics/${diagnosticId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ technicianNotes: notes }),
        });
        if (!response.ok) throw new Error('save_failed');
        lastSavedRef.current = notes;
        setSaveState('saved');
        router.refresh();

        // Reset the "Saved" badge after 2s
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('error');
      }
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notes, diagnosticId, router]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="technician-notes"
          className="font-mono text-[10px] tracking-[0.18em] text-ink-400 uppercase"
        >
          Notes du technicien
        </label>
        <SaveIndicator state={saveState} />
      </div>
      <textarea
        id="technician-notes"
        rows={6}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Observations, parts à commander, étapes de réparation…"
        className="w-full resize-y rounded-xl border border-ink/12 bg-bone px-4 py-3 text-[14px] leading-relaxed text-ink placeholder:text-ink-300 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
      />
      <p className="text-[11px] text-ink-400">
        Enregistrement automatique. Sera enrichi par l'agent IA en complément.
      </p>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Enregistrement…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald">
        <Check className="h-3 w-3" strokeWidth={3} />
        Enregistré
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-red-700">
        <AlertCircle className="h-3 w-3" />
        Erreur — réessayez
      </span>
    );
  }
  return null;
}
