-- Coaches on the member side, and the community feed (scope change).
--
-- The feed extends `announcements` rather than adding a parallel table: both
-- mean "a coach told the crew something", and Home's card should show the
-- newest post from the same source. Reads stay gated by the published_at
-- policy from 0001, so a draft is invisible at the database level.

-- ---------------------------------------------------------------------------
-- Coaches: a bio to go with the photo already on profiles.avatar_url.
-- Readable by any signed-in member through "profiles: staff visible".
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists bio text;

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
alter table public.announcements
  add column if not exists slug text,
  add column if not exists category text not null default 'announcement'
    check (category in ('announcement', 'news', 'recipe', 'photos')),
  add column if not exists cover_url text,
  add column if not exists images text[] not null default '{}',
  add column if not exists archived_at timestamptz;

-- Existing rows get a slug from their title. Collisions get a short suffix.
update public.announcements a
   set slug = sub.slug
  from (
    select id,
           regexp_replace(lower(regexp_replace(title, '[^A-Za-z0-9]+', '-', 'g')), '(^-+|-+$)', '', 'g')
             || case when row_number() over (partition by lower(title) order by created_at) > 1
                     then '-' || substr(md5(id::text), 1, 4) else '' end as slug
      from public.announcements
  ) sub
 where a.id = sub.id and a.slug is null;

alter table public.announcements alter column slug set not null;
create unique index if not exists announcements_slug_uq on public.announcements (slug);

-- A post inserted without a slug gets one from its title; a collision gets a
-- short suffix. "Recipe of the week" happens every week.
create or replace function public.announcements_default_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  if new.slug is not null and btrim(new.slug) <> '' then
    return new;
  end if;
  base := regexp_replace(lower(regexp_replace(new.title, '[^A-Za-z0-9]+', '-', 'g')), '(^-+|-+$)', '', 'g');
  if base = '' then base := 'post'; end if;
  candidate := base;
  while exists (select 1 from public.announcements a where a.slug = candidate and a.id <> new.id) loop
    n := n + 1;
    candidate := base || '-' || substr(md5(new.id::text || n::text), 1, 4);
  end loop;
  new.slug := candidate;
  return new;
end $$;

drop trigger if exists announcements_default_slug on public.announcements;
create trigger announcements_default_slug
  before insert on public.announcements
  for each row execute function public.announcements_default_slug();
create index if not exists announcements_feed_idx on public.announcements (published_at desc) where archived_at is null;

-- Archived posts leave the feed without losing history. The published-read
-- policy is recreated so members never see an archived one.
drop policy if exists "announcements: published read" on public.announcements;
create policy "announcements: published read" on public.announcements
  for select to authenticated
  using (published_at is not null and published_at <= now() and archived_at is null);

-- ---------------------------------------------------------------------------
-- Post images: a public bucket, written by admins only. Paths are date-prefixed
-- and randomised by the uploader, so the bucket stays browsable by day.
-- Guarded so scripts/db-check.sh runs without a storage schema.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $s$ insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing $s$;
    execute $s$ drop policy if exists "posts: public read" on storage.objects $s$;
    execute $s$ create policy "posts: public read" on storage.objects for select using (bucket_id = 'posts') $s$;
    execute $s$ drop policy if exists "posts: admin write" on storage.objects $s$;
    execute $s$ create policy "posts: admin write" on storage.objects for all to authenticated
                using (bucket_id = 'posts' and public.is_admin()) with check (bucket_id = 'posts' and public.is_admin()) $s$;
  end if;
end $$;
