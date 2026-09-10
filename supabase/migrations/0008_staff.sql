-- Staff (scope change, 10 Sep 2026).
--
-- The brief had two staff roles, coach and admin, and no screen to manage them.
-- Teraweights also runs events with helpers who are not coaches, so this adds a
-- third role and a staff directory.
--
-- Permissions come from the small role enum, which RLS understands. The job
-- title people actually use ("Head Coach", "Event Assistant", "Physio") is free
-- text alongside it, so new kinds of staff never need a migration.

alter table public.profiles
  add column if not exists staff_title text;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'coach', 'event_assistant', 'admin'));

alter table public.admin_allowlist drop constraint if exists admin_allowlist_role_check;
alter table public.admin_allowlist
  add constraint admin_allowlist_role_check
  check (role in ('coach', 'event_assistant', 'admin'));

-- ---------------------------------------------------------------------------
-- is_staff() gates the /admin tree. An event assistant belongs there, but sees
-- only events: the policies below are the whole of their write access.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('coach', 'event_assistant', 'admin'), false);
$$;

create or replace function public.is_event_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('event_assistant', 'admin'), false);
$$;

grant execute on function public.is_event_staff() to authenticated, service_role;

-- Whether a member holds any event registration. Lets an assistant read the
-- names of people on an event list without opening the whole member directory.
create or replace function public.has_event_registration(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.event_registrations r where r.member_id = mid);
$$;

grant execute on function public.has_event_registration(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- What an event assistant may do: read and work an event's registrations, and
-- read the names attached to them. Everything else stays admin-only, including
-- creating events, editing waves, packages, credits and results.
-- ---------------------------------------------------------------------------
drop policy if exists "event_registrations: event staff read" on public.event_registrations;
create policy "event_registrations: event staff read" on public.event_registrations
  for select to authenticated using (public.is_event_staff());

drop policy if exists "event_registrations: event staff update" on public.event_registrations;
create policy "event_registrations: event staff update" on public.event_registrations
  for update to authenticated using (public.is_event_staff()) with check (public.is_event_staff());

drop policy if exists "profiles: event staff reads registrants" on public.profiles;
create policy "profiles: event staff reads registrants" on public.profiles
  for select to authenticated
  using (public.current_role_name() = 'event_assistant' and public.has_event_registration(id));
