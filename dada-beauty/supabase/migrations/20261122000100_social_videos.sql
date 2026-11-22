-- ════════════════════════════════════════════════════════════════════════════
-- DADA BEAUTY — 015 VIDÉOS TIKTOK DANS LA GALERIE
-- Le site n'héberge aucune copie : il affiche le lecteur officiel TikTok
-- (intégration) à partir de l'identifiant de la vidéo. La vidéo reste sur le
-- compte de son autrice, qui garde la main dessus.
-- ════════════════════════════════════════════════════════════════════════════

create table public.social_videos (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'tiktok' check (platform in ('tiktok')),
  video_id text not null check (video_id ~ '^[0-9]{15,25}$'),
  url text not null check (url ~ '^https://www\.tiktok\.com/'),
  author_handle text check (author_handle ~ '^[A-Za-z0-9._]{2,24}$'),
  title text check (length(title) <= 150),
  category text check (category in ('makeup', 'onglerie', 'cils-sourcils', 'coiffure-perruques', 'boutique', 'salon')),
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (platform, video_id)
);
create index social_videos_public_idx on public.social_videos (is_published, sort_order, created_at desc);
create trigger trg_audit_social_videos after insert or update or delete on public.social_videos
  for each row execute function public.audit_trigger();

alter table public.social_videos enable row level security;
revoke all on public.social_videos from anon, authenticated;
grant select on public.social_videos to anon, authenticated;
grant insert, update, delete on public.social_videos to authenticated;

create policy social_videos_public_read on public.social_videos for select to anon, authenticated
  using (is_published or public.has_permission('gallery.manage'));
create policy social_videos_write on public.social_videos for all to authenticated
  using (public.has_permission('gallery.manage')) with check (public.has_permission('gallery.manage'));
