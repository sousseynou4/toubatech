import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Wrapper commun à toutes les pages légales.
 * Garantit une typographie lisible et cohérente, des marges adaptées,
 * et un fil d'Ariane de retour.
 */
export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bone">
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-24">
        {/* Retour */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-ink-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à l'accueil
        </Link>

        {/* En-tête */}
        <header className="mt-8 border-b border-ink/8 pb-8">
          <h1 className="text-3xl font-medium tracking-tight text-ink md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 font-mono text-[11px] tracking-[0.15em] text-ink-400 uppercase">
            Dernière mise à jour : {lastUpdated}
          </p>
        </header>

        {/* Contenu */}
        <article className="legal-content mt-10">
          {children}
        </article>
      </div>

      {/* Styles typographiques scopés aux pages légales */}
      <style>{`
        .legal-content h2 {
          font-size: 1.25rem;
          font-weight: 500;
          color: #003366;
          margin-top: 2.5rem;
          margin-bottom: 0.75rem;
          letter-spacing: -0.01em;
        }
        .legal-content h3 {
          font-size: 1.05rem;
          font-weight: 500;
          color: #1a3a52;
          margin-top: 1.75rem;
          margin-bottom: 0.5rem;
        }
        .legal-content p {
          font-size: 0.95rem;
          line-height: 1.7;
          color: #3d4f5c;
          margin-bottom: 1rem;
        }
        .legal-content ul {
          margin: 0.75rem 0 1.25rem;
          padding-left: 1.25rem;
          list-style: disc;
        }
        .legal-content li {
          font-size: 0.95rem;
          line-height: 1.65;
          color: #3d4f5c;
          margin-bottom: 0.4rem;
        }
        .legal-content strong {
          color: #003366;
          font-weight: 600;
        }
        .legal-content a {
          color: #339966;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .legal-content .highlight-box {
          background: rgba(51, 153, 102, 0.05);
          border: 1px solid rgba(51, 153, 102, 0.2);
          border-radius: 0.75rem;
          padding: 1.25rem 1.5rem;
          margin: 1.5rem 0;
        }
        .legal-content .highlight-box p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
