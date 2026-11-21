-- Aides de test (base locale uniquement)
create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
  execute 'set role anon';
end $$;

create or replace function tests.as_user(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, false);
  execute 'set role authenticated';
end $$;

create or replace function tests.as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', false);
  execute 'set role service_role';
end $$;

-- Vérifie qu'une requête échoue avec un message contenant p_pattern
create or replace function tests.expect_error(p_sql text, p_pattern text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm ilike '%' || p_pattern || '%' then return; end if;
    raise exception 'Erreur inattendue pour [%] : % (attendu : %)', p_sql, sqlerrm, p_pattern;
  end;
  raise exception 'Aucune erreur pour [%] (attendu : %)', p_sql, p_pattern;
end $$;

create or replace function tests.assert(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is not true then raise exception 'ÉCHEC : %', p_msg; end if;
end $$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Jeu de données commun (dans une base de test jetable)
create or replace function tests.setup_fixture() returns void language plpgsql as $$
declare
  e_a uuid := '00000000-0000-0000-0000-0000000000a1';
  e_b uuid := '00000000-0000-0000-0000-0000000000b1';
begin
  update public.business_hours set is_closed = false, open_time = '09:00', close_time = '19:00';
  update public.business_settings set slot_interval_minutes = 30, booking_min_lead_minutes = 120,
    deposit_policy = 'percent', deposit_value = 30, loyalty_enabled = true, loyalty_points_per_1000_xof = 1,
    delivery_enabled = true, delivery_fee = 1000;
  update public.services set status = 'active', price = 15000, duration_minutes = 60, buffer_minutes = 15
    where slug = 'soft-glam';
  update public.services set status = 'active', price = 8000, duration_minutes = 45 where slug = 'pose-gel';
  insert into public.employees (id, display_name) values (e_a, 'Awa'), (e_b, 'Bineta');
  insert into public.employee_services (employee_id, service_id)
    select e, s.id from unnest(array[e_a, e_b]) e, public.services s where s.slug in ('soft-glam', 'pose-gel');
  insert into public.employee_schedules (employee_id, weekday, start_time, end_time)
    select emp, d, t.ts, t.te from unnest(array[e_a, e_b]) emp, generate_series(1, 7) d,
      (values ('09:00'::time, '13:00'::time), ('14:00'::time, '19:00'::time)) t(ts, te);

  insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-00000000000f', 'owner@test.local'),
    ('00000000-0000-0000-0000-00000000000e', 'manager@test.local'),
    ('00000000-0000-0000-0000-00000000000a', 'awa@test.local'),
    ('00000000-0000-0000-0000-00000000000b', 'bineta@test.local'),
    ('00000000-0000-0000-0000-00000000000c', 'sales@test.local');
  insert into public.profiles (id, full_name, role, employee_id) values
    ('00000000-0000-0000-0000-00000000000f', 'Owner', 'owner', null),
    ('00000000-0000-0000-0000-00000000000e', 'Manager', 'manager', null),
    ('00000000-0000-0000-0000-00000000000a', 'Awa', 'staff', e_a),
    ('00000000-0000-0000-0000-00000000000b', 'Bineta', 'staff', e_b),
    ('00000000-0000-0000-0000-00000000000c', 'Sales', 'sales', null);
end $$;

-- Date de test : J+3 (heure de Dakar), toujours dans l'horizon de réservation
create or replace function tests.d() returns date language sql stable as $$
  select (now() at time zone 'Africa/Dakar')::date + 3
$$;
create or replace function tests.at(p_time text, p_day_offset int default 0) returns timestamptz language sql stable as $$
  select ((tests.d() + p_day_offset) + p_time::time) at time zone 'Africa/Dakar'
$$;
grant execute on all functions in schema tests to anon, authenticated, service_role;
