import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-30 border-t border-ink/8 bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-22">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2">
              <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
                <rect x="2" y="2" width="24" height="24" rx="7" fill="#003366" />
                <path d="M9 14.5L12.5 18L19.5 11" stroke="#339966" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <span className="text-[15px] font-medium tracking-tight text-ink">
                TOUBA <span className="text-emerald">TECH</span>
              </span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ink-400">
              Réparation experte, économie circulaire, impact local.
              <br />
              Lorient · Morbihan · Bretagne.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-[10px] tracking-[0.18em] text-ink-300 uppercase">
              <span className="rounded-full border border-ink/10 px-2.5 py-1">Loi AGEC</span>
              <span className="rounded-full border border-ink/10 px-2.5 py-1">QualiRépar</span>
              <span className="rounded-full border border-emerald/20 bg-emerald/5 px-2.5 py-1 text-emerald">Circulaire</span>
            </div>
          </div>

          <FooterCol
            title="Services"
            links={[
              { href: '/reparation', label: 'Réparation' },
              { href: '/reconditionne', label: 'Boutique reconditionné' },
              { href: '/pieces-detachees', label: 'Pièces détachées' },
              { href: '/diagnostic', label: 'Diagnostic en ligne' },
            ]}
          />
          <FooterCol
            title="Entreprise"
            links={[
              { href: '/ecologie', label: 'Engagement écologique' },
              { href: '/about', label: 'À propos' },
              { href: '/contact', label: 'Contact' },
              { href: '/blog', label: 'Blog' },
            ]}
          />
          <FooterCol
            title="Légal"
            links={[
              { href: '/mentions-legales', label: 'Mentions légales' },
              { href: '/cgv', label: 'CGV' },
              { href: '/confidentialite', label: 'Confidentialité' },
              { href: '/cookies', label: 'Cookies' },
            ]}
          />
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-ink/8 pt-8 md:flex-row md:items-center">
          <p className="text-xs text-ink-300">
            © {new Date().getFullYear()} TOUBA TECH · Tous droits réservés
          </p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-ink-300 uppercase">
            Conçu à Lorient · Hébergé en France
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="md:col-span-2">
      <h3 className="font-mono text-[10px] tracking-[0.2em] text-ink-300 uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-ink-600 transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
