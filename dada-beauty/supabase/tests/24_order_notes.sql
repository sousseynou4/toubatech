begin;
select tests.setup_fixture();
insert into public.orders (id, customer_name, customer_phone) values ('00000000-0000-0000-0000-0000000000e1', 'Test', '+221770000000');
do $$ begin
  perform tests.as_anon();
  perform tests.expect_error($q$select public.update_order_notes('00000000-0000-0000-0000-0000000000e1', 'x')$q$, 'permission denied');
  perform tests.as_user('00000000-0000-0000-0000-00000000000a');
  perform tests.expect_error($q$select public.update_order_notes('00000000-0000-0000-0000-0000000000e1', 'x')$q$, 'PERMISSION_DENIED');
  perform tests.as_user('00000000-0000-0000-0000-00000000000c');
  perform public.update_order_notes('00000000-0000-0000-0000-0000000000e1', 'Appeler avant livraison');
  reset role;
  perform tests.assert((select internal_notes from public.orders where id = '00000000-0000-0000-0000-0000000000e1') = 'Appeler avant livraison', 'notes enregistrées');
end $$;
rollback;
