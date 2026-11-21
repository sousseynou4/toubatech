import {
  BarChart3, Bell, Boxes, CalendarDays, Camera, CreditCard, FileText, Gift, LayoutDashboard, Package, Receipt, ScrollText,
  Settings, ShoppingCart, Sparkles, Star, Store, Users, UserRound, Wallet,
} from 'lucide-react';

export interface NavItem { href: string; label: string; icon: typeof LayoutDashboard; permission: string; anyOf?: string[] }

/** Navigation admin : chaque entrée n'apparaît que si la permission (vérifiée en base) est présente. */
export const ADMIN_NAV: { section: string; items: NavItem[] }[] = [
  { section: 'Pilotage', items: [
    { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, permission: 'dashboard.view' },
    { href: '/admin/rendez-vous', label: 'Rendez-vous', icon: CalendarDays, permission: 'dashboard.view', anyOf: ['appointments.view_all', 'appointments.update_own'] },
    { href: '/admin/devis', label: 'Devis événements', icon: FileText, permission: 'quotes.manage' },
  ] },
  { section: 'Salon', items: [
    { href: '/admin/prestations', label: 'Prestations', icon: Sparkles, permission: 'services.manage' },
    { href: '/admin/clientes', label: 'Clientes', icon: UserRound, permission: 'customers.view' },
    { href: '/admin/equipe', label: 'Équipe', icon: Users, permission: 'team.manage' },
  ] },
  { section: 'Commerce', items: [
    { href: '/admin/produits', label: 'Produits', icon: Package, permission: 'products.view' },
    { href: '/admin/stocks', label: 'Stocks', icon: Boxes, permission: 'products.view' },
    { href: '/admin/commandes', label: 'Commandes', icon: ShoppingCart, permission: 'orders.view' },
    { href: '/admin/caisse', label: 'Caisse', icon: Store, permission: 'pos.use' },
    { href: '/admin/paiements', label: 'Paiements', icon: CreditCard, permission: 'payments.view' },
    { href: '/admin/depenses', label: 'Dépenses', icon: Receipt, permission: 'expenses.manage' },
  ] },
  { section: 'Croissance', items: [
    { href: '/admin/statistiques', label: 'Statistiques', icon: BarChart3, permission: 'analytics.view' },
    { href: '/admin/fidelite', label: 'Fidélité & promos', icon: Gift, permission: 'loyalty.manage' },
    { href: '/admin/avis', label: 'Avis', icon: Star, permission: 'reviews.manage' },
    { href: '/admin/galerie', label: 'Galerie', icon: Camera, permission: 'gallery.manage' },
  ] },
  { section: 'Système', items: [
    { href: '/admin/notifications', label: 'Notifications', icon: Bell, permission: 'notifications.view' },
    { href: '/admin/parametres', label: 'Paramètres', icon: Settings, permission: 'settings.manage' },
    { href: '/admin/journal', label: 'Journal d\'audit', icon: ScrollText, permission: 'audit.view' },
    { href: '/admin/caisse/sessions', label: 'Clôtures de caisse', icon: Wallet, permission: 'cash.manage' },
  ] },
];
