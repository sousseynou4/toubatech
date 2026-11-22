-- Codes promo et cartes cadeaux : calcul en base, boutique, caisse, encaissement, remboursement, annulation
begin;
select tests.setup_fixture();
insert into public.products (id, category_id, slug, name, status)
select '00000000-0000-0000-0000-0000000000d1', id, 'gloss', 'Gloss', 'active' from public.product_categories where slug = 'maquillage';

do $$
declare
  owner uuid := '00000000-0000-0000-0000-00000000000f';
  manager uuid := '00000000-0000-0000-0000-00000000000e';
  sales uuid := '00000000-0000-0000-0000-00000000000c';
  e_a uuid := '00000000-0000-0000-0000-0000000000a1';
  svc uuid := (select id from public.services where slug = 'soft-glam');   -- 15 000
  gel uuid := (select id from public.services where slug = 'pose-gel');    -- 8 000
  v uuid := (select id from public.product_variants where product_id = '00000000-0000-0000-0000-0000000000d1');
  items jsonb;
  r jsonb; o jsonb; g jsonb; sess uuid; pay uuid; ord uuid; a uuid; bk jsonb;
  card text; card2 text;
begin
  -- ── Préparation par la propriétaire ──────────────────────────────────────
  perform tests.as_user(owner);
  perform public.record_stock_movement(v, 20, 'purchase', 'Réception', 2000, null);
  update public.product_variants set sale_price = 5000 where id = v;
  insert into public.promotions (code, discount_type, discount_value, min_amount, applies_to) values
    ('BIENVENUE10', 'percent', 10, 0, 'all'),
    ('PRODUITS2000', 'fixed', 2000, 8000, 'products'),
    ('ONGLES50', 'percent', 50, 0, 'services'),
    ('UNEFOIS', 'fixed', 1000, 0, 'all');
  update public.promotions set max_uses = 1 where code = 'UNEFOIS';
  insert into public.promotions (code, discount_type, discount_value, ends_at) values ('FINI', 'fixed', 500, now() - interval '1 day');
  insert into public.promotions (code, discount_type, discount_value, starts_at) values ('BIENTOT', 'fixed', 500, now() + interval '1 day');
  insert into public.promotions (code, discount_type, discount_value, is_active) values ('OFF', 'fixed', 500, false);
  -- Le compteur d'utilisations n'est pas modifiable à la main
  perform tests.expect_error($q$update public.promotions set uses_count = 0$q$, 'permission denied');

  -- ── Aperçu public (boutique) ─────────────────────────────────────────────
  perform tests.as_anon();
  items := jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 2));   -- 10 000
  r := public.check_promotion('bienvenue10', items, 'client-1');
  perform tests.assert((r ->> 'ok')::boolean and (r ->> 'discount')::bigint = 1000, format('10 %% de 10 000 = 1 000, obtenu %s', r));
  perform tests.assert(not (r ? 'promotion_id'), 'aucun identifiant interne exposé');
  perform tests.assert(public.check_promotion('PRODUITS2000', items, 'client-1') ->> 'discount' = '2000', 'remise fixe produits');
  perform tests.assert(public.check_promotion('PRODUITS2000', jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)), 'client-1') ->> 'reason' = 'PROMO_MIN_AMOUNT', 'minimum non atteint');
  perform tests.assert(public.check_promotion('ONGLES50', items, 'client-1') ->> 'reason' = 'PROMO_NOT_APPLICABLE', 'code prestations refusé en boutique');
  perform tests.assert(public.check_promotion('FINI', items, 'client-1') ->> 'reason' = 'PROMO_EXPIRED', 'code expiré');
  perform tests.assert(public.check_promotion('BIENTOT', items, 'client-1') ->> 'reason' = 'PROMO_NOT_STARTED', 'code pas encore actif');
  perform tests.assert(public.check_promotion('OFF', items, 'client-1') ->> 'reason' = 'PROMO_INVALID', 'code désactivé');
  perform tests.assert(public.check_promotion('INCONNU', items, 'client-1') ->> 'reason' = 'PROMO_INVALID', 'code inconnu');
  perform tests.expect_error($q$select * from public.promotions$q$, 'permission denied');

  -- ── Commande en ligne avec code ──────────────────────────────────────────
  o := public.create_public_order(items, 'Aminata Sow', '776665544', null, 'delivery', 'Cité Fadia, Guédiawaye',
         null, null, false, 'client-1', ' bienvenue10 ');
  perform tests.assert((o ->> 'discount_amount')::bigint = 1000, 'remise appliquée en base');
  perform tests.assert((o ->> 'total_amount')::bigint = 10000 - 1000 + 1000, 'livraison non remisée');
  perform tests.assert(o ->> 'promotion_code' = 'BIENVENUE10', 'code normalisé');
  perform tests.assert((public.track_order(o ->> 'reference', o ->> 'tracking_code') ->> 'discount_amount')::bigint = 1000, 'remise visible au suivi');
  perform tests.expect_error(format($q$select public.create_public_order('[{"variant_id":"%s","quantity":1}]', 'X Y', '776665545', null, 'pickup', null, null, null, false, null, 'FINI')$q$, v), 'PROMO_EXPIRED');
  perform tests.expect_error(format($q$select public.create_public_order('[{"variant_id":"%s","quantity":1}]', 'X Y', '776665545', null, 'pickup', null, null, null, false, null, 'PRODUITS2000')$q$, v), 'PROMO_MIN_AMOUNT');
  perform tests.assert((select stock_quantity from public.product_variants where id = v) = 18, 'stock intact après code refusé');

  -- Limite d'utilisations, rendue à l'annulation
  r := public.create_public_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)), 'Coumba', '776665546',
         null, 'pickup', null, null, null, false, null, 'UNEFOIS');
  ord := (r ->> 'order_id')::uuid;
  perform tests.expect_error(format($q$select public.create_public_order('[{"variant_id":"%s","quantity":1}]', 'Awa', '776665547', null, 'pickup', null, null, null, false, null, 'UNEFOIS')$q$, v), 'PROMO_EXHAUSTED');
  perform tests.as_user(manager);
  perform public.set_order_status(ord, 'cancelled', 'Cliente injoignable');
  perform public.set_order_status(ord, 'cancelled', 'Doublon');   -- sans effet
  reset role;
  perform tests.assert((select uses_count from public.promotions where code = 'UNEFOIS') = 0, 'utilisation rendue une seule fois');
  perform tests.assert((select uses_count from public.promotions where code = 'BIENVENUE10') = 1, 'compteur incrémenté');

  -- ── Cartes cadeaux : émission ────────────────────────────────────────────
  perform tests.as_user(manager);   -- pos.use : peut vendre une carte, pas en offrir
  perform tests.expect_error($q$select public.issue_gift_card(20000, 'Fatou', null, null, null, null, 'Offerte')$q$, 'PERMISSION_DENIED');
  perform tests.expect_error($q$select public.issue_gift_card(20000, 'Fatou', null, null, 'cash')$q$, 'CASH_SESSION_CLOSED');
  sess := public.open_cash_session(0, 'Test');
  g := public.issue_gift_card(20000, 'Fatou', null, null, 'cash');
  card := g ->> 'code';
  perform tests.assert(public.cash_session_expected(sess) = 20000, 'vente de carte en espèces entrée en caisse');
  perform tests.expect_error($q$select public.issue_gift_card(500, null, null, null, 'wave', 'W-1')$q$, 'INVALID_AMOUNT');
  perform tests.expect_error($q$select public.issue_gift_card(5000, null, null, null, 'gift_card')$q$, 'INVALID_PAYMENT_METHOD');
  perform tests.expect_error(format($q$update public.gift_cards set balance = 999999 where code = %L$q$, card), 'permission denied');
  perform tests.expect_error($q$insert into public.gift_cards (initial_amount, balance) values (1000, 1000)$q$, 'permission denied');

  perform tests.as_user(owner);
  perform tests.expect_error($q$select public.issue_gift_card(10000, 'Khady', null, null, null, null, '')$q$, 'NOTE_REQUIRED');
  card2 := public.issue_gift_card(10000, 'Khady', (now() at time zone 'Africa/Dakar')::date + 30, null, null, null, 'Jeu concours') ->> 'code';
  perform tests.assert((select balance from public.gift_cards where code = card2) = 10000, 'carte offerte créditée');
  perform tests.assert(public.cash_session_expected(sess) = 20000, 'carte offerte : aucun mouvement de caisse');
  reset role;
  perform tests.expect_error(format($q$update public.gift_cards set balance = 1 where code = %L$q$, card), 'GIFT_CARD_DIRECT_UPDATE_FORBIDDEN');

  -- ── Caisse : code promo + carte cadeau ───────────────────────────────────
  perform tests.as_user(sales);   -- pos.use sans pos.discount
  perform tests.assert(public.gift_card_lookup(lower(card)) ->> 'balance' = '20000', 'consultation du solde');
  perform tests.assert(public.gift_card_lookup('NEXISTEPAS') is null, 'carte inconnue');
  perform tests.assert((public.pos_preview_promotion('ongles50', format('[{"type":"service","service_id":"%s"},{"type":"product","variant_id":"%s"}]', gel, v)::jsonb) ->> 'discount')::bigint = 4000, 'aperçu caisse');
  perform tests.assert((select uses_count from public.promotions where code = 'ONGLES50') = 0, 'aperçu sans consommation');
  -- ONGLES50 : 50 % sur les prestations seulement (8 000 → 4 000), produit 5 000 plein tarif
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"service","service_id":"%s"},{"type":"product","variant_id":"%s"}]', '[{"method":"cash","amount":13000}]', 0, null, null, 'ONGLES50')$q$, gel, v), 'PAYMENT_MISMATCH');
  o := public.pos_checkout(null, format('[{"type":"service","service_id":"%s"},{"type":"product","variant_id":"%s"}]', gel, v)::jsonb,
         jsonb_build_array(jsonb_build_object('method', 'gift_card', 'amount', 6000, 'reference', lower(card)),
                           jsonb_build_object('method', 'cash', 'amount', 3000)),
         0, null, null, 'ongles50');
  perform tests.assert((o ->> 'total_amount')::bigint = 9000, format('total caisse 9 000, obtenu %s', o));
  perform tests.assert((o ->> 'promotion_discount')::bigint = 4000, 'remise prestations seulement');
  perform tests.assert((public.gift_card_lookup(card) ->> 'balance')::bigint = 14000, 'carte débitée');
  perform tests.assert((select paid_amount from public.orders where id = (o ->> 'order_id')::uuid) = 9000, 'vente soldée');
  perform tests.assert(public.cash_session_expected(sess) = 23000, 'seules les espèces entrent en caisse');
  -- Solde insuffisant : rien n'est enregistré
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"service","service_id":"%s"}]', '[{"method":"gift_card","amount":15000,"reference":"%s"}]')$q$, svc, card), 'GIFT_CARD_INSUFFICIENT_BALANCE');
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"service","service_id":"%s"}]', '[{"method":"gift_card","amount":15000,"reference":"FAUX"}]')$q$, svc), 'GIFT_CARD_NOT_FOUND');
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"service","service_id":"%s"}]', '[{"method":"gift_card","amount":15000}]')$q$, svc), 'GIFT_CARD_CODE_REQUIRED');
  perform tests.assert((public.gift_card_lookup(card) ->> 'balance')::bigint = 14000, 'solde intact après échec');
  -- Remise manuelle toujours soumise à pos.discount, même avec un code
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"service","service_id":"%s"}]', '[{"method":"wave","amount":12500}]', 1000, null, null, 'BIENVENUE10')$q$, svc), 'PERMISSION_DENIED');
  -- Carte désactivée
  perform tests.as_user(owner);
  update public.gift_cards set is_active = false where code = card2;
  perform tests.as_user(sales);
  perform tests.expect_error(format($q$select public.pos_checkout(null, '[{"type":"service","service_id":"%s"}]', '[{"method":"gift_card","amount":15000,"reference":"%s"}]')$q$, svc, card2), 'GIFT_CARD_INACTIVE');
  -- La carte cadeau peut couvrir une vente entière (aucune espèce, caisse non requise)
  o := public.pos_checkout(null, format('[{"type":"product","variant_id":"%s"}]', v)::jsonb,
         jsonb_build_array(jsonb_build_object('method', 'gift_card', 'amount', 5000, 'reference', card)));
  perform tests.assert((public.gift_card_lookup(card) ->> 'balance')::bigint = 9000, 'deuxième débit');

  -- ── Encaissement d'un rendez-vous par carte cadeau ───────────────────────
  perform tests.as_anon();
  bk := public.create_public_booking(svc, tests.at('10:00'), e_a, 'Fatou', '771112233');
  a := (bk ->> 'appointment_id')::uuid;
  perform tests.as_user(manager);
  perform tests.expect_error(format($q$select public.record_payment(%L, null, 4500, 'gift_card', 'deposit')$q$, a), 'GIFT_CARD_CODE_REQUIRED');
  pay := public.record_payment(a, null, 4500, 'gift_card', 'deposit', card, null, 'idem-gift-0001');
  perform tests.assert(public.record_payment(a, null, 4500, 'gift_card', 'deposit', card, null, 'idem-gift-0001') = pay, 'idempotence carte cadeau');
  perform tests.assert((public.gift_card_lookup(card) ->> 'balance')::bigint = 4500, 'débit unique malgré le double envoi');
  perform tests.assert((select status from public.appointments where id = a) = 'deposit_paid', 'acompte payé par carte');
  perform tests.expect_error(format($q$select public.record_payment(%L, null, 5000, 'gift_card', 'balance', %L)$q$, a, card), 'GIFT_CARD_INSUFFICIENT_BALANCE');

  -- ── Remboursement : la carte est recréditée, la caisse ne bouge pas ──────
  perform tests.as_user(owner);
  perform public.refund_payment(pay, 4500, 'Annulation du rendez-vous');
  perform tests.assert((public.gift_card_lookup(card) ->> 'balance')::bigint = 9000, 'carte recréditée');
  perform tests.assert(public.cash_session_expected(sess) = 23000, 'remboursement carte hors caisse');
  perform tests.assert((select paid_amount from public.appointments where id = a) = 0, 'montant encaissé recalculé');

  -- Registre complet et cohérent
  perform tests.assert((select count(*) from public.gift_card_transactions t join public.gift_cards c on c.id = t.gift_card_id where c.code = card) = 5,
    'émission + 3 utilisations + 1 remboursement');
  perform tests.assert((select bool_and(c.balance = (select sum(amount) from public.gift_card_transactions t where t.gift_card_id = c.id))
                        from public.gift_cards c), 'solde = somme du registre');
  reset role;
  perform tests.expect_error($q$update public.gift_card_transactions set amount = 1$q$, 'IMMUTABLE_RECORD');
  perform tests.as_user(sales);
  perform tests.assert((select count(*) from public.gift_card_transactions) = 0, 'registre réservé à la gestion fidélité');
end $$;
rollback;
