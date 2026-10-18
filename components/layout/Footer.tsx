import Link from 'next/link';
import { MapPin, Mail, Phone, Clock } from 'lucide-react';
import { BUSINESS, FULL_ADDRESS } from '@/lib/site';

const SERVICES = [
  { href: '/reparation', label: 'Réparation smartphone' },
  { href: '/boutique', label: 'Boutique reconditionné' },
  { href: '/pieces-detachees', label: 'Pièces détachées' },
];

const COMPANY = [
  { href: '/ecologie', label: 'Engagement écologique' },
  { href: '/diagnostic', label: 'Diagnostic gratuit' },
];

const LEGAL = [
  { href: '/mentions-legales', label: 'Mentions légales' },
  { href: '/cgv', label: 'CGV' },
  { href: '/politique-confidentialite', label: 'Politique de confidentialité' },
  { href: '/cookies', label: 'Cookies' },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink/8 bg-ink text-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand + contact */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-sans text-[17px] font-medium tracking-tight">
                TOUBA <span className="text-emerald">TECH</span>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-bone/60">
              Réparation électronique de haute précision, micro-soudure, reconditionné
              et pièces détachées. Au cœur de Lorient, au service du Morbihan.
            </p>

            <ul className="mt-7 space-y-3 text-sm text-bone/70">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.6} />
                <span>{FULL_ADDRESS}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.6} />
                <a href={`tel:${BUSINESS.telephone}`} className="transition-colors hover:text-bone">
                  {BUSINESS.telephoneDisplay}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.6} />
                <a href={`mailto:${BUSINESS.email}`} className="transition-colors hover:text-bone">
                  {BUSINESS.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald" strokeWidth={1.6} />
                <span>Lun–Sam, 9h30–19h</span>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="lg:col-span-3">
            <p className="font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
              Services
            </p>
            <ul className="mt-5 space-y-3">
              {SERVICES.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-bone/70 transition-colors hover:text-bone"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprise */}
          <div className="lg:col-span-2">
            <p className="font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
              Entreprise
            </p>
            <ul className="mt-5 space-y-3">
              {COMPANY.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-bone/70 transition-colors hover:text-bone"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div className="lg:col-span-3">
            <p className="font-mono text-[10px] tracking-[0.2em] text-bone/40 uppercase">
              Informations légales
            </p>
            <ul className="mt-5 space-y-3">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-bone/70 transition-colors hover:text-bone"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-bone/10 pt-8 sm:flex-row">
          <p className="text-xs text-bone/50">
            © {year} TOUBA TECH. Tous droits réservés.
          </p>
          <p className="text-xs text-bone/50">
            Conçu par TOUBA TECH à Lorient
          </p>
        </div>
      </div>
    </footer>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="24" height="24" rx="7" fill="#FAFAF7" />
      <path
        d="M9 14.5L12.5 18L19.5 11"
        stroke="#339966"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
