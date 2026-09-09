-- Booking effects that RLS deliberately forbids members from doing directly:
-- deducting credits, reading roster counts, promoting someone off a waitlist.
--
-- The *choice* of which package pays for a booking stays in lib/rules/entitlement.ts.
-- These functions only enforce integrity: capacity, ownership, payment, expiry,
-- allowed class types, non-negative credits, and atomicity under concurrency.

-- Set when a waitlisted booking is promoted into a freed seat.
alter table public.bookings add column if not exists promoted_at timestamptz;

-- ---------------------------------------------------------------------------
-- Cancellation cutoff (brief section 7). Canonical copy lives in
-- lib/rules/cancellation.ts; scripts/db-assert.sql asserts the two agree.
-- ---------------------------------------------------------------------------
create or replace function public.cancellation_cutoff_hours()
returns int language sql immutable as $$ select 6 $$;

-- Booking closes this long before the session starts (brief section 7).
create or replace function public.booking_close_hours()
returns int language sql immutable as $$ select 1 $$;

-- ---------------------------------------------------------------------------
-- Roster counts. Members can only read their own bookings, so "3 left" needs a
-- definer function. Returns counts only — never who is booked.
-- ---------------------------------------------------------------------------
create or replace function public.session_counts(p_from timestamptz, p_to timestamptz)
returns table (session_id uuid, booked_count int, waitlisted_count int)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,
         count(*) filter (where b.status = 'booked')::int,
         count(*) filter (where b.status = 'waitlisted')::int
    from public.sessions s
    left join public.bookings b on b.session_id = s.id
   where s.starts_at >= p_from and s.starts_at < p_to
   group by s.id
$$;

grant execute on function public.session_counts(timestamptz, timestamptz) to anon, authenticated, service_role;
grant execute on function public.cancellation_cutoff_hours() to anon, authenticated, service_role;
grant execute on function public.booking_close_hours() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- apply_booking — books or waitlists the caller for a session, atomically.
-- p_member_package_id / p_entitlement come from lib/rules/entitlement.ts.
-- ---------------------------------------------------------------------------
create or replace function public.apply_booking(
  p_session_id uuid,
  p_member_package_id uuid,
  p_entitlement text
)
returns table (booking_id uuid, status text, entitlement text, credits_used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_slug text;
  v_pkg public.member_packages%rowtype;
  v_booked int;
  v_existing public.bookings%rowtype;
  v_status text;
  v_entitlement text;
  v_credits int := 0;
  v_pkg_id uuid;
  v_booking_id uuid;
begin
  if v_member is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_entitlement is not null and p_entitlement not in ('membership', 'credit', 'fe_credit') then
    raise exception 'Unknown entitlement %', p_entitlement using errcode = '22023';
  end if;

  -- Serialise everyone booking the same session.
  select * into v_session from public.sessions s where s.id = p_session_id for update;
  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  if v_session.status <> 'scheduled' then
    raise exception 'This session is not open for booking' using errcode = 'P0001';
  end if;
  if now() >= v_session.starts_at - make_interval(hours => public.booking_close_hours()) then
    raise exception 'Booking closed for this session' using errcode = 'P0001';
  end if;

  select ct.slug into v_slug from public.class_types ct where ct.id = v_session.class_type_id;

  select * into v_existing from public.bookings b
   where b.session_id = p_session_id and b.member_id = v_member;
  if found and v_existing.status in ('booked', 'waitlisted', 'attended') then
    raise exception 'Already booked' using errcode = '23505';
  end if;

  select count(*)::int into v_booked from public.bookings b
   where b.session_id = p_session_id and b.status in ('booked', 'attended');

  if v_booked >= v_session.capacity then
    -- Waitlist: nothing is charged until promotion.
    v_status := 'waitlisted';
    v_entitlement := null;
    v_pkg_id := null;
  else
    v_status := 'booked';
    v_entitlement := p_entitlement;
    if p_member_package_id is null or p_entitlement is null then
      raise exception 'No active membership or credits. Contact us.' using errcode = 'P0001';
    end if;

    select * into v_pkg from public.member_packages mp
     where mp.id = p_member_package_id and mp.member_id = v_member
     for update;
    if not found then
      raise exception 'Package not found' using errcode = 'P0002';
    end if;
    if v_pkg.payment_status <> 'paid' or v_pkg.expires_at <= now() then
      raise exception 'That package is not active' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.packages p
       where p.id = v_pkg.package_id and v_slug = any (p.allowed_class_types)
    ) and p_entitlement <> 'fe_credit' then
      raise exception 'That package does not cover this class' using errcode = 'P0001';
    end if;

    if p_entitlement = 'credit' then
      update public.member_packages
         set credits_remaining = credits_remaining - 1
       where id = v_pkg.id and coalesce(credits_remaining, 0) > 0;
      if not found then
        raise exception 'No credits left on that package' using errcode = 'P0001';
      end if;
      v_credits := 1;
    elsif p_entitlement = 'fe_credit' then
      if v_slug <> 'fitness_engine' then
        raise exception 'Fitness Engine passes only work on Fitness Engine sessions' using errcode = 'P0001';
      end if;
      update public.member_packages
         set fe_credits_remaining = fe_credits_remaining - 1
       where id = v_pkg.id and fe_credits_remaining > 0;
      if not found then
        raise exception 'No Fitness Engine passes left' using errcode = 'P0001';
      end if;
      v_credits := 1;
    end if;
    v_pkg_id := v_pkg.id;
  end if;

  if v_existing.id is not null then
    update public.bookings
       set status = v_status,
           entitlement = v_entitlement,
           credits_used = v_credits,
           member_package_id = v_pkg_id,
           created_at = now(),
           cancelled_at = null,
           late_cancel = false
     where id = v_existing.id
     returning id into v_booking_id;
  else
    insert into public.bookings (session_id, member_id, member_package_id, status, entitlement, credits_used)
    values (p_session_id, v_member, v_pkg_id, v_status, v_entitlement, v_credits)
    returning id into v_booking_id;
  end if;

  return query select v_booking_id, v_status, v_entitlement, v_credits;
end $$;

grant execute on function public.apply_booking(uuid, uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- cancel_booking — cancels the caller's booking, refunds a credit when the
-- cancellation is outside the cutoff, and names the next waitlisted booking so
-- the server action can resolve its entitlement with the same TS rules.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_booking(p_booking_id uuid)
returns table (refunded int, late boolean, promote_booking_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_session public.sessions%rowtype;
  v_late boolean;
  v_refund int := 0;
  v_promote uuid;
  v_booked int;
begin
  if v_member is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if v_booking.member_id <> v_member and not public.is_admin() then
    raise exception 'Not your booking' using errcode = '42501';
  end if;
  if v_booking.status not in ('booked', 'waitlisted') then
    raise exception 'That booking is not active' using errcode = 'P0001';
  end if;

  select * into v_session from public.sessions s where s.id = v_booking.session_id for update;

  v_late := v_booking.status = 'booked'
        and now() > v_session.starts_at - make_interval(hours => public.cancellation_cutoff_hours());

  if v_booking.credits_used > 0 and not v_late and v_booking.member_package_id is not null then
    if v_booking.entitlement = 'fe_credit' then
      update public.member_packages
         set fe_credits_remaining = fe_credits_remaining + v_booking.credits_used
       where id = v_booking.member_package_id;
    else
      update public.member_packages
         set credits_remaining = coalesce(credits_remaining, 0) + v_booking.credits_used
       where id = v_booking.member_package_id;
    end if;
    v_refund := v_booking.credits_used;
  end if;

  update public.bookings
     set status = 'cancelled',
         cancelled_at = now(),
         late_cancel = v_late
   where id = v_booking.id;

  -- A freed seat: name the earliest waitlisted booking for promotion.
  if v_booking.status = 'booked' then
    select count(*)::int into v_booked from public.bookings b
     where b.session_id = v_session.id and b.status in ('booked', 'attended');
    if v_booked < v_session.capacity then
      select b.id into v_promote from public.bookings b
       where b.session_id = v_session.id and b.status = 'waitlisted'
       order by b.created_at
       limit 1;
    end if;
  end if;

  return query select v_refund, v_late, v_promote;
end $$;

grant execute on function public.cancel_booking(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- promote_booking — moves a waitlisted booking into a freed seat, charging the
-- package the caller's rules resolved for that member. Callable by any signed-in
-- user because promotion is triggered by whoever cancelled.
-- ---------------------------------------------------------------------------
create or replace function public.promote_booking(
  p_booking_id uuid,
  p_member_package_id uuid,
  p_entitlement text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_session public.sessions%rowtype;
  v_pkg public.member_packages%rowtype;
  v_slug text;
  v_booked int;
  v_credits int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_booking from public.bookings b where b.id = p_booking_id for update;
  if not found or v_booking.status <> 'waitlisted' then
    return false;
  end if;

  select * into v_session from public.sessions s where s.id = v_booking.session_id for update;
  if v_session.status <> 'scheduled' then
    return false;
  end if;

  select count(*)::int into v_booked from public.bookings b
   where b.session_id = v_session.id and b.status in ('booked', 'attended');
  if v_booked >= v_session.capacity then
    return false;
  end if;

  if p_entitlement is null or p_entitlement not in ('membership', 'credit', 'fe_credit') then
    return false;   -- Nothing to charge: they stay on the waitlist.
  end if;

  select ct.slug into v_slug from public.class_types ct where ct.id = v_session.class_type_id;

  select * into v_pkg from public.member_packages mp
   where mp.id = p_member_package_id and mp.member_id = v_booking.member_id
   for update;
  if not found or v_pkg.payment_status <> 'paid' or v_pkg.expires_at <= now() then
    return false;
  end if;

  if p_entitlement = 'credit' then
    update public.member_packages set credits_remaining = credits_remaining - 1
     where id = v_pkg.id and coalesce(credits_remaining, 0) > 0;
    if not found then return false; end if;
    v_credits := 1;
  elsif p_entitlement = 'fe_credit' then
    if v_slug <> 'fitness_engine' then return false; end if;
    update public.member_packages set fe_credits_remaining = fe_credits_remaining - 1
     where id = v_pkg.id and fe_credits_remaining > 0;
    if not found then return false; end if;
    v_credits := 1;
  end if;

  update public.bookings
     set status = 'booked',
         entitlement = p_entitlement,
         member_package_id = v_pkg.id,
         credits_used = v_credits,
         promoted_at = now()
   where id = v_booking.id;

  return true;
end $$;

grant execute on function public.promote_booking(uuid, uuid, text) to authenticated, service_role;
