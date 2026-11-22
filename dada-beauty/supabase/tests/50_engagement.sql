-- Devis, avis vérifiés, notifications internes, recherche admin, configuration des prestations
begin;
select tests.setup_fixture();

do $$
declare
  svc uuid := (select id from public.services where slug = 'soft-glam');
  r jsonb; tok text; q jsonb; n int;
begin
  -- Une prestation ne peut pas être active sans prix ni durée
  perform tests.expect_error($q$update public.services set status = 'active', price = null where slug = 'full-glam'$q$, 'services_active_requires_config');

  perform tests.as_anon();
  -- Devis événementiel
  q := public.create_event_quote('Mariama Ba', '776543210', null, 'mariage', (now() at time zone 'Africa/Dakar')::date + 60, 'Guédiawaye', 5,
    array['Maquillage mariée'], 150000, 'Mariage en février', '{}', null);
  perform tests.assert(q ->> 'reference' like 'DEV-%', 'référence de devis');
  perform tests.expect_error($q$select public.create_event_quote('X Y', '776543211', null, 'mariage', current_date - 1, 'Dakar', 1, '{}', null, null, '{}', null)$q$, 'DATE_IN_PAST');
  perform tests.expect_error($q$select * from public.event_quotes$q$, 'permission denied');

  -- Avis : impossible avant la fin de la prestation
  r := public.create_public_booking(svc, tests.at('10:00'), null, 'Fatou', '771112233');
  reset role;
  select review_token into tok from public.appointments where id = (r ->> 'appointment_id')::uuid;
  perform tests.as_anon();
  perform tests.expect_error(format($q$select public.submit_review(%L, 'Fatou', 5, 'Top')$q$, tok), 'INVALID_TOKEN');
  perform tests.expect_error($q$select public.submit_review('faux-jeton-123', 'Fatou', 5, 'Top')$q$, 'INVALID_TOKEN');

  perform tests.as_user('00000000-0000-0000-0000-00000000000e');
  perform public.set_appointment_status((r ->> 'appointment_id')::uuid, 'in_progress');
  perform public.set_appointment_status((r ->> 'appointment_id')::uuid, 'completed');
  perform tests.as_anon();
  perform public.submit_review(tok, 'Fatou', 5, 'Magnifique travail');
  perform tests.expect_error(format($q$select public.submit_review(%L, 'Fatou', 4, 'Encore')$q$, tok), 'ALREADY_REVIEWED');
  perform tests.assert((select count(*) from public.reviews) = 0, 'avis invisible avant modération');

  perform tests.as_user('00000000-0000-0000-0000-00000000000e');
  update public.reviews set status = 'approved';
  perform tests.as_anon();
  perform tests.assert((select count(*) from public.reviews where is_verified) = 1, 'avis vérifié publié');

  -- Notifications internes : visibles selon la permission
  perform tests.as_user('00000000-0000-0000-0000-00000000000e');
  select count(*) into n from public.notifications;
  perform tests.assert(n >= 3, format('manager voit les notifications (%s)', n));
  perform tests.as_user('00000000-0000-0000-0000-00000000000a');
  perform tests.assert((select count(*) from public.notifications where type = 'quote.created') = 0, 'staff ne voit pas les devis');

  -- Recherche admin respectant les permissions
  perform tests.as_user('00000000-0000-0000-0000-00000000000e');
  perform tests.assert(jsonb_array_length(public.admin_search('Fatou')) >= 1, 'recherche par nom');
  perform tests.assert(jsonb_array_length(public.admin_search('111 22')) >= 1, 'recherche par téléphone');
  perform tests.as_user('00000000-0000-0000-0000-00000000000c');
  perform tests.assert(not exists (select 1 from jsonb_array_elements(public.admin_search('RDV')) x where x ->> 'type' = 'appointment'), 'ventes : pas de rendez-vous dans la recherche');
  reset role;
end $$;
rollback;
