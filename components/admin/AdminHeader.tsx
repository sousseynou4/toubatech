import Link from 'next/link';
import { LogoutButton } from './LogoutButton';

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-bone/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
              <rect x="2" y="2" width="24" height="24" rx="7" fill="#003366" />
              <path
                d="M9 14.5L12.5 18L19.5 11"
                stroke="#339966"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            <span className="text-[15px] font-medium tracking-tight text-ink">
              TOUBA <span className="text-emerald">TECH</span>
            </span>
          </Link>
          <span className="hidden h-4 w-px bg-ink/15 sm:inline-block" />
          <span className="hidden font-mono text-[10px] tracking-[0.2em] text-ink-400 uppercase sm:inline">
            Console admin
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="hidden text-xs text-ink-500 transition-colors hover:text-ink sm:inline"
          >
            Voir le site ↗
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
