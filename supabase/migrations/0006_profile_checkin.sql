-- Session 4: profile fields, onboarding, avatars, QR check-in secrets.

-- ---------------------------------------------------------------------------
-- Profile: onboarding answers and photo
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists weekly_target int not null default 3 check (weekly_target between 1 and 7),
  add column if not exists preferred_time text check (preferred_time in ('morning', 'evening', 'either')),
  add column if not exists onboarded_at timestamptz;

-- Attendee lists now carry the photo.
drop function if exists public.session_attendees(uuid[]);
create or replace function public.session_attendees(p_session_ids uuid[])
returns table (session_id uuid, member_id uuid, full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select b.session_id, p.id, p.full_name, p.avatar_url
    from public.bookings b
    join public.profiles p on p.id = b.member_id
   where b.session_id = any (p_session_ids)
     and b.status in ('booked', 'attended')
     and (p.share_attendance or p.id = auth.uid())
   order by b.created_at
$$;
grant execute on function public.session_attendees(uuid[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Avatars bucket (Supabase Storage). Guarded so the plain-Postgres check
-- (scripts/db-check.sh) can run without a storage schema.
-- Members write only inside their own folder: avatars/<uid>/...
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $s$ insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing $s$;
    execute $s$ drop policy if exists "avatars: public read" on storage.objects $s$;
    execute $s$ create policy "avatars: public read" on storage.objects for select using (bucket_id = 'avatars') $s$;
    execute $s$ drop policy if exists "avatars: own insert" on storage.objects $s$;
    execute $s$ create policy "avatars: own insert" on storage.objects for insert to authenticated
                with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) $s$;
    execute $s$ drop policy if exists "avatars: own update" on storage.objects $s$;
    execute $s$ create policy "avatars: own update" on storage.objects for update to authenticated
                using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) $s$;
    execute $s$ drop policy if exists "avatars: own delete" on storage.objects $s$;
    execute $s$ create policy "avatars: own delete" on storage.objects for delete to authenticated
                using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) $s$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- QR check-in secrets.
-- The QR content is HMAC(secret, session id, 60-second window), computed in
-- lib/rules/checkin.ts, so it changes every minute without touching the row.
-- The secret itself must never reach a member: the "public read" policy on
-- sessions stays, but the secret columns are withdrawn at the column level.
-- ---------------------------------------------------------------------------
alter table public.sessions
  alter column qr_secret set default md5(gen_random_uuid()::text || clock_timestamp()::text);

update public.sessions
   set qr_secret = md5(gen_random_uuid()::text || clock_timestamp()::text)
 where qr_secret is null;

revoke select on public.sessions from anon, authenticated;
grant select (id, class_type_id, venue_id, coach_id, starts_at, ends_at, capacity, status, notes)
  on public.sessions to anon, authenticated;

-- Staff (admin, or the session's coach) read the secret to render the QR.
create or replace function public.session_qr_secret(p_session_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if not (public.is_admin() or public.coaches_session(p_session_id)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select s.qr_secret into v_secret from public.sessions s where s.id = p_session_id;
  if v_secret is null then
    update public.sessions
       set qr_secret = md5(gen_random_uuid()::text || clock_timestamp()::text)
     where id = p_session_id
     returning qr_secret into v_secret;
  end if;
  return v_secret;
end $$;

grant execute on function public.session_qr_secret(uuid) to authenticated, service_role;
