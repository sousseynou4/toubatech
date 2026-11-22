-- Moteur de réservation : créneaux, double réservation, annulation, statuts, report
begin;
select tests.setup_fixture();

do $$
declare
  svc uuid := (select id from public.services where slug = 'soft-glam');
  draft uuid := (select id from public.services where slug = 'full-glam');
  e_a uuid := '00000000-0000-0000-0000-0000000000a1';
  e_b uuid := '00000000-0000-0000-0000-0000000000b1';
  n int; r jsonb; r2 jsonb; v_appt uuid;
begin
  perform tests.as_anon();

  -- 1. Créneaux : 09:00-13:00 (6) + 14:00-19:00 (8) par employée, bloc = 60 + 15 min
  select count(*) into n from public.get_available_slots(svc, tests.d(), e_a);
  perform tests.assert(n = 14, format('14 créneaux attendus pour Awa, obtenu %s', n));
  perform tests.assert((select min(slot_start) from public.get_available_slots(svc, tests.d(), e_a)) = tests.at('09:00'), 'premier créneau 09:00 (Dakar)');
  perform tests.assert(not exists (select 1 from public.get_available_slots(svc, tests.d(), e_a) where slot_start = tests.at('12:00')),
    '12:00 ne doit pas être proposé (déborde sur la pause)');

  -- 2. Prestation à configurer : aucun créneau, réservation refusée
  perform tests.assert(not exists (select 1 from public.get_available_slots(draft, tests.d(), null)), 'prestation non configurée sans créneau');
  perform tests.expect_error(format($q$select public.create_public_booking(%L, %L, null, 'Test', '771234567')$q$, draft, tests.at('10:00')), 'SERVICE_NOT_BOOKABLE');

  -- 3. Date passée / hors horizon : aucun créneau
  perform tests.assert(not exists (select 1 from public.get_available_slots(svc, tests.d() - 10, null)), 'date passée');
  perform tests.assert(not exists (select 1 from public.get_available_slots(svc, tests.d() + 400, null)), 'hors horizon');

  -- 4. Réservation valide : prix et acompte calculés en base
  r := public.create_public_booking(svc, tests.at('10:00'), e_a, 'Fatou Diop', '77 111 22 33', null, 'Peau sensible', true, 'wave');
  perform tests.assert((r ->> 'total_amount')::bigint = 15000, 'prix issu de la base');
  perform tests.assert((r ->> 'deposit_required')::bigint = 4500, 'acompte 30 %');
  perform tests.assert(r ->> 'reference' like 'RDV-%', 'référence générée');
  perform tests.assert(r ->> 'status' = 'pending', 'statut en attente');

  -- 5. Double réservation : même créneau, et créneau qui chevauche (10:30 < 11:15)
  perform tests.expect_error(format($q$select public.create_public_booking(%L, %L, %L, 'Autre', '771234568')$q$, svc, tests.at('10:00'), e_a), 'SLOT_UNAVAILABLE');
  perform tests.expect_error(format($q$select public.create_public_booking(%L, %L, %L, 'Autre', '771234568')$q$, svc, tests.at('10:30'), e_a), 'SLOT_UNAVAILABLE');
  -- Créneau hors grille (10:10) : refusé
  perform tests.expect_error(format($q$select public.create_public_booking(%L, %L, %L, 'Autre', '771234568')$q$, svc, tests.at('10:10'), e_b), 'SLOT_UNAVAILABLE');

  -- 6. Sans préférence : attribuée à l'employée libre, puis plus aucune
  r2 := public.create_public_booking(svc, tests.at('10:00'), null, 'Khady', '771234569');
  perform tests.assert(r2 ->> 'employee_name' = 'Bineta', 'attribution automatique à Bineta');
  perform tests.expect_error(format($q$select public.create_public_booking(%L, %L, null, 'Ndeye', '771234570')$q$, svc, tests.at('10:00')), 'SLOT_UNAVAILABLE');
  perform tests.assert(not exists (select 1 from public.get_available_slots(svc, tests.d(), null) where slot_start = tests.at('10:00')), '10:00 retiré des disponibilités');

  -- 7. Accès direct interdit aux anonymes
  perform tests.expect_error($q$insert into public.appointments (customer_id, employee_id, start_at, end_at, block_end_at) values (gen_random_uuid(), gen_random_uuid(), now(), now() + interval '1h', now() + interval '1h')$q$, 'permission denied');
  perform tests.expect_error($q$select * from public.customers$q$, 'permission denied');
  perform tests.expect_error($q$select * from public.employees$q$, 'permission denied');

  -- 8. Consultation et annulation par la cliente (téléphone obligatoire)
  perform tests.assert(public.get_public_booking(r ->> 'reference', '770000000') is null, 'mauvais téléphone : rien');
  perform tests.assert(public.get_public_booking(r ->> 'reference', '+221 77 111 22 33') ->> 'status' = 'pending', 'bon téléphone');
  perform tests.expect_error(format($q$select public.cancel_public_booking(%L, '770000000')$q$, r ->> 'reference'), 'NOT_FOUND');
  perform public.cancel_public_booking(r ->> 'reference', '771112233');
  perform tests.assert(exists (select 1 from public.get_available_slots(svc, tests.d(), e_a) where slot_start = tests.at('10:00')), 'créneau libéré après annulation');

  -- 9. Congés et fermeture exceptionnelle
  reset role;
  insert into public.employee_time_off (employee_id, period) values (e_a, tstzrange(tests.at('14:00'), tests.at('16:00')));
  insert into public.business_closures (start_date, end_date, reason) values (tests.d() + 1, tests.d() + 1, 'Férié');
  perform tests.as_anon();
  perform tests.assert(not exists (select 1 from public.get_available_slots(svc, tests.d(), e_a)
    where slot_start >= tests.at('13:00') and slot_start < tests.at('16:00')), 'congé respecté');
  perform tests.assert(not exists (select 1 from public.get_available_slots(svc, tests.d() + 1, null)), 'jour de fermeture');

  -- 10. Statuts : l'employée ne gère que ses rendez-vous, et seulement démarrer/terminer
  reset role;
  v_appt := (r2 ->> 'appointment_id')::uuid;   -- rendez-vous de Bineta
  perform tests.as_user('00000000-0000-0000-0000-00000000000a');  -- Awa
  perform tests.assert((select count(*) from public.appointments) = 1, 'Awa ne voit que ses rendez-vous (annulé inclus)');
  perform tests.expect_error(format($q$select public.set_appointment_status(%L, 'in_progress')$q$, v_appt), 'PERMISSION_DENIED');
  perform tests.as_user('00000000-0000-0000-0000-00000000000b');  -- Bineta
  perform tests.expect_error(format($q$select public.set_appointment_status(%L, 'cancelled')$q$, v_appt), 'PERMISSION_DENIED');
  perform tests.expect_error(format($q$select public.set_appointment_status(%L, 'completed')$q$, v_appt), 'INVALID_TRANSITION');
  perform public.set_appointment_status(v_appt, 'in_progress');
  perform public.set_appointment_status(v_appt, 'completed');
  perform tests.expect_error(format($q$select public.set_appointment_status(%L, 'pending')$q$, v_appt), 'PERMISSION_DENIED');

  -- 11. Manager : acompte non payé => impossible de passer en « acompte payé »
  perform tests.as_user('00000000-0000-0000-0000-00000000000e');
  r := public.create_public_booking(svc, tests.at('15:00'), e_b, 'Maimouna', '781234567');
  perform tests.expect_error(format($q$select public.set_appointment_status(%L, 'deposit_paid')$q$, r ->> 'appointment_id'), 'DEPOSIT_NOT_RECORDED');
  perform public.set_appointment_status((r ->> 'appointment_id')::uuid, 'confirmed');

  -- 12. Report : vers un créneau occupé => refusé ; vers un créneau libre => ok
  r2 := public.create_public_booking(svc, tests.at('17:00'), e_b, 'Seynabou', '781234568');
  perform tests.expect_error(format($q$select public.reschedule_appointment(%L, %L)$q$, r ->> 'appointment_id', tests.at('16:30')), 'SLOT_UNAVAILABLE');
  perform public.reschedule_appointment((r ->> 'appointment_id')::uuid, tests.at('09:00'), null, 'Demande cliente');
  perform tests.assert((select start_at from public.appointments where id = (r ->> 'appointment_id')::uuid) = tests.at('09:00'), 'report appliqué');
  perform tests.assert(exists (select 1 from public.appointment_events where appointment_id = (r ->> 'appointment_id')::uuid and event_type = 'rescheduled'), 'report historisé');

  -- 13. Création manuelle : chevauchement refusé même pour la responsable
  perform tests.expect_error(format($q$select public.staff_create_appointment(%L, array[%L]::uuid[], %L, %L)$q$,
    (select customer_id from public.appointments where id = (r2 ->> 'appointment_id')::uuid), svc, e_b, tests.at('17:30')), 'SLOT_UNAVAILABLE');

  -- 14. Le rôle « sales » ne peut pas gérer les rendez-vous
  perform tests.as_user('00000000-0000-0000-0000-00000000000c');
  perform tests.expect_error(format($q$select public.set_appointment_status(%L, 'cancelled')$q$, r2 ->> 'appointment_id'), 'PERMISSION_DENIED');
  perform tests.assert((select count(*) from public.appointments) = 0, 'sales ne voit pas les rendez-vous');
  reset role;
end $$;
rollback;
