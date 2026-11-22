-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — DONNÉES DE RÉFÉRENCE (sûres pour la production)
-- Aucune cliente, aucun prix, aucune durée, aucun horaire inventé :
-- tout ce qui n'a pas été communiqué est au statut « à configurer ».
-- Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.business_settings (id) values (1) on conflict (id) do nothing;

-- Horaires : fermés tant que la responsable ne les a pas saisis.
insert into public.business_hours (weekday, is_closed)
select d, true from generate_series(1, 7) d
on conflict (weekday) do nothing;

insert into public.roles (code, label, description, rank) values
  ('super_admin', 'Super administrateur', 'Accès complet et gestion technique', 0),
  ('owner', 'Propriétaire', 'Gestion complète de l''entreprise', 1),
  ('manager', 'Manager', 'Gestion opérationnelle du salon', 2),
  ('sales', 'Ventes', 'Gestion des ventes, produits et commandes', 3),
  ('staff', 'Employée', 'Accès à son planning et à ses rendez-vous', 4)
on conflict (code) do update set label = excluded.label, description = excluded.description, rank = excluded.rank;

insert into public.permissions (code, module, label) values
  ('dashboard.view', 'dashboard', 'Accéder au tableau de bord'),
  ('appointments.view_all', 'appointments', 'Voir tous les rendez-vous'),
  ('appointments.manage', 'appointments', 'Créer, confirmer, reporter, annuler des rendez-vous'),
  ('appointments.update_own', 'appointments', 'Démarrer / terminer ses propres rendez-vous'),
  ('services.manage', 'services', 'Gérer les prestations et tarifs'),
  ('customers.view', 'customers', 'Consulter les fiches clientes'),
  ('customers.manage', 'customers', 'Créer et modifier les fiches clientes'),
  ('customers.delete', 'customers', 'Supprimer une fiche cliente'),
  ('team.manage', 'team', 'Gérer l''équipe, plannings et congés'),
  ('products.view', 'products', 'Consulter produits et stocks'),
  ('products.manage', 'products', 'Gérer le catalogue produits'),
  ('inventory.manage', 'inventory', 'Enregistrer des mouvements de stock'),
  ('orders.view', 'orders', 'Consulter les commandes'),
  ('orders.manage', 'orders', 'Traiter les commandes'),
  ('pos.use', 'pos', 'Utiliser la caisse'),
  ('pos.discount', 'pos', 'Accorder une remise en caisse'),
  ('pos.override_price', 'pos', 'Modifier le prix d''une prestation en caisse'),
  ('payments.view', 'payments', 'Consulter les paiements'),
  ('payments.manage', 'payments', 'Enregistrer des paiements'),
  ('payments.refund', 'payments', 'Effectuer des remboursements'),
  ('cash.manage', 'cash', 'Ouvrir / clôturer la caisse'),
  ('expenses.manage', 'expenses', 'Gérer les dépenses'),
  ('analytics.view', 'analytics', 'Voir les statistiques financières'),
  ('gallery.manage', 'gallery', 'Gérer la galerie et les médias'),
  ('quotes.manage', 'quotes', 'Gérer les devis événementiels'),
  ('reviews.manage', 'reviews', 'Modérer les avis'),
  ('loyalty.manage', 'loyalty', 'Gérer fidélité, promotions et cartes cadeaux'),
  ('notifications.view', 'notifications', 'Voir les notifications'),
  ('settings.manage', 'settings', 'Modifier les paramètres de l''entreprise'),
  ('users.manage', 'users', 'Gérer les comptes et rôles'),
  ('audit.view', 'audit', 'Consulter le journal d''audit')
on conflict (code) do update set module = excluded.module, label = excluded.label;

-- Super admin & propriétaire : toutes les permissions
insert into public.role_permissions (role, permission)
select r.code, p.code from public.roles r cross join public.permissions p
where r.code in ('super_admin', 'owner')
on conflict do nothing;

insert into public.role_permissions (role, permission)
select 'manager', unnest(array[
  'dashboard.view', 'appointments.view_all', 'appointments.manage', 'appointments.update_own', 'services.manage',
  'customers.view', 'customers.manage', 'team.manage', 'products.view', 'products.manage', 'inventory.manage',
  'orders.view', 'orders.manage', 'pos.use', 'pos.discount', 'payments.view', 'payments.manage', 'cash.manage',
  'expenses.manage', 'analytics.view', 'gallery.manage', 'quotes.manage', 'reviews.manage', 'notifications.view'])
on conflict do nothing;

insert into public.role_permissions (role, permission)
select 'sales', unnest(array[
  'dashboard.view', 'customers.view', 'customers.manage', 'products.view', 'products.manage', 'inventory.manage',
  'orders.view', 'orders.manage', 'pos.use', 'payments.view', 'payments.manage', 'notifications.view'])
on conflict do nothing;

insert into public.role_permissions (role, permission)
select 'staff', unnest(array['dashboard.view', 'appointments.update_own', 'notifications.view'])
on conflict do nothing;

-- Catégories de prestations
insert into public.service_categories (slug, name, tagline, sort_order) values
  ('makeup', 'Makeup', 'Soft glam, full glam & mariées', 1),
  ('onglerie', 'Onglerie', 'Gel, capsules, vernis permanent & nail art', 2),
  ('cils-sourcils', 'Cils & sourcils', 'Extensions, pose naturelle & volume russe', 3),
  ('coiffure-perruques', 'Coiffure & perruques', 'Lace frontal, installation & customisation', 4)
on conflict (slug) do nothing;

-- Prestations : prix et durées À CONFIGURER (aucune valeur inventée)
insert into public.services (category_id, slug, name, short_description, is_featured, requires_quote, sort_order)
select c.id, s.slug, s.name, s.short_description, s.featured, s.quote, s.ord
from (values
  ('makeup', 'soft-glam', 'Soft Glam', 'Un maquillage lumineux et naturel qui sublime vos traits.', true, false, 1),
  ('makeup', 'full-glam', 'Full Glam', 'Un maquillage intense et sophistiqué pour briller.', true, false, 2),
  ('makeup', 'maquillage-ceremonie', 'Maquillage cérémonie', 'Pour vos baptêmes, tabaski, korités et grandes occasions.', false, false, 3),
  ('makeup', 'maquillage-mariee', 'Maquillage mariée', 'Votre beauté pour le plus beau jour, essai inclus sur devis.', true, true, 4),
  ('makeup', 'maquillage-anniversaire', 'Maquillage anniversaire', 'Un look sur-mesure pour votre fête.', false, false, 5),
  ('onglerie', 'pose-gel', 'Pose gel', 'Des ongles résistants et brillants.', true, false, 1),
  ('onglerie', 'pose-capsules', 'Pose capsules', 'Longueur et forme sur-mesure.', false, false, 2),
  ('onglerie', 'vernis-permanent', 'Pose vernis permanent', 'Une couleur impeccable qui dure.', false, false, 3),
  ('onglerie', 'pose-ongles-simples', 'Pose ongles simples', 'L''essentiel, net et soigné.', false, false, 4),
  ('onglerie', 'nail-art', 'Nail art', 'Décors, strass et créations personnalisées.', false, false, 5),
  ('onglerie', 'remplissage', 'Remplissage', 'Entretien de votre pose gel ou capsules.', false, false, 6),
  ('cils-sourcils', 'extensions-cils', 'Extensions de cils', 'Un regard intense, cil à cil.', true, false, 1),
  ('cils-sourcils', 'pose-cils-naturels', 'Pose cils naturels', 'Un effet discret et élégant.', false, false, 2),
  ('cils-sourcils', 'volume-russe', 'Volume russe', 'Densité et volume spectaculaires.', false, false, 3),
  ('coiffure-perruques', 'pose-lace-frontal', 'Pose Lace Frontal', 'Une installation invisible et naturelle.', true, false, 1),
  ('coiffure-perruques', 'installation-perruque', 'Installation de perruques', 'Pose et ajustement de votre perruque.', false, false, 2),
  ('coiffure-perruques', 'customisation-perruque', 'Customisation', 'Coupe, coloration et plucking sur-mesure.', false, false, 3),
  ('coiffure-perruques', 'brushing-bouclage', 'Brushing et bouclage', 'Un coiffage parfait pour toutes vos occasions.', false, false, 4)
) as s(cat, slug, name, short_description, featured, quote, ord)
join public.service_categories c on c.slug = s.cat
on conflict (slug) do nothing;

insert into public.product_categories (slug, name, sort_order) values
  ('perruques', 'Perruques', 1),
  ('maquillage', 'Maquillage', 2),
  ('accessoires', 'Accessoires de beauté', 3),
  ('soins', 'Soins', 4)
on conflict (slug) do nothing;
