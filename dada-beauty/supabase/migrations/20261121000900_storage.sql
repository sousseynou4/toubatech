-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 009 STOCKAGE DES FICHIERS (Supabase Storage)
--  • media              : public, photos du site (écriture : gallery.manage / products.manage)
--  • quote-inspirations : privé, photos d'inspiration des devis (upload serveur uniquement)
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('quote-inspirations', 'quote-inspirations', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "media public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');
create policy "media team write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (public.has_permission('gallery.manage') or public.has_permission('products.manage')));
create policy "media team update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (public.has_permission('gallery.manage') or public.has_permission('products.manage')));
create policy "media team delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (public.has_permission('gallery.manage') or public.has_permission('products.manage')));

-- Inspirations : lecture équipe devis uniquement ; l'upload passe par le serveur (service_role).
create policy "quotes team read" on storage.objects for select to authenticated
  using (bucket_id = 'quote-inspirations' and public.has_permission('quotes.manage'));
