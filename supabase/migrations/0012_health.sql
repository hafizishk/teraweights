-- Connected health (scope change: Apple Health and Health Connect).
--
-- A member may connect the phone's health store, read-only, from the native
-- app. The app then reads heart rate and active energy inside sessions the
-- member checked in to, plus their own workouts, and writes them here. This
-- data is the member's alone: no coach, admin or other member can read it.
-- The zone maths lives in lib/rules/zones.ts; the rows hold what the device
-- reported.

alter table public.profiles
  add column if not exists health_source text check (health_source in ('apple_health', 'health_connect')),
  add column if not exists health_device text,
  add column if not exists max_hr int check (max_hr between 120 and 230);

-- ---------------------------------------------------------------------------
-- Per attended session: what the wearable saw between check-in and the end.
-- samples is [[seconds from session start, bpm], ...] in time order.
-- ---------------------------------------------------------------------------
create table if not exists public.session_metrics (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  source text not null check (source in ('apple_health', 'health_connect')),
  device text,
  avg_bpm int not null check (avg_bpm between 30 and 250),
  max_bpm int not null check (max_bpm between 30 and 250),
  kcal int check (kcal >= 0),
  samples jsonb not null default '[]'::jsonb,
  synced_at timestamptz not null default now()
);
create index if not exists session_metrics_member_idx on public.session_metrics (member_id, synced_at desc);

-- ---------------------------------------------------------------------------
-- The member's own workouts outside Teraweights (a run, a ride), so the week
-- view can count them. They never count toward the streak.
-- ---------------------------------------------------------------------------
create table if not exists public.health_workouts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('apple_health', 'health_connect')),
  external_id text,
  kind text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  kcal int check (kcal >= 0),
  distance_m int check (distance_m >= 0),
  unique (member_id, source, external_id)
);
create index if not exists health_workouts_member_idx on public.health_workouts (member_id, started_at desc);

alter table public.session_metrics enable row level security;
alter table public.health_workouts enable row level security;

drop policy if exists "session_metrics: own" on public.session_metrics;
create policy "session_metrics: own" on public.session_metrics
  for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

drop policy if exists "health_workouts: own" on public.health_workouts;
create policy "health_workouts: own" on public.health_workouts
  for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());
