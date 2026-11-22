-- Paiements, acomptes, caisse, remboursements, fidélité, statistiques, paiements en ligne
begin;
select tests.setup_fixture();
insert into public.products (id, category_id, slug, name, status)
select '00000000-0000-0000-0000-0000000000d1', id, 'gloss', 'Gloss', 'active' from public.product_categories where slug = 'maquillage';

do $$
declare
  svc uuid := (select id from public.services where slug = 'soft-glam');
  gel uuid := (select id from public.services where slug = 'pose-gel');
  v uuid := (select id from public.product_variants where product_id = '00000000-0000-0000-0000-0000000000d1');
  e_a uuid := '00000000-0000-0000-0000-0000000000a1';
  owner uuid := '00000000-0000-0000-0000-00000000000f';
  manager uuid := '00000000-0000-0000-0000-00000000000e';
  r jsonb; r_ns jsonb; a uuid; p1 uuid; p2 uuid; sess uuid; s jsonb; prov jsonb; o jsonb;
begin
  perform tests.as_anon();
  r := public.create_public_booking(svc, tests.at('10:00'), e_a, 'Fatou', '771112233');
  r_ns := public.create_public_booking(svc, tests.at('15:00'), e_a, 'Rokhaya', '771112234');
  a := (r ->> 'appointment_id')::uuid;
  perform tests.expect_error(format($q$select public.record_payment(%L, null, 4500, 'cash', 'deposit')$q$, a), 'permission denied');

  perform tests.as_user('00000000-0000-0000-0000-00000000000a');  -- staff
  perform tests.expect_error(format($q$select public.record_payment(%L, null, 4500, 'cash', 'deposit')$q$, a), 'PERMISSION_DENIED');

  perform tests.as_user(manager);
  perform tests.expect_error(format($q$select public.record_payment(%L, null, 4500, 'cash', 'deposit')$q$, a), 'CASH_SESSION_CLOSED');
  sess := public.open_cash_session(10000, 'Fond de caisse');
  perform tests.expect_error($q$select public.open_cash_session(0)$q$, 'CASH_SESSION_ALREADY_OPEN');
  p1 := public.record_payment(a, null, 4500, 'cash', 'deposit', null, null, 'idem-key-0001');
  perform tests.assert(public.record_payment(a, null, 4500, 'cash', 'deposit', null, null, 'idem-key-0001') = p1, 'idempotence');
  perform tests.assert((select count(*) from public.payments where appointment_id = a) = 1, 'un seul paiement');
  perform tests.assert((select status from public.appointments where id = a) = 'deposit_paid', 'acompte => statut acompte payé');
  perform tests.assert((select paid_amount from public.appointments where id = a) = 4500, 'montant encaissé');
  perform tests.expect_error(format($q$select public.record_payment(%L, null, 20000, 'wave', 'balance')$q$, a), 'AMOUNT_EXCEEDS_BALANCE');
  perform tests.expect_error(format($q$select public.record_payment(%L, null, -5, 'wave', 'balance')$q$, a), 'INVALID_AMOUNT');

  -- Remboursement : interdit au manager, autorisé à la propriétaire, plafonné
  perform tests.expect_error(format($q$select public.refund_payment(%L, 1000, 'Geste commercial')$q$, p1), 'PERMISSION_DENIED');
  perform tests.as_user(owner);
  perform tests.expect_error(format($q$select public.refund_payment(%L, 9000, 'Trop')$q$, p1), 'INVALID_REFUND_AMOUNT');
  perform public.refund_payment(p1, 1000, 'Geste commercial');
  perform tests.assert((select paid_amount from public.appointments where id = a) = 3500, 'remboursement déduit');

  -- Solde puis prestation terminée => points de fidélité
  perform public.record_payment(a, null, 11500, 'wave', 'balance', 'WAVE-TX-1', 'Transfert vérifié');
  perform public.set_appointment_status(a, 'in_progress');
  perform public.set_appointment_status(a, 'completed');
  perform tests.assert((select points_balance from public.loyalty_accounts la join public.appointments ap on ap.customer_id = la.customer_id where ap.id = a) = 15,
    '15 points (1 pt / 1000 FCFA)');

  -- Absence : aucun point
  perform public.set_appointment_status((r_ns ->> 'appointment_id')::uuid, 'no_show', 'Absente');
  perform tests.assert(not exists (select 1 from public.loyalty_transactions where appointment_id = (r_ns ->> 'appointment_id')::uuid), 'pas de points pour une absence');

  -- Caisse : produit + prestation
  perform public.record_stock_movement(v, 10, 'purchase', 'Réception', 2000, null);
  update public.product_variants set sale_price = 5000 where id = v;
  perform tests.as_user('00000000-0000-0000-0000-00000000000c');  -- ventes
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"product","variant_id":"%s","quantity":2}]', '[{"method":"cash","amount":9000}]', 1000)$q$, v), 'PERMISSION_DENIED');
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"service","service_id":"%s","unit_price":1}]', '[{"method":"cash","amount":1}]')$q$, gel), 'PERMISSION_DENIED');
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"product","variant_id":"%s","quantity":2}]', '[{"method":"cash","amount":9000}]')$q$, v), 'PAYMENT_MISMATCH');
  o := public.pos_checkout(null, format('[{"type":"product","variant_id":"%s","quantity":2},{"type":"service","service_id":"%s"}]', v, gel)::jsonb,
    '[{"method":"cash","amount":10000},{"method":"orange_money","amount":8000,"reference":"OM-1"}]'::jsonb);
  perform tests.assert((o ->> 'total_amount')::bigint = 18000, 'total caisse');
  perform tests.assert((select stock_quantity from public.product_variants where id = v) = 8, 'stock décrémenté par la caisse');

  -- Dépense en espèces et clôture
  perform tests.as_user(owner);
  perform public.record_expense('consumables', 'Cotons et dissolvant', 2000, 'cash');
  s := public.close_cash_session(sess, 21000, 'Clôture');
  -- 10000 + 4500 - 1000 (remb.) + 10000 (vente) - 2000 (dépense) = 21500
  perform tests.assert((s ->> 'expected_cash')::bigint = 21500, format('espèces attendues 21500, obtenu %s', s ->> 'expected_cash'));
  perform tests.assert((s ->> 'difference')::bigint = -500, 'écart de caisse');
  perform tests.expect_error(format($q$select public.record_payment(%L, null, 100, 'cash', 'balance')$q$, r_ns ->> 'appointment_id'), 'APPOINTMENT_CLOSED');

  -- Statistiques réelles
  s := public.analytics_summary((now() at time zone 'Africa/Dakar')::date, tests.d());
  perform tests.assert((s ->> 'revenue_services')::bigint = 15000 + 8000, format('CA prestations %s', s ->> 'revenue_services'));
  perform tests.assert((s ->> 'revenue_products')::bigint = 10000, 'CA produits');
  perform tests.assert((s ->> 'cogs')::bigint = 4000, 'coût des marchandises');
  perform tests.assert((s ->> 'cash_in')::bigint = 4500 + 11500 + 18000, 'encaissements');
  perform tests.assert((s ->> 'refunds')::bigint = 1000, 'remboursements');
  perform tests.assert((s ->> 'expenses')::bigint = 2000, 'dépenses');
  perform tests.assert((s ->> 'estimated_result')::bigint = 33000 - 4000 - 2000, 'résultat estimé');
  perform tests.assert((s ->> 'no_show_rate')::numeric = 50.0, 'taux d''absence');
  perform tests.assert((public.dashboard_overview() ->> 'revenue_today') is not null, 'KPI financiers pour la propriétaire');

  perform tests.as_user('00000000-0000-0000-0000-00000000000a');
  perform tests.assert((public.dashboard_overview() ->> 'revenue_today') is null, 'pas de KPI financier pour une employée');
  perform tests.expect_error($q$select public.analytics_summary(current_date, current_date)$q$, 'PERMISSION_DENIED');

  -- Paiement en ligne : serveur uniquement, webhook idempotent, montant vérifié
  reset role;
  perform tests.as_anon();
  o := public.create_public_order(format('[{"variant_id":"%s","quantity":1}]', v)::jsonb, 'Awa Ndiaye', '709998877');
  perform tests.expect_error(format($q$select public.create_provider_payment(null, %L, 'full', 'wave', 'k-0000000000000001')$q$, o ->> 'order_id'), 'permission denied');
  perform tests.expect_error($q$select public.confirm_provider_payment('wave', 'evt', 'x', 'succeeded', 1, '{}')$q$, 'permission denied');
  perform tests.as_service();
  prov := public.create_provider_payment(null, (o ->> 'order_id')::uuid, 'full', 'wave', 'k-0000000000000001');
  perform tests.assert((prov ->> 'amount')::bigint = 5000, 'montant calculé en base');
  perform public.attach_provider_checkout((prov ->> 'payment_id')::uuid, 'cos-123', 'https://pay.example/cos-123');
  s := public.confirm_provider_payment('wave', 'evt-1', 'cos-123', 'succeeded', 4000, '{}');
  perform tests.assert(s ->> 'error' = 'amount_mismatch', 'montant différent refusé');
  perform tests.assert((select status from public.payments where id = (prov ->> 'payment_id')::uuid) = 'failed', 'paiement marqué échoué');
  prov := public.create_provider_payment(null, (o ->> 'order_id')::uuid, 'full', 'wave', 'k-0000000000000002');
  perform public.attach_provider_checkout((prov ->> 'payment_id')::uuid, 'cos-456', null);
  s := public.confirm_provider_payment('wave', 'evt-2', 'cos-456', 'succeeded', 5000, '{}');
  perform tests.assert(s ->> 'status' = 'succeeded', 'paiement confirmé');
  s := public.confirm_provider_payment('wave', 'evt-2', 'cos-456', 'succeeded', 5000, '{}');
  perform tests.assert((s ->> 'duplicate')::boolean, 'webhook rejoué ignoré');
  reset role;
  perform tests.assert((select paid_amount from public.orders where id = (o ->> 'order_id')::uuid) = 5000, 'commande payée');
  perform tests.assert((select status from public.orders where id = (o ->> 'order_id')::uuid) = 'confirmed', 'commande confirmée');
  perform tests.assert(exists (select 1 from public.audit_logs where table_name = 'payments'), 'paiements audités');
end $$;
rollback;
