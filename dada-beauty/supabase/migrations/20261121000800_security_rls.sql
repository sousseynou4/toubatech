-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 008 SÉCURITÉ : RLS, PRIVILÈGES, EXÉCUTION DES FONCTIONS
-- Principe : tout est fermé par défaut. Les écritures sensibles passent par
-- des fonctions SECURITY DEFINER qui vérifient les permissions en base.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. RLS partout -------------------------------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 2. Privilèges de tables ----------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Lecture publique (filtrée par RLS)
grant select on public.business_settings, public.service_categories, public.services, public.business_hours,
  public.business_closures, public.media_assets, public.product_categories, public.products, public.product_variants,
  public.product_images, public.reviews to anon;

-- Utilisateurs connectés : privilèges larges, la RLS décide ligne par ligne.
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.service_categories, public.services, public.employees, public.employee_services,
  public.business_hours, public.business_closures, public.employee_schedules, public.employee_time_off,
  public.media_assets, public.customers, public.suppliers, public.product_categories, public.products,
  public.product_variants, public.product_images, public.promotions, public.gift_cards, public.event_quotes,
  public.reviews, public.notification_reads, public.message_log, public.profiles to authenticated;
grant update on public.business_settings to authenticated;
revoke select on public.rate_limits from authenticated;
revoke all on public.v_recognized_sales from anon, authenticated;

-- 3. Fonctions : fermer puis ouvrir explicitement ----------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Utilitaires sans risque
grant execute on function public.normalize_phone(text), public.local_date(timestamptz),
  public.has_permission(text), public.current_app_role(), public.current_employee_id() to anon, authenticated;

-- Parcours publics
grant execute on function
  public.get_available_slots(uuid, date, uuid),
  public.public_service_employees(uuid),
  public.create_public_booking(uuid, timestamptz, uuid, text, text, text, text, boolean, public.payment_method, text),
  public.get_public_booking(text, text),
  public.cancel_public_booking(text, text, text),
  public.create_public_order(jsonb, text, text, text, text, text, text, public.payment_method, boolean, text),
  public.track_order(text, text),
  public.submit_review(text, text, int, text),
  public.create_event_quote(text, text, text, text, date, text, int, text[], bigint, text, text[], text)
to anon, authenticated;

-- Espace équipe (chaque fonction vérifie la permission précise)
grant execute on function
  public.staff_create_appointment(uuid, uuid[], uuid, timestamptz, text, public.appointment_status, text, boolean),
  public.set_appointment_status(uuid, public.appointment_status, text),
  public.reschedule_appointment(uuid, timestamptz, uuid, text),
  public.update_appointment_notes(uuid, text),
  public.set_order_status(uuid, public.order_status, text),
  public.record_stock_movement(uuid, int, public.stock_reason, text, bigint, uuid),
  public.record_payment(uuid, uuid, bigint, public.payment_method, public.payment_kind, text, text, text),
  public.refund_payment(uuid, bigint, text),
  public.open_cash_session(bigint, text),
  public.close_cash_session(uuid, bigint, text),
  public.cash_session_expected(uuid),
  public.open_cash_session_id(),
  public.cash_movement(text, text, bigint, text),
  public.record_expense(text, text, bigint, public.payment_method, date, uuid, text),
  public.pos_checkout(uuid, jsonb, jsonb, bigint, text, text),
  public.adjust_loyalty(uuid, int, text),
  public.dashboard_overview(),
  public.analytics_summary(date, date),
  public.analytics_revenue_series(date, date, text),
  public.analytics_top_services(date, date, int),
  public.analytics_top_products(date, date, int),
  public.analytics_employee_performance(date, date),
  public.analytics_customer_growth(date, date),
  public.analytics_stock_rotation(date, date),
  public.admin_search(text)
to authenticated;

-- Fonctions réservées au serveur (clé service_role) : paiements en ligne
grant execute on function
  public.create_provider_payment(uuid, uuid, public.payment_kind, text, text),
  public.attach_provider_checkout(uuid, text, text),
  public.confirm_provider_payment(text, text, text, public.payment_status, bigint, jsonb)
to service_role;

-- Les futures fonctions ne seront pas exécutables par défaut.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- 4. Politiques ---------------------------------------------------------------

-- Paramètres
create policy settings_read on public.business_settings for select to anon, authenticated using (true);
create policy settings_update on public.business_settings for update to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

-- Rôles & permissions : lecture équipe
create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

-- Profils
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_permission('users.manage') or public.has_permission('team.manage'));
create policy profiles_write on public.profiles for all to authenticated
  using (public.has_permission('users.manage')) with check (public.has_permission('users.manage'));

-- Audit
create policy audit_read on public.audit_logs for select to authenticated using (public.has_permission('audit.view'));

-- Médias
create policy media_public_read on public.media_assets for select to anon, authenticated
  using (is_published or public.has_permission('gallery.manage'));
create policy media_write on public.media_assets for all to authenticated
  using (public.has_permission('gallery.manage')) with check (public.has_permission('gallery.manage'));

-- Catalogue prestations
create policy service_categories_read on public.service_categories for select to anon, authenticated
  using (is_active or public.has_permission('services.manage'));
create policy service_categories_write on public.service_categories for all to authenticated
  using (public.has_permission('services.manage')) with check (public.has_permission('services.manage'));
create policy services_read on public.services for select to anon, authenticated
  using (status <> 'inactive' or public.has_permission('services.manage'));
create policy services_write on public.services for all to authenticated
  using (public.has_permission('services.manage')) with check (public.has_permission('services.manage'));

-- Équipe (aucun accès anonyme : vue publique via public_service_employees)
create policy employees_read on public.employees for select to authenticated
  using (public.has_permission('dashboard.view'));
create policy employees_write on public.employees for all to authenticated
  using (public.has_permission('team.manage')) with check (public.has_permission('team.manage'));
create policy employee_services_read on public.employee_services for select to authenticated using (public.has_permission('dashboard.view'));
create policy employee_services_write on public.employee_services for all to authenticated
  using (public.has_permission('team.manage')) with check (public.has_permission('team.manage'));
create policy schedules_read on public.employee_schedules for select to authenticated
  using (public.has_permission('team.manage') or public.has_permission('appointments.view_all') or employee_id = public.current_employee_id());
create policy schedules_write on public.employee_schedules for all to authenticated
  using (public.has_permission('team.manage')) with check (public.has_permission('team.manage'));
create policy time_off_read on public.employee_time_off for select to authenticated
  using (public.has_permission('team.manage') or public.has_permission('appointments.view_all') or employee_id = public.current_employee_id());
create policy time_off_write on public.employee_time_off for all to authenticated
  using (public.has_permission('team.manage')) with check (public.has_permission('team.manage'));

-- Horaires
create policy hours_read on public.business_hours for select to anon, authenticated using (true);
create policy hours_write on public.business_hours for all to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));
create policy closures_read on public.business_closures for select to anon, authenticated using (true);
create policy closures_write on public.business_closures for all to authenticated
  using (public.has_permission('settings.manage') or public.has_permission('team.manage'))
  with check (public.has_permission('settings.manage') or public.has_permission('team.manage'));

-- Clientes : données personnelles protégées
create policy customers_read on public.customers for select to authenticated
  using (public.has_permission('customers.view')
    or exists (select 1 from public.appointments a where a.customer_id = customers.id
               and a.employee_id = public.current_employee_id()));
create policy customers_insert on public.customers for insert to authenticated with check (public.has_permission('customers.manage'));
create policy customers_update on public.customers for update to authenticated
  using (public.has_permission('customers.manage')) with check (public.has_permission('customers.manage'));
create policy customers_delete on public.customers for delete to authenticated using (public.has_permission('customers.delete'));

-- Rendez-vous : lecture seulement, écritures via fonctions
create policy appointments_read on public.appointments for select to authenticated
  using (public.has_permission('appointments.view_all') or employee_id = public.current_employee_id());
create policy appointment_services_read on public.appointment_services for select to authenticated
  using (exists (select 1 from public.appointments a where a.id = appointment_id));
create policy appointment_events_read on public.appointment_events for select to authenticated
  using (exists (select 1 from public.appointments a where a.id = appointment_id));

-- Produits
create policy product_categories_read on public.product_categories for select to anon, authenticated
  using (is_active or public.has_permission('products.view'));
create policy product_categories_write on public.product_categories for all to authenticated
  using (public.has_permission('products.manage')) with check (public.has_permission('products.manage'));
create policy products_read on public.products for select to anon, authenticated
  using ((status = 'active' and is_online) or public.has_permission('products.view'));
create policy products_write on public.products for all to authenticated
  using (public.has_permission('products.manage')) with check (public.has_permission('products.manage'));
create policy variants_read on public.product_variants for select to anon, authenticated
  using ((is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active' and p.is_online))
    or public.has_permission('products.view'));
create policy variants_write on public.product_variants for all to authenticated
  using (public.has_permission('products.manage')) with check (public.has_permission('products.manage'));
create policy product_images_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id));
create policy product_images_write on public.product_images for all to authenticated
  using (public.has_permission('products.manage')) with check (public.has_permission('products.manage'));
create policy suppliers_read on public.suppliers for select to authenticated using (public.has_permission('products.view'));
create policy suppliers_write on public.suppliers for all to authenticated
  using (public.has_permission('products.manage')) with check (public.has_permission('products.manage'));
create policy stock_movements_read on public.stock_movements for select to authenticated using (public.has_permission('products.view'));

-- Commandes
create policy orders_read on public.orders for select to authenticated using (public.has_permission('orders.view'));
create policy order_items_read on public.order_items for select to authenticated using (public.has_permission('orders.view'));
create policy order_events_read on public.order_events for select to authenticated using (public.has_permission('orders.view'));

-- Finance
create policy payments_read on public.payments for select to authenticated using (public.has_permission('payments.view'));
create policy payment_events_read on public.payment_events for select to authenticated using (public.has_permission('payments.refund'));
create policy cash_sessions_read on public.cash_sessions for select to authenticated
  using (public.has_permission('cash.manage') or public.has_permission('pos.use'));
create policy cash_tx_read on public.cash_transactions for select to authenticated
  using (public.has_permission('cash.manage'));
create policy expenses_read on public.expenses for select to authenticated using (public.has_permission('expenses.manage'));

-- Engagement
create policy reviews_public_read on public.reviews for select to anon, authenticated
  using (status = 'approved' or public.has_permission('reviews.manage'));
create policy reviews_manage on public.reviews for update to authenticated
  using (public.has_permission('reviews.manage')) with check (public.has_permission('reviews.manage'));
create policy reviews_delete on public.reviews for delete to authenticated using (public.has_permission('reviews.manage'));
create policy loyalty_accounts_read on public.loyalty_accounts for select to authenticated using (public.has_permission('customers.view'));
create policy loyalty_tx_read on public.loyalty_transactions for select to authenticated using (public.has_permission('customers.view'));
create policy promotions_read on public.promotions for select to authenticated using (public.has_permission('loyalty.manage') or public.has_permission('pos.use'));
create policy promotions_write on public.promotions for all to authenticated
  using (public.has_permission('loyalty.manage')) with check (public.has_permission('loyalty.manage'));
create policy gift_cards_read on public.gift_cards for select to authenticated using (public.has_permission('loyalty.manage'));
create policy gift_cards_write on public.gift_cards for all to authenticated
  using (public.has_permission('loyalty.manage')) with check (public.has_permission('loyalty.manage'));
create policy quotes_read on public.event_quotes for select to authenticated using (public.has_permission('quotes.manage'));
create policy quotes_update on public.event_quotes for update to authenticated
  using (public.has_permission('quotes.manage')) with check (public.has_permission('quotes.manage'));

-- Notifications
create policy notifications_read on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid() or (audience_permission is not null and public.has_permission(audience_permission)));
create policy notification_reads_own on public.notification_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy message_log_read on public.message_log for select to authenticated using (public.has_permission('customers.view'));
create policy message_log_insert on public.message_log for insert to authenticated
  with check (public.has_permission('customers.view') and created_by = auth.uid());
