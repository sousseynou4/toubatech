-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — DONNÉES DE DÉMONSTRATION (ENVIRONNEMENT DE DÉMO UNIQUEMENT)
-- ⚠ Prix, durées, horaires, employées, clientes, produits et ventes FICTIFS.
-- ⚠ NE JAMAIS EXÉCUTER SUR LA BASE DE PRODUCTION.
-- Garde-fou : le script refuse de s'exécuter sans, dans la même session :
--     select set_config('dada.allow_demo', 'on', false);
-- Usage (psql) :
--     psql "$DEMO_DATABASE_URL" -c "select set_config('dada.allow_demo','on',false)" -f supabase/demo/seed_demo.sql
-- (avec psql, -c et -f dans la même commande partagent la session.)
-- À appliquer APRÈS les migrations et supabase/seed.sql. Exécution unique.
-- ════════════════════════════════════════════════════════════════════════════

do $demo$
declare
  tz constant text := 'Africa/Dakar';
  today date := (now() at time zone 'Africa/Dakar')::date;
  e_awa uuid; e_bineta uuid; e_coumba uuid;
  c uuid[] := '{}';
  cid uuid;
  sid uuid; sname text; sprice bigint; sdur int;
  appt uuid;
  v uuid;
  ord uuid;
  i int;
  d date;
  st timestamptz;
  emp uuid;
  names text[] := array['Fatou Diop (démo)', 'Aminata Sow (démo)', 'Khady Ndiaye (démo)', 'Mariama Ba (démo)', 'Ndèye Fall (démo)', 'Rokhaya Sy (démo)'];
  svc_slugs text[] := array['soft-glam', 'pose-gel', 'extensions-cils', 'pose-lace-frontal', 'vernis-permanent', 'full-glam'];
begin
  if coalesce(current_setting('dada.allow_demo', true), '') <> 'on' then
    raise exception 'Seed de démonstration refusé : exécutez d''abord select set_config(''dada.allow_demo'',''on'',false) dans la même session (JAMAIS en production).';
  end if;
  if exists (select 1 from public.employees where display_name like '%(démo)%') then
    raise exception 'Les données de démonstration sont déjà présentes.';
  end if;

  -- Paramètres et horaires de démonstration
  update public.business_settings set
    tagline = 'Révélez votre éclat (démonstration)', deposit_policy = 'percent', deposit_value = 30,
    accepted_payment_methods = array['cash', 'wave', 'orange_money']::public.payment_method[],
    wave_merchant_display = '77 000 00 00 (démo)', loyalty_enabled = true, loyalty_points_per_1000_xof = 1,
    delivery_enabled = true, delivery_fee = 1500, delivery_zones_note = 'Guédiawaye, Pikine, Dakar (démo)',
    cancellation_policy = 'Annulation gratuite jusqu''à 24 h avant le rendez-vous (texte de démonstration).'
  where id = 1;
  update public.business_hours set is_closed = (weekday = 7),
    open_time = case when weekday = 7 then null else time '09:00' end,
    close_time = case when weekday = 7 then null else time '20:00' end;

  -- Prestations : prix et durées FICTIFS
  update public.services s set status = 'active', price = x.price, duration_minutes = x.dur, buffer_minutes = 15
  from (values
    ('soft-glam', 15000, 60), ('full-glam', 25000, 90), ('maquillage-ceremonie', 20000, 75), ('maquillage-anniversaire', 15000, 60),
    ('pose-gel', 10000, 75), ('pose-capsules', 12000, 90), ('vernis-permanent', 6000, 45), ('pose-ongles-simples', 5000, 45),
    ('nail-art', 3000, 30), ('remplissage', 7000, 60), ('extensions-cils', 15000, 120), ('pose-cils-naturels', 5000, 30),
    ('volume-russe', 20000, 150), ('pose-lace-frontal', 15000, 120), ('installation-perruque', 10000, 60),
    ('customisation-perruque', 10000, 90), ('brushing-bouclage', 5000, 45)
  ) as x(slug, price, dur) where s.slug = x.slug;
  update public.services set price_is_from = true where slug in ('nail-art', 'customisation-perruque');

  -- Équipe
  insert into public.employees (display_name, specialties, color, sort_order) values ('Awa (démo)', '{Makeup,Cils}', '#B04E72', 1) returning id into e_awa;
  insert into public.employees (display_name, specialties, color, sort_order) values ('Bineta (démo)', '{Onglerie,Nail art}', '#B08A2E', 2) returning id into e_bineta;
  insert into public.employees (display_name, specialties, color, sort_order) values ('Coumba (démo)', '{Coiffure,Perruques}', '#3D72B8', 3) returning id into e_coumba;
  insert into public.employee_schedules (employee_id, weekday, start_time, end_time)
  select e, wd, t.a, t.b from unnest(array[e_awa, e_bineta, e_coumba]) e, generate_series(1, 6) wd,
    (values (time '09:00', time '13:00'), (time '14:00', time '20:00')) t(a, b);
  insert into public.employee_services (employee_id, service_id)
  select case c2.slug when 'makeup' then e_awa when 'cils-sourcils' then e_awa when 'onglerie' then e_bineta else e_coumba end, s.id
  from public.services s join public.service_categories c2 on c2.id = s.category_id;

  -- Clientes fictives (numéros de démonstration)
  for i in 1 .. array_length(names, 1) loop
    insert into public.customers (full_name, phone, source, marketing_consent, created_at)
    values (names[i], '+2217000000' || lpad(i::text, 2, '0'), 'import', i % 2 = 0, now() - make_interval(days => 70 - i * 9))
    returning id into cid;
    c := c || cid;
  end loop;

  -- Rendez-vous passés terminés et payés (12), sur les 6 dernières semaines
  for i in 1 .. 12 loop
    d := today - (i * 3);
    if extract(isodow from d) = 7 then d := d - 1; end if;
    select s.id, s.name, s.price, s.duration_minutes into sid, sname, sprice, sdur from public.services s where s.slug = svc_slugs[1 + (i % 6)];
    emp := case when svc_slugs[1 + (i % 6)] in ('soft-glam', 'full-glam', 'extensions-cils') then e_awa
                when svc_slugs[1 + (i % 6)] in ('pose-gel', 'vernis-permanent') then e_bineta else e_coumba end;
    st := (d + time '10:00') at time zone tz;
    insert into public.appointments (customer_id, employee_id, start_at, end_at, block_end_at, status, source, total_amount, confirmed_at, completed_at, created_at)
    values (c[1 + (i % 6)], emp, st, st + make_interval(mins => sdur), st + make_interval(mins => sdur + 15),
            case when i = 4 then 'no_show' when i = 9 then 'cancelled' else 'completed' end::public.appointment_status,
            case when i % 3 = 0 then 'online' else 'phone' end, sprice, st - interval '2 days',
            case when i in (4, 9) then null else st + make_interval(mins => sdur) end, st - interval '3 days')
    returning id into appt;
    insert into public.appointment_services (appointment_id, service_id, service_name, unit_price, duration_minutes) values (appt, sid, sname, sprice, sdur);
    insert into public.appointment_events (appointment_id, event_type, to_status, details) values (appt, 'created', 'confirmed', '{"demo": true}');
    if i not in (4, 9) then
      insert into public.payments (appointment_id, customer_id, kind, method, status, amount, provider, is_manual, paid_at, note)
      values (appt, c[1 + (i % 6)], 'full', case when i % 2 = 0 then 'wave' else 'cash' end::public.payment_method, 'succeeded', sprice, 'manual', true,
              st + make_interval(mins => sdur), 'Démo');
      perform public.refresh_paid_amount(appt, null);
    end if;
  end loop;

  -- Rendez-vous à venir (sans chevauchement)
  for i in 1 .. 6 loop
    d := today + i;
    if extract(isodow from d) = 7 then d := d + 1; end if;
    select s.id, s.name, s.price, s.duration_minutes into sid, sname, sprice, sdur from public.services s where s.slug = svc_slugs[i];
    emp := case when i in (1, 3, 6) then e_awa when i in (2, 5) then e_bineta else e_coumba end;
    st := (d + time '11:00') at time zone tz;
    insert into public.appointments (customer_id, employee_id, start_at, end_at, block_end_at, status, source, total_amount, deposit_required, confirmed_at)
    values (c[i], emp, st, st + make_interval(mins => sdur), st + make_interval(mins => sdur + 15),
            case when i % 2 = 0 then 'pending' else 'confirmed' end::public.appointment_status, 'online', sprice,
            round(sprice * 0.3)::bigint, case when i % 2 = 1 then now() end)
    returning id into appt;
    insert into public.appointment_services (appointment_id, service_id, service_name, unit_price, duration_minutes) values (appt, sid, sname, sprice, sdur);
    insert into public.appointment_events (appointment_id, event_type, to_status, details) values (appt, 'created', 'pending', '{"demo": true}');
  end loop;

  -- Produits et stocks (via mouvements de stock uniquement)
  insert into public.suppliers (name, phone, notes) values ('Fournisseur démo', '+221700000099', 'Données de démonstration');
  for i in 1 .. 6 loop
    insert into public.products (category_id, slug, name, brand, short_description, status, is_featured)
    select pc.id, x.slug, x.name, x.brand, x.descr, 'active', i <= 4
    from (values
      (1, 'perruques', 'perruque-body-wave-demo', 'Perruque Body Wave 18" (démo)', 'Démo Hair', 'Lace frontal 13x4, cheveux naturels (démonstration).'),
      (2, 'perruques', 'perruque-bob-lisse-demo', 'Perruque Bob lisse (démo)', 'Démo Hair', 'Coupe carrée prête à porter (démonstration).'),
      (3, 'maquillage', 'fond-de-teint-demo', 'Fond de teint satiné (démo)', 'Démo Cosmetics', 'Couvrance modulable (démonstration).'),
      (4, 'maquillage', 'gloss-nude-demo', 'Gloss nude (démo)', 'Démo Cosmetics', 'Effet repulpant (démonstration).'),
      (5, 'soins', 'huile-cheveux-demo', 'Huile nourrissante cheveux (démo)', 'Démo Care', 'Karité et coco (démonstration).'),
      (6, 'accessoires', 'kit-pinceaux-demo', 'Kit de pinceaux (démo)', 'Démo Tools', '12 pinceaux (démonstration).')
    ) as x(n, cat, slug, name, brand, descr)
    join public.product_categories pc on pc.slug = x.cat
    where x.n = i;
  end loop;
  update public.product_variants v2 set sale_price = x.price, cost_price = x.cost, sku = x.sku, alert_threshold = 2
  from public.products p, (values
    ('perruque-body-wave-demo', 85000, 55000, 'DEMO-PBW'), ('perruque-bob-lisse-demo', 45000, 28000, 'DEMO-PBL'),
    ('fond-de-teint-demo', 9000, 5000, 'DEMO-FDT'), ('gloss-nude-demo', 4000, 1800, 'DEMO-GLS'),
    ('huile-cheveux-demo', 6000, 3000, 'DEMO-HUI'), ('kit-pinceaux-demo', 12000, 6500, 'DEMO-KIT')
  ) as x(slug, price, cost, sku)
  where v2.product_id = p.id and p.slug = x.slug;
  insert into public.stock_movements (variant_id, quantity_delta, reason, note)
  select v2.id, case p.slug when 'gloss-nude-demo' then 2 when 'perruque-bob-lisse-demo' then 1 else 8 end, 'initial', 'Stock initial (démo)'
  from public.product_variants v2 join public.products p on p.id = v2.product_id where p.slug like '%-demo';

  -- Vente en caisse passée (finalisée)
  select v2.id into v from public.product_variants v2 join public.products p on p.id = v2.product_id where p.slug = 'huile-cheveux-demo';
  insert into public.orders (channel, customer_id, customer_name, customer_phone, fulfillment, status, subtotal, total_amount, completed_at, created_at)
  values ('pos', c[2], names[2], '+221700000002', 'in_store', 'completed', 12000, 12000, now() - interval '5 days', now() - interval '5 days')
  returning id into ord;
  insert into public.order_items (order_id, item_type, variant_id, label, quantity, unit_price, unit_cost)
  values (ord, 'product', v, 'Huile nourrissante cheveux (démo)', 2, 6000, 3000);
  insert into public.stock_movements (variant_id, quantity_delta, reason, order_id, note) values (v, -2, 'sale', ord, 'Vente démo');
  insert into public.payments (order_id, customer_id, kind, method, status, amount, provider, is_manual, paid_at)
  values (ord, c[2], 'full', 'cash', 'succeeded', 12000, 'manual', true, now() - interval '5 days');
  perform public.refresh_paid_amount(null, ord);

  -- Commande en ligne en attente (stock réservé)
  select v2.id into v from public.product_variants v2 join public.products p on p.id = v2.product_id where p.slug = 'fond-de-teint-demo';
  insert into public.orders (channel, customer_id, customer_name, customer_phone, fulfillment, status, subtotal, total_amount, preferred_payment_method)
  values ('online', c[3], names[3], '+221700000003', 'pickup', 'pending', 9000, 9000, 'wave')
  returning id into ord;
  insert into public.order_items (order_id, item_type, variant_id, label, quantity, unit_price, unit_cost)
  values (ord, 'product', v, 'Fond de teint satiné (démo)', 1, 9000, 5000);
  insert into public.stock_movements (variant_id, quantity_delta, reason, order_id, note) values (v, -1, 'order_reserved', ord, 'Commande démo');
  insert into public.order_events (order_id, to_status, note) values (ord, 'pending', 'Commande démo');

  -- Dépenses
  insert into public.expenses (category, label, amount, method, spent_on, notes) values
    ('consumables', 'Cotons, dissolvant, limes (démo)', 15000, 'cash', today - 10, 'Démo'),
    ('stock', 'Réassort perruques (démo)', 110000, 'wave', today - 20, 'Démo'),
    ('rent', 'Loyer du salon (démo)', 150000, 'bank_transfer', today - 25, 'Démo');

  -- Avis vérifiés de démonstration (liés à des rendez-vous terminés)
  insert into public.reviews (appointment_id, customer_id, service_id, display_name, rating, comment, is_verified, status)
  select a.id, a.customer_id, s.service_id, split_part(cu.full_name, ' ', 1), 5,
         'Avis de démonstration — résultat magnifique et accueil chaleureux.', true, 'approved'
  from public.appointments a join public.customers cu on cu.id = a.customer_id
  join lateral (select service_id from public.appointment_services where appointment_id = a.id limit 1) s on true
  where a.status = 'completed' order by a.start_at desc limit 2;

  insert into public.notifications (type, title, body, link, audience_permission)
  values ('demo', 'Données de démonstration chargées', 'Environnement de démo : toutes les données sont fictives.', '/admin', 'dashboard.view');
end
$demo$;
