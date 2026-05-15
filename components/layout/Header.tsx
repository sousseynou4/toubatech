'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { CartButton } from '@/components/boutique/CartButton';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/reparation', label: 'Réparation' },
  { href: '/boutique', label: 'Boutique' },
  { href: '/pieces-detachees', label: 'Pièces détachées' },
  { href: '/ecologie', label: 'Engagement' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-300',
        scrolled
          ? 'border-b border-ink/8 bg-bone/85 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-18 md:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="TOUBA TECH — accueil"
        >
          <Logo />
          <span className="font-mono text-[11px] tracking-[0.2em] text-ink-400 hidden sm:inline">
            LORIENT · MORBIHAN
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm text-ink-600 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <CartButton />

          <Link
            href="/diagnostic"
            className="group hidden items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-bone transition-all hover:bg-ink-700 md:inline-flex"
          >
            Diagnostic
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>

          <button
            onClick={() => setOpen(!open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 text-ink md:hidden"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-ink/8 bg-bone md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-5 py-4" aria-label="Navigation mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-ink/5 py-3 text-base text-ink-600 last:border-0"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/diagnostic"
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-3 text-sm font-medium text-bone"
            >
              Démarrer un diagnostic
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="transition-transform group-hover:rotate-[8deg]"
      >
        <rect x="2" y="2" width="24" height="24" rx="7" fill="#003366" />
        <path
          d="M9 14.5L12.5 18L19.5 11"
          stroke="#339966"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="14" r="11.5" stroke="#003366" strokeOpacity="0.15" strokeWidth="1" />
      </svg>
      <span className="font-sans text-[15px] font-medium tracking-tight text-ink">
        TOUBA <span className="text-emerald">TECH</span>
      </span>
    </div>
  );
}
