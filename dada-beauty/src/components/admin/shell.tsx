'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, CalendarDays, LayoutDashboard, LogOut, Menu, Store, UserRound, X } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { ADMIN_NAV } from './nav';
import { GlobalSearch } from './global-search';
import { signOut } from '@/server/auth-actions';
import { cn } from '@/lib/cn';

export function AdminShell({ permissions, user, unread, children }: {
  permissions: string[]; user: { name: string; roleLabel: string }; unread: number; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  const perms = new Set(permissions);
  const allowed = (i: { permission: string; anyOf?: string[] }) => perms.has(i.permission) && (!i.anyOf || i.anyOf.some((p) => perms.has(p)));
  const nav = ADMIN_NAV.map((s) => ({ ...s, items: s.items.filter(allowed) })).filter((s) => s.items.length);
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/'));

  const sidebar = (
    <nav aria-label="Navigation administration" className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5"><Logo href="/admin" /></div>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {nav.map((s) => (
          <div key={s.section} className="mt-5">
            <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-muted/80">{s.section}</p>
            <ul className="mt-2 grid gap-0.5">
              {s.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} aria-current={isActive(i.href) ? 'page' : undefined}
                    className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition', isActive(i.href) ? 'bg-powder-100 font-semibold text-rosewood-dark' : 'text-ink-soft hover:bg-powder-50 hover:text-ink')}>
                    <i.icon className="size-[1.1rem]" />{i.label}
                    {i.href === '/admin/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-rosewood px-1.5 text-[0.65rem] font-semibold text-white">{unread}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-4">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="text-xs text-muted">{user.roleLabel}</p>
        <form action={signOut}><button className="mt-3 flex items-center gap-2 text-sm text-muted hover:text-danger"><LogOut className="size-4" /> Déconnexion</button></form>
      </div>
    </nav>
  );

  const quick = [
    { href: '/admin', label: 'Accueil', icon: LayoutDashboard, ok: true },
    { href: '/admin/rendez-vous', label: 'Planning', icon: CalendarDays, ok: true },
    { href: '/admin/caisse', label: 'Caisse', icon: Store, ok: perms.has('pos.use') },
    { href: '/admin/clientes', label: 'Clientes', icon: UserRound, ok: perms.has('customers.view') },
  ].filter((q) => q.ok);

  return (
    <div className="min-h-dvh bg-admin">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white/80 backdrop-blur lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-ink/30" aria-label="Fermer" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl">
            <button className="absolute right-3 top-4 grid size-10 place-items-center" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X className="size-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-admin/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button className="grid size-10 place-items-center rounded-xl lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu className="size-5" /></button>
            <div className="flex-1"><GlobalSearch /></div>
            {perms.has('notifications.view') && (
              <Link href="/admin/notifications" className="relative grid size-10 place-items-center rounded-xl bg-white shadow-soft" aria-label={`Notifications (${unread} non lues)`}>
                <Bell className="size-[1.1rem]" />
                {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rosewood px-1 text-[0.65rem] font-semibold text-white">{unread > 99 ? '99+' : unread}</span>}
              </Link>
            )}
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid size-10 place-items-center rounded-full bg-powder text-sm font-semibold text-ink">{user.name.slice(0, 1).toUpperCase()}</span>
            </div>
          </div>
        </header>
        <main className="px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      {/* Barre d'accès rapide mobile */}
      <nav aria-label="Accès rapide" className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" style={{ gridTemplateColumns: `repeat(${quick.length}, 1fr)` }}>
        {quick.map((q) => (
          <Link key={q.href} href={q.href} className={cn('flex flex-col items-center gap-1 py-2.5 text-[0.68rem]', isActive(q.href) ? 'text-rosewood' : 'text-muted')}>
            <q.icon className="size-5" />{q.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
