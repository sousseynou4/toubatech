'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarHeart, Menu, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { buttonClass } from '@/components/ui/button';
import { NAV_LINKS } from '@/lib/site';
import { whatsappLink } from '@/lib/phone';
import { useCartCount } from '@/components/shop/cart-store';
import { cn } from '@/lib/cn';

export function Header({ whatsapp }: { whatsapp: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = useCartCount();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className={cn('sticky top-0 z-40 transition-all duration-300', scrolled ? 'bg-ivory/90 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md' : 'bg-transparent')}>
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? 'page' : undefined}
              className={cn('rounded-full px-3.5 py-2 text-[0.92rem] transition-colors', isActive(l.href) ? 'text-rosewood' : 'text-ink-soft hover:text-ink')}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href="/panier" className="relative grid size-11 place-items-center rounded-full text-ink-soft hover:bg-powder-100" aria-label={`Panier (${count} article${count > 1 ? 's' : ''})`}>
            <ShoppingBag className="size-5" />
            {count > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-rosewood px-1 text-[0.62rem] font-semibold text-white">{count}</span>}
          </Link>
          <Link href="/reserver" className={buttonClass('primary', 'sm', 'hidden sm:inline-flex')}>
            <CalendarHeart className="size-4" /> Réserver
          </Link>
          <button type="button" onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-full text-ink lg:hidden" aria-label="Ouvrir le menu" aria-expanded={open} aria-controls="mobile-menu">
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/30 backdrop-blur-sm" aria-label="Fermer le menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-ivory p-6 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between">
              <Logo subtitle={false} />
              <button onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-powder-100" aria-label="Fermer le menu">
                <X className="size-6" />
              </button>
            </div>
            <nav aria-label="Navigation mobile" className="mt-8 flex flex-col">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? 'page' : undefined}
                  className={cn('border-b border-line py-4 font-display text-2xl', isActive(l.href) ? 'text-rosewood' : 'text-ink')}>
                  {l.label}
                </Link>
              ))}
              <Link href="/evenements" className="border-b border-line py-4 font-display text-2xl text-ink">Mariages & événements</Link>
            </nav>
            <div className="mt-auto grid gap-3 pt-8">
              <Link href="/reserver" className={buttonClass('primary', 'lg', 'w-full')}><CalendarHeart className="size-5" /> Réserver un rendez-vous</Link>
              <a href={whatsappLink('Bonjour Dada Beauty, je souhaite des informations.', whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClass('outline', 'lg', 'w-full')}>
                <MessageCircle className="size-5" /> Écrire sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
