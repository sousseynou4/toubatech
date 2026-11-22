-- Contrôle d'accès : rôles, RLS, données personnelles
begin;
select tests.setup_fixture();
update public.services set status = 'inactive' where slug = 'nail-art';

do $$
declare
  owner uuid := '00000000-0000-0000-0000-00000000000f';
  manager uuid := '00000000-0000-0000-0000-00000000000e';
  awa uuid := '00000000-0000-0000-0000-00000000000a';
  n int;
begin
  perform tests.as_anon();
  perform tests.assert(not public.has_permission('dashboard.view'), 'anonyme sans permission');
  perform tests.assert(not exists (select 1 from public.services where slug = 'nail-art'), 'prestation inactive masquée');
  perform tests.assert(exists (select 1 from public.services where slug = 'full-glam'), 'prestation « à configurer » visible (prix sur demande)');
  perform tests.expect_error($q$select * from public.payments$q$, 'permission denied');
  perform tests.expect_error($q$select * from public.audit_logs$q$, 'permission denied');
  perform tests.expect_error($q$select * from public.profiles$q$, 'permission denied');
  perform tests.expect_error($q$select * from public.rate_limits$q$, 'permission denied');
  perform tests.expect_error($q$update public.business_settings set business_name = 'Hack'$q$, 'permission denied');
  perform tests.expect_error($q$select public.dashboard_overview()$q$, 'permission denied');
  perform tests.expect_error($q$select public.pos_checkout(null, '[]', '[]')$q$, 'permission denied');
  perform tests.expect_error($q$select public.check_rate_limit('x', 1, '1 hour')$q$, 'permission denied');

  -- Employée : pas d'accès aux clientes hors de ses rendez-vous, ni aux paramètres
  perform tests.as_user(awa);
  perform tests.assert((select count(*) from public.customers) = 0, 'aucune cliente visible');
  update public.business_settings set business_name = 'Hack';
  get diagnostics n = row_count;
  perform tests.assert(n = 0, 'paramètres non modifiables par une employée');
  update public.profiles set role = 'owner' where id = awa;
  perform tests.assert((select role from public.profiles where id = awa) = 'staff', 'une employée ne peut pas modifier son rôle');
  perform tests.assert((select count(*) from public.profiles) = 1, 'ne voit que son profil');
  perform tests.assert((select count(*) from public.audit_logs) = 0, 'journal d''audit invisible pour une employée');
  perform tests.assert((select count(*) from public.payments) = 0, 'aucun paiement visible');

  -- Manager : pas de gestion des comptes
  perform tests.as_user(manager);
  update public.profiles set role = 'owner' where id = awa;
  get diagnostics n = row_count;
  perform tests.assert(n = 0, 'manager ne peut pas promouvoir');
  perform tests.assert((select count(*) from public.audit_logs) = 0, 'manager sans journal d''audit');

  -- Propriétaire : ne peut ni changer son propre rôle ni créer un super admin
  perform tests.as_user(owner);
  perform tests.expect_error(format($q$update public.profiles set role = 'staff' where id = %L$q$, owner), 'propre rôle');
  perform tests.expect_error(format($q$update public.profiles set role = 'super_admin' where id = %L$q$, manager), 'super administrateur');
  update public.profiles set role = 'sales' where id = awa;
  perform tests.assert((select role from public.profiles where id = awa) = 'sales', 'la propriétaire gère les rôles');
  perform tests.assert(exists (select 1 from public.audit_logs where table_name = 'profiles' and action = 'UPDATE'), 'changement de rôle audité');
  update public.business_settings set business_name = 'Dada Beauty';
  get diagnostics n = row_count;
  perform tests.assert(n = 1, 'paramètres modifiables par la propriétaire');
  reset role;
end $$;
rollback;
