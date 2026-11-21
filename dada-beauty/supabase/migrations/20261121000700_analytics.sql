-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 007 INDICATEURS & STATISTIQUES (données réelles uniquement)
-- Définitions :
--  • CA prestations   = rendez-vous TERMINÉS (date de fin) + prestations vendues en caisse
--  • CA produits      = lignes produit des commandes livrées / ventes caisse
--  • Encaissements    = paiements réussis (hors remboursements) à leur date
--  • Acomptes détenus = acomptes encaissés sur des rendez-vous non terminés
--  • Résultat estimé  = CA net − coût des marchandises vendues − dépenses
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.local_date(ts timestamptz) returns date
language sql immutable as $$ select (ts at time zone 'Africa/Dakar')::date $$;

-- Ventes reconnues (vue interne utilisée par les fonctions ci-dessous)
create or replace view public.v_recognized_sales with (security_invoker = true) as
  select public.local_date(a.completed_at) as day, 'service'::text as line_type,
         s.service_id as item_id, s.service_name as label, s.quantity as qty,
         (s.unit_price * s.quantity)::bigint as amount, 0::bigint as cost,
         a.employee_id, a.id as appointment_id, null::uuid as order_id
  from public.appointments a
  join public.appointment_services s on s.appointment_id = a.id
  where a.status = 'completed' and a.completed_at is not null
  union all
  select public.local_date(o.completed_at), i.item_type, coalesce(i.variant_id, i.service_id), i.label, i.quantity,
         i.line_total, coalesce(i.unit_cost, 0) * i.quantity, null::uuid, null::uuid, o.id
  from public.orders o
  join public.order_items i on i.order_id = o.id
  where o.status in ('delivered', 'completed') and o.completed_at is not null;

revoke all on public.v_recognized_sales from anon, authenticated;

create or replace function public.dashboard_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := public.local_date(now());
  v_month_start date := date_trunc('month', v_today)::date;
  v_emp uuid := public.current_employee_id();
  v_all boolean := public.has_permission('appointments.view_all');
  v_fin boolean := public.has_permission('analytics.view');
  r jsonb;
begin
  perform public.require_permission('dashboard.view');
  r := jsonb_build_object(
    'today', v_today,
    'appointments_today', (select count(*) from public.appointments a
       where public.local_date(a.start_at) = v_today and a.status not in ('cancelled')
         and (v_all or a.employee_id = v_emp)),
    'appointments_pending', (select count(*) from public.appointments a
       where a.status = 'pending' and a.start_at >= now() and (v_all or a.employee_id = v_emp)),
    'customers_total', case when public.has_permission('customers.view') then (select count(*) from public.customers) end,
    'customers_new_month', case when public.has_permission('customers.view') then
       (select count(*) from public.customers where public.local_date(created_at) >= v_month_start) end,
    'low_stock_count', case when public.has_permission('products.view') then
       (select count(*) from public.product_variants v join public.products p on p.id = v.product_id
        where v.is_active and p.status <> 'inactive' and v.stock_quantity <= v.alert_threshold) end,
    'orders_to_process', case when public.has_permission('orders.view') then
       (select count(*) from public.orders where status in ('pending', 'confirmed', 'processing', 'ready_for_pickup')) end,
    'quotes_new', case when public.has_permission('quotes.manage') then
       (select count(*) from public.event_quotes where status = 'new') end,
    'revenue_today', case when v_fin then
       (select coalesce(sum(amount), 0) from public.v_recognized_sales where day = v_today) end,
    'revenue_month', case when v_fin then
       (select coalesce(sum(amount), 0) from public.v_recognized_sales where day >= v_month_start) end,
    'cash_in_today', case when v_fin then
       (select coalesce(sum(case when kind = 'refund' then -amount else amount end), 0) from public.payments
        where status = 'succeeded' and public.local_date(paid_at) = v_today) end
  );
  return r;
end $$;

create or replace function public.analytics_summary(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_services bigint; v_products bigint; v_discounts bigint; v_cogs bigint; v_cash_in bigint; v_refunds bigint;
  v_expenses bigint; v_deposits bigint; v_total int; v_completed int; v_cancelled int; v_noshow int;
  v_new_customers int; v_orders int; v_tickets int;
begin
  perform public.require_permission('analytics.view');
  if p_to < p_from or p_to - p_from > 1100 then raise exception 'INVALID_RANGE' using errcode = '22023'; end if;

  select coalesce(sum(amount) filter (where line_type = 'service'), 0),
         coalesce(sum(amount) filter (where line_type = 'product'), 0),
         coalesce(sum(cost), 0)
  into v_services, v_products, v_cogs
  from public.v_recognized_sales where day between p_from and p_to;

  select coalesce(sum(discount_amount), 0), count(*) into v_discounts, v_orders
  from public.orders where status in ('delivered', 'completed') and public.local_date(completed_at) between p_from and p_to;

  select coalesce(sum(amount) filter (where kind <> 'refund'), 0), coalesce(sum(amount) filter (where kind = 'refund'), 0)
  into v_cash_in, v_refunds
  from public.payments where status = 'succeeded' and public.local_date(paid_at) between p_from and p_to;

  select coalesce(sum(amount), 0) into v_expenses from public.expenses where spent_on between p_from and p_to;

  select coalesce(sum(p.amount), 0) into v_deposits
  from public.payments p join public.appointments a on a.id = p.appointment_id
  where p.status = 'succeeded' and p.kind = 'deposit' and a.status in ('pending', 'confirmed', 'deposit_paid', 'in_progress');

  select count(*), count(*) filter (where status = 'completed'), count(*) filter (where status = 'cancelled'),
         count(*) filter (where status = 'no_show')
  into v_total, v_completed, v_cancelled, v_noshow
  from public.appointments where public.local_date(start_at) between p_from and p_to;

  select count(*) into v_new_customers from public.customers where public.local_date(created_at) between p_from and p_to;
  v_tickets := v_completed + v_orders;

  return jsonb_build_object(
    'from', p_from, 'to', p_to,
    'revenue_services', v_services,
    'revenue_products', v_products,
    'discounts', v_discounts,
    'revenue_net', v_services + v_products - v_discounts,
    'cogs', v_cogs,
    'gross_margin_products', v_products - v_cogs,
    'expenses', v_expenses,
    'estimated_result', v_services + v_products - v_discounts - v_cogs - v_expenses,
    'cash_in', v_cash_in,
    'refunds', v_refunds,
    'deposits_held', v_deposits,
    'appointments_total', v_total,
    'appointments_completed', v_completed,
    'appointments_cancelled', v_cancelled,
    'appointments_no_show', v_noshow,
    'cancellation_rate', case when v_total > 0 then round(v_cancelled * 100.0 / v_total, 1) else 0 end,
    'no_show_rate', case when v_total > 0 then round(v_noshow * 100.0 / v_total, 1) else 0 end,
    'new_customers', v_new_customers,
    'orders_completed', v_orders,
    'average_ticket', case when v_tickets > 0 then (v_services + v_products - v_discounts) / v_tickets else 0 end
  );
end $$;

create or replace function public.analytics_revenue_series(p_from date, p_to date, p_granularity text default 'day')
returns table (bucket date, services bigint, products bigint, cash_in bigint, expenses bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_permission('analytics.view');
  if p_granularity not in ('day', 'week', 'month') then raise exception 'INVALID_GRANULARITY' using errcode = '22023'; end if;
  if p_to < p_from or p_to - p_from > 1100 then raise exception 'INVALID_RANGE' using errcode = '22023'; end if;
  return query
  with buckets as (
    select generate_series(date_trunc(p_granularity, p_from::timestamp), date_trunc(p_granularity, p_to::timestamp),
                           ('1 ' || p_granularity)::interval)::date as b
  )
  select bk.b,
    coalesce((select sum(s.amount) from public.v_recognized_sales s
              where s.line_type = 'service' and s.day between p_from and p_to and date_trunc(p_granularity, s.day::timestamp)::date = bk.b), 0)::bigint,
    coalesce((select sum(s.amount) from public.v_recognized_sales s
              where s.line_type = 'product' and s.day between p_from and p_to and date_trunc(p_granularity, s.day::timestamp)::date = bk.b), 0)::bigint,
    coalesce((select sum(case when p.kind = 'refund' then -p.amount else p.amount end) from public.payments p
              where p.status = 'succeeded' and public.local_date(p.paid_at) between p_from and p_to
                and date_trunc(p_granularity, public.local_date(p.paid_at)::timestamp)::date = bk.b), 0)::bigint,
    coalesce((select sum(e.amount) from public.expenses e
              where e.spent_on between p_from and p_to and date_trunc(p_granularity, e.spent_on::timestamp)::date = bk.b), 0)::bigint
  from buckets bk order by bk.b;
end $$;

create or replace function public.analytics_top_services(p_from date, p_to date, p_limit int default 10)
returns table (service_id uuid, label text, quantity bigint, revenue bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_permission('analytics.view');
  return query
  select s.item_id, max(s.label), sum(s.qty)::bigint, sum(s.amount)::bigint
  from public.v_recognized_sales s
  where s.line_type = 'service' and s.day between p_from and p_to
  group by s.item_id order by 4 desc, 3 desc limit least(greatest(p_limit, 1), 50);
end $$;

create or replace function public.analytics_top_products(p_from date, p_to date, p_limit int default 10)
returns table (variant_id uuid, label text, quantity bigint, revenue bigint, margin bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_permission('analytics.view');
  return query
  select s.item_id, max(s.label), sum(s.qty)::bigint, sum(s.amount)::bigint, (sum(s.amount) - sum(s.cost))::bigint
  from public.v_recognized_sales s
  where s.line_type = 'product' and s.day between p_from and p_to
  group by s.item_id order by 3 desc, 4 desc limit least(greatest(p_limit, 1), 50);
end $$;

create or replace function public.analytics_employee_performance(p_from date, p_to date)
returns table (employee_id uuid, display_name text, color text, appointments bigint, completed bigint, no_show bigint, revenue bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_permission('analytics.view');
  return query
  select e.id, e.display_name, e.color,
    count(a.id)::bigint,
    count(a.id) filter (where a.status = 'completed')::bigint,
    count(a.id) filter (where a.status = 'no_show')::bigint,
    coalesce(sum(a.total_amount) filter (where a.status = 'completed'), 0)::bigint
  from public.employees e
  left join public.appointments a on a.employee_id = e.id and public.local_date(a.start_at) between p_from and p_to
  where e.is_active or a.id is not null
  group by e.id order by 7 desc, 4 desc;
end $$;

create or replace function public.analytics_customer_growth(p_from date, p_to date)
returns table (bucket date, new_customers bigint, total_customers bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_permission('analytics.view');
  return query
  with months as (
    select generate_series(date_trunc('month', p_from::timestamp), date_trunc('month', p_to::timestamp), interval '1 month')::date as b
  )
  select m.b,
    (select count(*) from public.customers c where date_trunc('month', public.local_date(c.created_at)::timestamp)::date = m.b)::bigint,
    (select count(*) from public.customers c where public.local_date(c.created_at) < (m.b + interval '1 month')::date)::bigint
  from months m order by m.b;
end $$;

create or replace function public.analytics_stock_rotation(p_from date, p_to date)
returns table (variant_id uuid, label text, sold bigint, stock_quantity int, alert_threshold int, days_of_cover numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_days int := greatest(p_to - p_from + 1, 1);
begin
  perform public.require_permission('analytics.view');
  return query
  select v.id, p.name || case when v.name <> 'Standard' then ' — ' || v.name else '' end,
    coalesce(sold.q, 0)::bigint, v.stock_quantity, v.alert_threshold,
    case when coalesce(sold.q, 0) > 0 then round(v.stock_quantity / (sold.q::numeric / v_days), 1) end
  from public.product_variants v
  join public.products p on p.id = v.product_id
  left join (
    select s.item_id, sum(s.qty) as q from public.v_recognized_sales s
    where s.line_type = 'product' and s.day between p_from and p_to group by s.item_id
  ) sold on sold.item_id = v.id
  where v.is_active and p.status <> 'inactive'
  order by 3 desc, v.stock_quantity asc;
end $$;

-- Recherche globale du dashboard (respecte les permissions).
create or replace function public.admin_search(p_query text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare q text := '%' || lower(trim(coalesce(p_query, ''))) || '%'; v_emp uuid := public.current_employee_id();
begin
  perform public.require_permission('dashboard.view');
  if length(trim(coalesce(p_query, ''))) < 2 then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(x) from (
      (select 'customer' as type, c.id::text as id, c.full_name as title, c.phone as subtitle, '/admin/clientes/' || c.id as href
       from public.customers c
       where public.has_permission('customers.view')
         and (lower(c.full_name) like q or c.phone like '%' || regexp_replace(p_query, '[^0-9]', '', 'g') || '%' and length(regexp_replace(p_query, '[^0-9]', '', 'g')) >= 3)
       limit 6)
      union all
      (select 'appointment', a.id::text, a.reference, to_char(a.start_at at time zone 'Africa/Dakar', 'DD/MM HH24:MI'), '/admin/rendez-vous/' || a.id
       from public.appointments a
       where lower(a.reference) like q and (public.has_permission('appointments.view_all') or a.employee_id = v_emp) limit 5)
      union all
      (select 'order', o.id::text, o.reference, o.customer_name, '/admin/commandes/' || o.id
       from public.orders o where public.has_permission('orders.view') and (lower(o.reference) like q or lower(o.customer_name) like q) limit 5)
      union all
      (select 'product', p.id::text, p.name, coalesce(p.brand, ''), '/admin/produits/' || p.id
       from public.products p where public.has_permission('products.view') and lower(p.name) like q limit 5)
      union all
      (select 'service', s.id::text, s.name, '', '/admin/prestations/' || s.id
       from public.services s where public.has_permission('services.manage') and lower(s.name) like q limit 5)
    ) x
  ), '[]'::jsonb);
end $$;
