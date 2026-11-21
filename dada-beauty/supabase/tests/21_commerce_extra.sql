-- Images produits : le rôle « ventes » peut les ajouter, pas modifier la galerie
begin;
select tests.setup_fixture();
do $$
declare n int;
begin
  perform tests.as_user('00000000-0000-0000-0000-00000000000c');  -- sales
  insert into public.media_assets (bucket, path, public_url, category, is_published) values ('media', 'produits/x/a.jpg', 'https://x/a.jpg', 'boutique', true);
  perform tests.expect_error($q$insert into public.media_assets (bucket, path, category, is_gallery) values ('media', 'g/b.jpg', 'boutique', true)$q$, 'row-level security');
  perform tests.expect_error($q$insert into public.media_assets (bucket, path, category, slot) values ('media', 'g/c.jpg', 'makeup', 'home_hero')$q$, 'row-level security');
  update public.media_assets set slot = 'home_hero';
  get diagnostics n = row_count;
  perform tests.assert(n = 0, 'ventes ne modifie pas les médias éditoriaux');
  perform tests.as_user('00000000-0000-0000-0000-00000000000a');  -- staff
  perform tests.expect_error($q$insert into public.media_assets (bucket, path, category) values ('media', 'p/d.jpg', 'boutique')$q$, 'row-level security');
  reset role;
end $$;
rollback;
