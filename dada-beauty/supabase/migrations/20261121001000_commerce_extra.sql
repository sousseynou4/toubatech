-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 010 COMMERCE : images produits par le rôle « ventes »
-- La gestion des produits (products.manage) doit pouvoir enregistrer les
-- images de la boutique sans obtenir l'accès complet à la galerie.
-- ════════════════════════════════════════════════════════════════════════════

create policy media_product_images_insert on public.media_assets for insert to authenticated
  with check (public.has_permission('products.manage') and category = 'boutique' and slot is null and not is_gallery);
create policy media_product_images_read on public.media_assets for select to authenticated
  using (category = 'boutique' and public.has_permission('products.manage'));
