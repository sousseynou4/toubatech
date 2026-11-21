import type { ReactNode } from 'react';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <p className="eyebrow">Informations légales</p>
      <h1 className="mt-3 font-display text-5xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">Dernière mise à jour : {updated}</p>
      <div className="mt-10 space-y-8 leading-relaxed text-ink-soft [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_h2]:mb-2 [&_li]:ml-5 [&_li]:list-disc [&_mark]:rounded [&_mark]:bg-champagne/50 [&_mark]:px-1">
        {children}
      </div>
    </div>
  );
}

/** Mention visible des informations que la responsable doit compléter (jamais inventées). */
export const ToComplete = ({ children }: { children: ReactNode }) => <mark title="À compléter par Dada Beauty">{children}</mark>;
