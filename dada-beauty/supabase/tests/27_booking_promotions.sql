-- Codes promo sur les réservations en ligne : remise, acompte, annulation, statistiques
begin;
select tests.setup_fixture();   -- soft-glam 15 000, acompte 30 %
do $$
declare
  owner uuid := '00000000-0000-0000-0000-00000000000f';
  manager uuid := '00000000-0000-0000-0000-00000000000e';
  e_a uuid := '00000000-0000-0000-0000-0000000000a1';
  svc uuid := (select id from public.services where slug = 'soft-glam');
  r jsonb; b1 jsonb; b2 jsonb; s jsonb;
begin
  perform tests.as_user(owner);
  insert into public.promotions (code, discount_type, discount_value, applies_to, max_uses) values
    ('MARIEE20', 'percent', 20, 'services', 1),
    ('BOUTIQUE', 'fixed', 1000, 'products', null),
    ('MIN50K', 'fixed', 2000, 'all', null),
    ('UNEFOIS', 'fixed', 1000, 'all', 1);
  update public.promotions set min_amount = 50000 where code = 'MIN50K';

  perform tests.as_anon();
  -- Aperçu : 15 000 − 20 % = 12 000, acompte 30 % de 12 000 = 3 600
  r := public.check_booking_promotion(' mariee20 ', svc, 'client-b');
  perform tests.assert((r ->> 'discount')::bigint = 3000 and (r ->> 'total_amount')::bigint = 12000 and (r ->> 'deposit_required')::bigint = 3600,
    format('aperçu remise/total/acompte, obtenu %s', r));
  perform tests.assert(not (r ? 'promotion_id'), 'identifiant interne non exposé');
  perform tests.assert(public.check_booking_promotion('BOUTIQUE', svc, 'client-b') ->> 'reason' = 'PROMO_NOT_APPLICABLE', 'code produits refusé');
  perform tests.assert(public.check_booking_promotion('MIN50K', svc, 'client-b') ->> 'reason' = 'PROMO_MIN_AMOUNT', 'minimum non atteint');
  reset role;
  perform tests.assert((select uses_count from public.promotions where code = 'MARIEE20') = 0, 'aperçu sans consommation');
  perform tests.as_anon();

  -- Réservation avec code
  b1 := public.create_public_booking(svc, tests.at('10:00'), e_a, 'Fatou', '771112233', null, null, false, null, 'client-b', 'mariee20');
  perform tests.assert((b1 ->> 'total_amount')::bigint = 12000 and (b1 ->> 'discount_amount')::bigint = 3000
    and (b1 ->> 'deposit_required')::bigint = 3600 and b1 ->> 'promotion_code' = 'MARIEE20', format('réservation remisée, obtenu %s', b1));
  perform tests.assert((public.get_public_booking(b1 ->> 'reference', '771112233') ->> 'discount_amount')::bigint = 3000, 'remise visible en consultation');

  -- Code épuisé : refusé, et le créneau n'est pas pris
  perform tests.expect_error(format($q$select public.create_public_booking(%L, %L, %L, 'Awa', '771112234', null, null, false, null, null, 'MARIEE20')$q$,
    svc, tests.at('14:00'), e_a), 'PROMO_EXHAUSTED');
  reset role;
  perform tests.assert(not exists (select 1 from public.appointments where start_at = tests.at('14:00')), 'aucune réservation créée');
  perform tests.as_anon();
  -- Créneau indisponible : le code n'est pas consommé
  perform tests.expect_error(format($q$select public.create_public_booking(%L, %L, %L, 'Awa', '771112234', null, null, false, null, null, 'MIN50K')$q$,
    svc, tests.at('03:00'), e_a), 'SLOT_UNAVAILABLE');
  reset role;
  perform tests.assert((select uses_count from public.promotions where code = 'MIN50K') = 0, 'compteur intact après refus');
  perform tests.as_anon();
  -- Sans code : prix plein
  b2 := public.create_public_booking(svc, tests.at('15:00'), e_a, 'Rokhaya', '771112235');
  perform tests.assert((b2 ->> 'total_amount')::bigint = 15000 and (b2 ->> 'deposit_required')::bigint = 4500, 'sans code : inchangé');

  -- Acompte encaissé = acompte remisé => statut « acompte payé »
  perform tests.as_user(manager);
  perform public.open_cash_session(0);
  perform public.record_payment((b1 ->> 'appointment_id')::uuid, null, 3600, 'cash', 'deposit');
  perform tests.assert((select status from public.appointments where id = (b1 ->> 'appointment_id')::uuid) = 'deposit_paid', 'acompte remisé suffisant');
  perform tests.expect_error(format($q$select public.record_payment(%L, null, 9000, 'cash', 'balance')$q$, b1 ->> 'appointment_id'), 'AMOUNT_EXCEEDS_BALANCE');
  perform public.record_payment((b1 ->> 'appointment_id')::uuid, null, 8400, 'wave', 'balance', 'W-1');
  perform public.set_appointment_status((b1 ->> 'appointment_id')::uuid, 'in_progress');
  perform public.set_appointment_status((b1 ->> 'appointment_id')::uuid, 'completed');

  -- Statistiques : CA prestations au prix catalogue, remise déduite du net
  perform tests.as_user(owner);
  s := public.analytics_summary((now() at time zone 'Africa/Dakar')::date, tests.d());
  perform tests.assert((s ->> 'revenue_services')::bigint = 15000 and (s ->> 'discounts')::bigint = 3000 and (s ->> 'revenue_net')::bigint = 12000,
    format('statistiques, obtenu services=%s remises=%s net=%s', s ->> 'revenue_services', s ->> 'discounts', s ->> 'revenue_net'));

  -- Annulation : l'utilisation du code est rendue une seule fois
  perform tests.as_anon();
  b1 := public.create_public_booking(svc, tests.at('17:00'), e_a, 'Mariama', '771112236', null, null, false, null, null, 'UNEFOIS');
  perform tests.assert((b1 ->> 'total_amount')::bigint = 14000, 'remise fixe');
  perform tests.expect_error(format($q$select public.create_public_booking(%L, %L, %L, 'Ndeye', '771112237', null, null, false, null, null, 'UNEFOIS')$q$,
    svc, tests.at('11:00', 1), e_a), 'PROMO_EXHAUSTED');
  perform public.cancel_public_booking(b1 ->> 'reference', '771112236', 'Empêchement');
  reset role;
  perform tests.assert((select uses_count from public.promotions where code = 'UNEFOIS') = 0, 'annulation : utilisation rendue');
  perform tests.as_anon();
  b2 := public.create_public_booking(svc, tests.at('11:00', 1), e_a, 'Ndeye', '771112237', null, null, false, null, null, 'UNEFOIS');
  -- Annulation par l'équipe : rendue aussi, une seule fois
  perform tests.as_user(manager);
  perform public.set_appointment_status((b2 ->> 'appointment_id')::uuid, 'cancelled', 'Salon fermé');
  perform public.set_appointment_status((b2 ->> 'appointment_id')::uuid, 'cancelled', 'Doublon');
  reset role;
  perform tests.assert((select uses_count from public.promotions where code = 'UNEFOIS') = 0, 'annulation équipe : rendue une seule fois');
  perform tests.assert((select bool_and(promotion_released) from public.appointments where promotion_code = 'UNEFOIS'), 'drapeau de restitution posé');
end $$;
rollback;
