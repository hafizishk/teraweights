-- Personal training (scope change, direction A: PT packs you book).
--
-- A PT pack is a package of kind 'pt' with N credits. Members book one-to-one
-- sessions inside a coach's open hours, one credit each, confirmed instantly.
-- Nothing here touches class bookings: lib/rules/entitlement.ts only ever
-- considers membership, credits and dropin kinds, so a PT pack can never pay
-- for a class and a class package can never pay for PT.

alter table public.packages drop constraint if exists packages_kind_check;
alter table public.packages add constraint packages_kind_check
  check (kind in ('membership', 'credits', 'dropin', 'pt'));

alter table public.member_packages drop constraint if exists member_packages_kind_check;
alter table public.member_packages add constraint member_packages_kind_check
  check (kind in ('membership', 'credits', 'dropin', 'pt'));

-- ---------------------------------------------------------------------------
-- Open hours: when a coach takes PT. Weekday 1 = Monday … 7 = Sunday, times in
-- Singapore local. Members see every coach's hours; a coach edits their own.
-- ---------------------------------------------------------------------------
create table if not exists public.pt_availability (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  venue_id uuid references public.venues (id) on delete set null,
  slot_minutes int not null default 60 check (slot_minutes in (30, 45, 60, 90)),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists pt_availability_coach_idx on public.pt_availability (coach_id, weekday);

-- ---------------------------------------------------------------------------
-- PT sessions: one member, one coach, one slot. The coach's note is what the
-- member reads afterwards ("trap bar 3×5 at 70 kg, up from 65").
-- ---------------------------------------------------------------------------
create table if not exists public.pt_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete restrict,
  member_id uuid not null references public.profiles (id) on delete cascade,
  member_package_id uuid references public.member_packages (id) on delete set null,
  venue_id uuid references public.venues (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'attended', 'no_show')),
  title text,
  coach_note text,
  credits_used int not null default 1,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);
create index if not exists pt_sessions_coach_idx on public.pt_sessions (coach_id, starts_at);
create index if not exists pt_sessions_member_idx on public.pt_sessions (member_id, starts_at);

-- A coach cannot be in two live PT sessions at once.
create unique index if not exists pt_sessions_coach_slot_uq
  on public.pt_sessions (coach_id, starts_at) where status in ('booked', 'attended');

grant select on public.pt_availability, public.pt_sessions to anon, authenticated;
grant insert, update, delete on public.pt_availability, public.pt_sessions to authenticated;
grant all on public.pt_availability, public.pt_sessions to service_role;

alter table public.pt_availability enable row level security;
alter table public.pt_sessions enable row level security;

create policy "pt_availability: read" on public.pt_availability
  for select to authenticated using (true);
create policy "pt_availability: coach own" on public.pt_availability
  for all to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "pt_availability: admin all" on public.pt_availability
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "pt_sessions: member read own" on public.pt_sessions
  for select to authenticated using (member_id = auth.uid());
create policy "pt_sessions: coach read own" on public.pt_sessions
  for select to authenticated using (coach_id = auth.uid());
create policy "pt_sessions: coach update own" on public.pt_sessions
  for update to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "pt_sessions: admin all" on public.pt_sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Coaches need to see the names of members they train.
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
  ) or exists (
    select 1 from public.pt_sessions p
    where p.member_id = mid and p.coach_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Taken slots. A member picking a time needs to know which of the coach's
-- hours are already gone, without seeing who took them.
-- ---------------------------------------------------------------------------
create or replace function public.pt_taken_slots(p_coach_id uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.starts_at, p.ends_at
    from public.pt_sessions p
   where p.coach_id = p_coach_id
     and p.status in ('booked', 'attended')
     and p.starts_at >= p_from and p.starts_at < p_to
  union all
  select s.starts_at, s.ends_at
    from public.sessions s
   where s.coach_id = p_coach_id
     and s.status = 'scheduled'
     and s.starts_at >= p_from and s.starts_at < p_to
$$;

grant execute on function public.pt_taken_slots(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- book_pt_session — one credit off the member's PT pack and a row in
-- pt_sessions, atomically. The slot must sit inside the coach's open hours,
-- must not clash with a class or another PT session, and must be in the
-- future. lib/rules/pt.ts decides which slots to *show*; this re-checks.
-- ---------------------------------------------------------------------------
create or replace function public.book_pt_session(
  p_coach_id uuid,
  p_starts_at timestamptz,
  p_slot_minutes int default 60
)
returns table (session_id uuid, credits_left int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_ends timestamptz := p_starts_at + make_interval(mins => p_slot_minutes);
  v_local timestamp := p_starts_at at time zone 'Asia/Singapore';
  v_weekday int := extract(isodow from v_local);
  v_avail public.pt_availability%rowtype;
  v_pkg public.member_packages%rowtype;
  v_id uuid;
begin
  if v_member is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_starts_at <= now() then
    raise exception 'That time has passed' using errcode = 'P0001';
  end if;

  select * into v_avail from public.pt_availability a
   where a.coach_id = p_coach_id
     and a.weekday = v_weekday
     and a.start_time <= v_local::time
     and a.end_time >= (v_local + make_interval(mins => p_slot_minutes))::time
     and a.slot_minutes = p_slot_minutes
   limit 1;
  if not found then
    raise exception 'That time is outside the coach''s open hours' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.pt_taken_slots(p_coach_id, p_starts_at - interval '1 day', v_ends + interval '1 day') t
     where t.starts_at < v_ends and t.ends_at > p_starts_at
  ) then
    raise exception 'That slot has just been taken' using errcode = 'P0001';
  end if;

  select * into v_pkg from public.member_packages mp
   where mp.member_id = v_member
     and mp.kind = 'pt'
     and mp.payment_status = 'paid'
     and mp.expires_at > now()
     and coalesce(mp.credits_remaining, 0) > 0
   order by mp.expires_at
   limit 1
   for update;
  if not found then
    raise exception 'No PT sessions left. Renew your PT pack to book.' using errcode = 'P0001';
  end if;

  update public.member_packages set credits_remaining = credits_remaining - 1 where id = v_pkg.id;

  insert into public.pt_sessions (coach_id, member_id, member_package_id, venue_id, starts_at, ends_at, credits_used)
  values (p_coach_id, v_member, v_pkg.id, v_avail.venue_id, p_starts_at, v_ends, 1)
  returning id into v_id;

  return query select v_id, v_pkg.credits_remaining - 1;
end $$;

grant execute on function public.book_pt_session(uuid, timestamptz, int) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- cancel_pt_session — the member's own booking. Outside the cutoff the credit
-- comes back; inside it the coach's hour is already lost, so it does not.
-- Same cutoff as classes (cancellation_cutoff_hours, canonical in
-- lib/rules/cancellation.ts).
-- ---------------------------------------------------------------------------
create or replace function public.cancel_pt_session(p_session_id uuid)
returns table (refunded int, late boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_row public.pt_sessions%rowtype;
  v_late boolean;
begin
  select * into v_row from public.pt_sessions p where p.id = p_session_id for update;
  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  if v_row.member_id <> v_member and not public.is_admin() then
    raise exception 'Not your session' using errcode = '42501';
  end if;
  if v_row.status <> 'booked' then
    raise exception 'That session is not booked' using errcode = 'P0001';
  end if;

  v_late := now() > v_row.starts_at - make_interval(hours => public.cancellation_cutoff_hours());

  if not v_late and v_row.member_package_id is not null then
    update public.member_packages
       set credits_remaining = coalesce(credits_remaining, 0) + v_row.credits_used
     where id = v_row.member_package_id;
  end if;

  update public.pt_sessions
     set status = 'cancelled', cancelled_at = now()
   where id = p_session_id;

  return query select case when v_late then 0 else v_row.credits_used end, v_late;
end $$;

grant execute on function public.cancel_pt_session(uuid) to authenticated, service_role;
