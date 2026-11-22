-- Vidéos TikTok de la galerie : contraintes et droits d'accès
begin;
select tests.setup_fixture();
do $$
declare owner uuid := '00000000-0000-0000-0000-00000000000f';
begin
  perform tests.as_user(owner);
  insert into public.social_videos (video_id, url, author_handle, title, category) values
    ('7312345678901234567', 'https://www.tiktok.com/@dada.beauty/video/7312345678901234567', 'dada.beauty', 'Soft glam', 'makeup');
  insert into public.social_videos (video_id, url, is_published) values
    ('7312345678901234568', 'https://www.tiktok.com/embed/v2/7312345678901234568', false);
  perform tests.expect_error($q$insert into public.social_videos (video_id, url) values ('7312345678901234567', 'https://www.tiktok.com/@x/video/7312345678901234567')$q$, 'duplicate key');
  perform tests.expect_error($q$insert into public.social_videos (video_id, url) values ('123', 'https://www.tiktok.com/@x/video/123')$q$, 'check constraint');
  perform tests.expect_error($q$insert into public.social_videos (video_id, url) values ('7312345678901234569', 'javascript:alert(1)')$q$, 'check constraint');

  perform tests.as_anon();
  perform tests.assert((select count(*) from public.social_videos) = 1, 'le public ne voit que les vidéos publiées');
  perform tests.expect_error($q$insert into public.social_videos (video_id, url) values ('7312345678901234570', 'https://www.tiktok.com/@x/video/7312345678901234570')$q$, 'permission denied');

  perform tests.as_user('00000000-0000-0000-0000-00000000000a');  -- employée sans gallery.manage
  perform tests.expect_error($q$insert into public.social_videos (video_id, url) values ('7312345678901234571', 'https://www.tiktok.com/@x/video/7312345678901234571')$q$, 'row-level security');
  update public.social_videos set is_published = true;
  perform tests.as_user(owner);
  perform tests.assert((select count(*) from public.social_videos where is_published) = 1, 'aucune modification sans permission');
end $$;
rollback;
