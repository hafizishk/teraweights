-- Teraweights — initial schema (brief section 6) + RLS (section 6 summary)
-- All timestamps are stored in UTC (timestamptz). Display in Asia/Singapore.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  role text not null default 'member' check (role in ('member', 'coach', 'admin')),
  zone_pref text check (zone_pref in ('east', 'west')),
  created_at timestamptz not null default now()
);

-- Emails that become admins on first sign-in (D2D allowlist pattern).
create table public.admin_allowlist (
  email text primary key,
  role text not null default 'admin' check (role in ('coach', 'admin')),
  created_at timestamptz not null default now()
);

create table public.class_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug in ('energise_east', 'energise_west', 'prime', 'fitness_engine')),
  name text not null,
  credit_cost int not null default 1,
  colour text,
  default_capacity int not null default 20
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  zone text check (zone in ('east', 'west', 'central')),
  map_url text
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  class_type_id uuid not null references public.class_types (id),
  venue_id uuid not null references public.venues (id),
  coach_id uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  qr_secret text,
  qr_rotated_at timestamptz,
  notes text,
  check (ends_at > starts_at)
);
create index sessions_starts_at_idx on public.sessions (starts_at);
create index sessions_coach_id_idx on public.sessions (coach_id);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  kind text not null check (kind in ('membership', 'credits', 'dropin')),
  tier text check (tier in ('energise', 'pro')),
  variant text check (variant in ('weekday', 'weekend', 'west')),
  term_months int check (term_months in (1, 4, 8, 12)),
  validity_days int not null,
  credits int,
  price_sgd numeric(10, 2) not null,
  price_per_month numeric(10, 2),
  allowed_class_types text[] not null default '{}',
  fe_credits_included int not null default 0,
  cashback_eligible boolean not null default false,
  perks text[] not null default '{}',
  is_active boolean not null default true
);

create table public.member_packages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  package_id uuid not null references public.packages (id),
  kind text not null check (kind in ('membership', 'credits', 'dropin')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  credits_total int,
  credits_remaining int,
  fe_credits_remaining int not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid')),
  payment_ref text,
  recorded_by uuid references public.profiles (id) on delete set null,
  purchased_at timestamptz not null default now()
);
create index member_packages_member_id_idx on public.member_packages (member_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  member_package_id uuid references public.member_packages (id) on delete set null,
  status text not null check (status in ('booked', 'waitlisted', 'cancelled', 'attended', 'no_show')),
  entitlement text check (entitlement in ('membership', 'credit', 'fe_credit')),
  credits_used int not null default 0,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  checked_in_at timestamptz,
  late_cancel boolean not null default false,
  unique (session_id, member_id)
);
create index bookings_member_id_idx on public.bookings (member_id);
create index bookings_session_id_idx on public.bookings (session_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null check (type in ('parox', 'kampung_grind', 'community')),
  description text,
  cover_url text,
  event_date date not null,
  venue_id uuid references public.venues (id),
  is_free boolean not null default true,
  price_sgd numeric(10, 2),
  is_public boolean not null default true,
  requires_account boolean not null default false,
  registration_open boolean not null default true,
  partner_line text
);

create table public.event_slots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  label text not null,
  starts_at timestamptz not null,
  capacity int not null
);
create index event_slots_event_id_idx on public.event_slots (event_id);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  slot_id uuid references public.event_slots (id) on delete set null,
  member_id uuid references public.profiles (id) on delete set null,
  guest_name text,
  guest_email text,
  guest_phone text,
  status text not null default 'registered' check (status in ('registered', 'waitlisted', 'cancelled', 'attended')),
  payment_status text not null default 'n/a' check (payment_status in ('n/a', 'pending', 'paid')),
  created_at timestamptz not null default now(),
  check (member_id is not null or guest_email is not null)
);
create index event_registrations_event_id_idx on public.event_registrations (event_id);
create index event_registrations_member_id_idx on public.event_registrations (member_id);
create unique index event_registrations_member_event_active_uq
  on public.event_registrations (event_id, member_id)
  where member_id is not null and status <> 'cancelled';

create table public.event_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  registration_id uuid references public.event_registrations (id) on delete set null,
  member_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  division text not null default 'open' check (division in ('open', 'doubles', 'relay', 'family')),
  total_seconds int not null,
  rank int,
  station_splits jsonb,
  imported_at timestamptz not null default now()
);
create index event_results_event_id_idx on public.event_results (event_id);
create index event_results_member_id_idx on public.event_results (member_id);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'east', 'west', 'prime')),
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.coach_assignments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (member_id, coach_id)
);

-- ---------------------------------------------------------------------------
-- Auth → profile sync
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allow_role text;
begin
  select role into allow_role from public.admin_allowlist where lower(email) = lower(new.email);

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    coalesce(allow_role, 'member')
  )
  on conflict (id) do update
    set email = excluded.email,
        role = case when allow_role is not null then allow_role else public.profiles.role end;

  -- Claim guest event registrations made with the same email.
  update public.event_registrations
     set member_id = new.id
   where member_id is null
     and new.email is not null
     and lower(guest_email) = lower(new.email);

  update public.event_results
     set member_id = new.id
   where member_id is null
     and registration_id in (select id from public.event_registrations where member_id = new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helpers (security definer so policies on profiles don't recurse)
-- ---------------------------------------------------------------------------

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('coach', 'admin'), false);
$$;

create or replace function public.coaches_session(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = sid and s.coach_id = auth.uid()
  );
$$;

-- Member appears in a session coached by the caller.
create or replace function public.coaches_member(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.sessions s on s.id = b.session_id
    where b.member_id = mid and s.coach_id = auth.uid()
  ) or exists (
    select 1 from public.coach_assignments ca
    where ca.member_id = mid and ca.coach_id = auth.uid()
  );
$$;

-- Caller registered for, or has a result in, the event → may read its leaderboard.
create or replace function public.can_view_event_results(eid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.event_registrations r
    where r.event_id = eid and r.member_id = auth.uid()
  ) or exists (
    select 1 from public.event_results x
    where x.event_id = eid and x.member_id = auth.uid()
  );
$$;

revoke all on function public.current_role_name() from public;
grant execute on function public.current_role_name() to authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.coaches_session(uuid) to authenticated, service_role;
grant execute on function public.coaches_member(uuid) to authenticated, service_role;
grant execute on function public.can_view_event_results(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.admin_allowlist enable row level security;
alter table public.class_types enable row level security;
alter table public.venues enable row level security;
alter table public.sessions enable row level security;
alter table public.packages enable row level security;
alter table public.member_packages enable row level security;
alter table public.bookings enable row level security;
alter table public.events enable row level security;
alter table public.event_slots enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_results enable row level security;
alter table public.announcements enable row level security;
alter table public.coach_assignments enable row level security;

-- profiles: own read/update; admin all; coach reads members in their sessions
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role_name());
create policy "profiles: admin all" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "profiles: coach reads own members" on public.profiles
  for select to authenticated using (public.current_role_name() = 'coach' and public.coaches_member(id));
-- Coach names are shown on session cards; any signed-in user may read coach/admin display rows.
create policy "profiles: staff visible" on public.profiles
  for select to authenticated using (role in ('coach', 'admin'));

-- admin_allowlist: admin only
create policy "allowlist: admin" on public.admin_allowlist
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- class_types, venues, packages, sessions: public read; admin write
create policy "class_types: public read" on public.class_types for select to anon, authenticated using (true);
create policy "class_types: admin write" on public.class_types for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "venues: public read" on public.venues for select to anon, authenticated using (true);
create policy "venues: admin write" on public.venues for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "packages: public read" on public.packages for select to anon, authenticated using (true);
create policy "packages: admin write" on public.packages for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "sessions: public read" on public.sessions for select to anon, authenticated using (true);
create policy "sessions: admin write" on public.sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "sessions: coach updates own" on public.sessions
  for update to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- member_packages: member reads own; admin all
create policy "member_packages: read own" on public.member_packages
  for select to authenticated using (member_id = auth.uid());
create policy "member_packages: admin all" on public.member_packages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- bookings: member CRUD own; coach reads/updates for own sessions; admin all
create policy "bookings: own select" on public.bookings for select to authenticated using (member_id = auth.uid());
create policy "bookings: own insert" on public.bookings for insert to authenticated with check (member_id = auth.uid());
create policy "bookings: own update" on public.bookings for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "bookings: own delete" on public.bookings for delete to authenticated using (member_id = auth.uid());
create policy "bookings: coach select" on public.bookings for select to authenticated using (public.coaches_session(session_id));
create policy "bookings: coach update" on public.bookings for update to authenticated using (public.coaches_session(session_id)) with check (public.coaches_session(session_id));
create policy "bookings: admin all" on public.bookings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- events, event_slots: public read where is_public, any authenticated; admin write
create policy "events: public read" on public.events for select to anon using (is_public);
create policy "events: auth read" on public.events for select to authenticated using (true);
create policy "events: admin write" on public.events for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "event_slots: public read" on public.event_slots
  for select to anon using (exists (select 1 from public.events e where e.id = event_id and e.is_public));
create policy "event_slots: auth read" on public.event_slots for select to authenticated using (true);
create policy "event_slots: admin write" on public.event_slots for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- event_registrations: member reads/inserts/cancels own; guest inserts via service role only; admin all
create policy "event_registrations: own select" on public.event_registrations for select to authenticated using (member_id = auth.uid());
create policy "event_registrations: own insert" on public.event_registrations for insert to authenticated with check (member_id = auth.uid());
create policy "event_registrations: own update" on public.event_registrations for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy "event_registrations: admin all" on public.event_registrations for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- event_results: member reads own + leaderboard for events they took part in; admin write
create policy "event_results: member read" on public.event_results
  for select to authenticated using (member_id = auth.uid() or public.can_view_event_results(event_id));
create policy "event_results: admin write" on public.event_results for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- announcements: authenticated read where published; admin write
create policy "announcements: published read" on public.announcements
  for select to authenticated using (published_at is not null and published_at <= now());
create policy "announcements: admin all" on public.announcements for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- coach_assignments: member reads own; coach reads own; admin all
create policy "coach_assignments: member read" on public.coach_assignments for select to authenticated using (member_id = auth.uid());
create policy "coach_assignments: coach read" on public.coach_assignments for select to authenticated using (coach_id = auth.uid());
create policy "coach_assignments: admin all" on public.coach_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants (Supabase default roles)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
