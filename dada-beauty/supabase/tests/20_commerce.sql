-- Boutique : prix serveur, stock transactionnel, annulation, suivi
begin;
select tests.setup_fixture();
insert into public.products (id, category_id, slug, name, status)
select '00000000-0000-0000-0000-0000000000d1', id, 'perruque-body-wave', 'Perruque Body Wave', 'active'
from public.product_categories where slug = 'perruques';
insert into public.products (id, category_id, slug, name, status)
select '00000000-0000-0000-0000-0000000000d2', id, 'gloss-test', 'Gloss', 'inactive'
from public.product_categories where slug = 'maquillage';

do $$
declare
  v uuid := (select id from public.product_variants where product_id = '00000000-0000-0000-0000-0000000000d1');
  v_inactive uuid := (select id from public.product_variants where product_id = '00000000-0000-0000-0000-0000000000d2');
  r jsonb; r2 jsonb;
begin
  -- Configuration par la propriétaire
  perform tests.as_user('00000000-0000-0000-0000-00000000000f');
  update public.product_variants set sale_price = 50000, cost_price = 30000, alert_threshold = 1 where id in (v, v_inactive);
  perform tests.expect_error(format($q$update public.product_variants set stock_quantity = 99 where id = %L$q$, v), 'STOCK_DIRECT_UPDATE_FORBIDDEN');
  perform public.record_stock_movement(v, 5, 'purchase', 'Réception', 30000, null);
  perform public.record_stock_movement(v_inactive, 5, 'purchase', 'Réception', 1000, null);
  perform tests.assert((select stock_quantity from public.product_variants where id = v) = 5, 'stock = 5 après réception');
  perform tests.expect_error(format($q$select public.record_stock_movement(%L, -1, 'loss', null)$q$, v), 'stock_adjustment_needs_note');
  perform tests.expect_error(format($q$select public.record_stock_movement(%L, -10, 'adjustment', 'Inventaire')$q$, v), 'INSUFFICIENT_STOCK');
  perform tests.expect_error($q$update public.stock_movements set quantity_delta = 100$q$, 'permission denied');
  reset role;
  perform tests.expect_error($q$update public.stock_movements set quantity_delta = 100$q$, 'IMMUTABLE_RECORD');
  perform tests.as_user('00000000-0000-0000-0000-00000000000f');

  -- Commande anonyme : prix issus de la base, stock réservé
  perform tests.as_anon();
  perform tests.assert((select count(*) from public.products) = 1, 'produit inactif invisible');
  r := public.create_public_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1), jsonb_build_object('variant_id', v, 'quantity', 1)),
       'Aminata Sow', '776665544', null, 'pickup');
  perform tests.assert((r ->> 'total_amount')::bigint = 100000, 'total = 2 x 50 000');
  perform tests.assert((select stock_quantity from public.product_variants where id = v) = 3, 'stock réservé');
  perform tests.expect_error(format($q$select public.create_public_order('[{"variant_id":"%s","quantity":25}]', 'X Y', '776665545')$q$, v), 'INVALID_QUANTITY');
  perform tests.expect_error(format($q$select public.create_public_order('[{"variant_id":"%s","quantity":4}]', 'X Y', '776665545')$q$, v), 'INSUFFICIENT_STOCK');
  perform tests.assert((select stock_quantity from public.product_variants where id = v) = 3, 'stock intact après échec');
  perform tests.expect_error(format($q$select public.create_public_order('[{"variant_id":"%s","quantity":1}]', 'X Y', '776665545')$q$, v_inactive), 'PRODUCT_UNAVAILABLE');
  perform tests.expect_error(format($q$select public.create_public_order('[{"variant_id":"%s","quantity":1}]', 'X Y', '776665545', null, 'delivery', '')$q$, v), 'ADDRESS_REQUIRED');
  r2 := public.create_public_order(jsonb_build_array(jsonb_build_object('variant_id', v, 'quantity', 1)), 'Coumba', '776665546', null, 'delivery', 'Cité Fadia, Guédiawaye');
  perform tests.assert((r2 ->> 'total_amount')::bigint = 51000, 'frais de livraison ajoutés');
  perform tests.expect_error($q$select * from public.orders$q$, 'permission denied');

  -- Suivi : référence + code de suivi ou téléphone
  perform tests.assert(public.track_order(r ->> 'reference', r ->> 'tracking_code') ->> 'status' = 'pending', 'suivi par code');
  perform tests.assert(public.track_order(r ->> 'reference', '776665544') is not null, 'suivi par téléphone');
  perform tests.assert(public.track_order(r ->> 'reference', 'WRONGCODE') is null, 'mauvais code');

  -- Annulation : remise en stock (une seule fois)
  perform tests.as_user('00000000-0000-0000-0000-00000000000c');  -- rôle ventes
  perform public.set_order_status((r ->> 'order_id')::uuid, 'cancelled', 'Cliente injoignable');
  perform tests.assert((select stock_quantity from public.product_variants where id = v) = 4, 'stock restitué');
  perform tests.expect_error(format($q$select public.set_order_status(%L, 'pending')$q$, r ->> 'order_id'), 'INVALID_TRANSITION');
  perform tests.assert((select count(*) from public.stock_movements where order_id = (r ->> 'order_id')::uuid) = 2, 'mouvements historisés (réservation + remise en stock)');

  -- Parcours de livraison
  perform public.set_order_status((r2 ->> 'order_id')::uuid, 'confirmed');
  perform public.set_order_status((r2 ->> 'order_id')::uuid, 'shipped');
  perform public.set_order_status((r2 ->> 'order_id')::uuid, 'delivered');
  perform tests.expect_error(format($q$select public.set_order_status(%L, 'refunded')$q$, r2 ->> 'order_id'), 'PERMISSION_DENIED');

  -- L'employée (staff) ne voit pas les commandes ni le stock interne
  perform tests.as_user('00000000-0000-0000-0000-00000000000a');
  perform tests.assert((select count(*) from public.orders) = 0, 'staff sans accès commandes');
  perform tests.assert((select count(*) from public.stock_movements) = 0, 'staff sans accès mouvements');
  perform tests.expect_error(format($q$select public.record_stock_movement(%L, 1, 'purchase')$q$, v), 'PERMISSION_DENIED');
  reset role;
end $$;
rollback;
