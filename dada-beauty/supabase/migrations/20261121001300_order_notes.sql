-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 013 Notes internes de commande (orders.manage)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.update_order_notes(p_order_id uuid, p_notes text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.require_permission('orders.manage');
  update public.orders set internal_notes = left(p_notes, 4000) where id = p_order_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
end $$;
revoke execute on function public.update_order_notes(uuid, text) from public, anon;
grant execute on function public.update_order_notes(uuid, text) to authenticated;
