-- Exercises the booking functions in 0002_booking_functions.sql against the
-- seeded database, following demo script step 2 (brief section 13).
-- Entitlement *choices* are unit-tested in lib/rules/entitlement.test.ts; this
-- checks that the SQL side charges, refunds and waitlists correctly.
--
-- Run by scripts/db-check.sh after the seed. Rolled back at the end.

begin;

create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'BOOKING TEST FAILED: %', msg; end if;
end $$;

create or replace function pg_temp.sgt(d date, t time) returns timestamptz
language sql immutable as $$ select (d + t) at time zone 'Asia/Singapore' $$;

create or replace function pg_temp.as_user(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
end $$;

-- The cancellation cutoff must match lib/rules/cancellation.ts.
do $$
begin
  perform pg_temp.assert(public.cancellation_cutoff_hours() = 6,
    'cancellation_cutoff_hours() must equal CANCELLATION_CUTOFF_HOURS in lib/rules/cancellation.ts');
  perform pg_temp.assert(public.booking_close_hours() = 1,
    'booking_close_hours() must equal BOOKING_CLOSES_HOURS_BEFORE in lib/rules/booking-window.ts');
end $$;

do $$
declare
  aisyah uuid := 'a0000000-0000-4000-8000-000000000001';
  priya  uuid := 'a0000000-0000-4000-8000-000000000008';
  membership uuid := 'd0000000-0000-4000-8000-000000000001';
  creditpack uuid := 'd0000000-0000-4000-8000-000000000002';
  east uuid := 'c0000000-0000-4000-8000-000000000001';
  s_tue uuid;
  s_sat uuid;
  s_full uuid;
  r record;
  n int;
  v_other_booking uuid;
  v_other_member uuid;
begin
  perform pg_temp.as_user(aisyah);

  select s.id into s_tue from public.sessions s
   where s.class_type_id = east and s.starts_at = pg_temp.sgt('2026-09-15', '20:00');
  select s.id into s_sat from public.sessions s
   where s.class_type_id = east and s.starts_at = pg_temp.sgt('2026-09-19', '07:30');
  select s.id into s_full from public.sessions s
   where s.class_type_id = east and s.starts_at = pg_temp.sgt('2026-09-13', '07:30');
  perform pg_temp.assert(s_tue is not null and s_sat is not null and s_full is not null, 'demo sessions exist');

  -- Step 2a: Tue 15 Sep is included in the weekday membership.
  select * into r from public.apply_booking(s_tue, membership, 'membership');
  perform pg_temp.assert(r.status = 'booked', 'Tue 15 Sep booked, got ' || r.status);
  perform pg_temp.assert(r.credits_used = 0, 'membership booking costs no credit');
  perform pg_temp.assert((select mp.credits_remaining from public.member_packages mp where mp.id = creditpack) = 6,
    'credits untouched by a membership booking');

  -- Booking twice is refused.
  begin
    perform public.apply_booking(s_tue, membership, 'membership');
    raise exception 'double booking was allowed';
  exception when unique_violation then null;
  end;

  -- Step 2b: Sat 19 Sep falls to a credit; balance drops to 5.
  select * into r from public.apply_booking(s_sat, creditpack, 'credit');
  perform pg_temp.assert(r.status = 'booked', 'Sat 19 Sep booked');
  perform pg_temp.assert(r.credits_used = 1, 'credit booking costs 1');
  perform pg_temp.assert((select mp.credits_remaining from public.member_packages mp where mp.id = creditpack) = 5,
    'credits drop to 5');

  -- Step 2c: cancelling well ahead returns the credit.
  select * into r from public.cancel_booking(
    (select b.id from public.bookings b where b.session_id = s_sat and b.member_id = aisyah));
  perform pg_temp.assert(r.refunded = 1, 'credit refunded');
  perform pg_temp.assert(r.late = false, 'cancellation is not late');
  perform pg_temp.assert((select mp.credits_remaining from public.member_packages mp where mp.id = creditpack) = 6,
    'credits back to 6');
  perform pg_temp.assert((select b.status from public.bookings b where b.session_id = s_sat and b.member_id = aisyah) = 'cancelled',
    'booking is cancelled');

  -- Rebooking after a cancellation reuses the row.
  select * into r from public.apply_booking(s_sat, creditpack, 'credit');
  perform pg_temp.assert(r.status = 'booked', 'rebooking works');
  perform pg_temp.assert((select count(*) from public.bookings b where b.session_id = s_sat and b.member_id = aisyah) = 1,
    'one booking row per member per session');
  perform public.cancel_booking((select b.id from public.bookings b where b.session_id = s_sat and b.member_id = aisyah));

  -- Step 2d: a full session waitlists without charging.
  select * into r from public.apply_booking(s_full, creditpack, 'credit');
  perform pg_temp.assert(r.status = 'waitlisted', 'full session waitlists, got ' || r.status);
  perform pg_temp.assert(r.credits_used = 0, 'waitlisting is free');
  perform pg_temp.assert((select mp.credits_remaining from public.member_packages mp where mp.id = creditpack) = 6,
    'credits untouched when waitlisted');

  -- A cancellation by a booked member frees a seat and names the earliest
  -- waitlisted booking (Siti). Members cancel their own bookings, so act as them.
  select b.id, b.member_id into v_other_booking, v_other_member
    from public.bookings b
   where b.session_id = s_full and b.status = 'booked'
   order by b.created_at
   limit 1;
  perform pg_temp.as_user(v_other_member);
  select * into r from public.cancel_booking(v_other_booking);
  perform pg_temp.as_user(aisyah);
  perform pg_temp.assert(r.promote_booking_id is not null, 'a waitlisted booking is named for promotion');
  perform pg_temp.assert(
    (select b.member_id from public.bookings b where b.id = r.promote_booking_id) = 'a0000000-0000-4000-8000-000000000005',
    'Siti is first on the waitlist');

  -- Promotion must use a package belonging to the promoted member.
  perform pg_temp.assert(
    public.promote_booking(r.promote_booking_id, membership, 'membership') = false,
    'cannot promote using another member''s package');
  perform pg_temp.assert(
    (select b.status from public.bookings b where b.id = r.promote_booking_id) = 'waitlisted',
    'refused promotion leaves the member waitlisted');

  -- Promoting Siti on her own West membership: West does not cover an East
  -- session, so the SQL guard refuses it and she keeps her waitlist place.
  perform pg_temp.assert(
    public.promote_booking(
      r.promote_booking_id,
      (select mp.id from public.member_packages mp where mp.member_id = v_other_member limit 1),
      'membership') = false,
    'a West membership cannot pay for an East session');

  -- Guards -----------------------------------------------------------------
  perform pg_temp.as_user(priya);
  begin
    perform public.apply_booking(s_tue, 'd0000000-0000-4000-8000-000000000004', 'membership');
    raise exception 'expired package was accepted';
  exception when raise_exception then
    perform pg_temp.assert(sqlerrm like '%not active%', 'expired package rejected, got: ' || sqlerrm);
  end;

  begin
    perform public.apply_booking(s_tue, null, null);
    raise exception 'booking with no entitlement was accepted';
  exception when raise_exception then
    perform pg_temp.assert(sqlerrm like '%No active membership or credits%', 'blocked message, got: ' || sqlerrm);
  end;

  -- A credit pack cannot pay for PRIME (not in its allowed_class_types).
  perform pg_temp.as_user(aisyah);
  begin
    perform public.apply_booking(
      (select s.id from public.sessions s join public.class_types c on c.id = s.class_type_id
        where c.slug = 'prime' and s.starts_at = pg_temp.sgt('2026-09-14', '18:00')),
      creditpack, 'credit');
    raise exception 'credit pack paid for PRIME';
  exception when raise_exception then
    perform pg_temp.assert(sqlerrm like '%does not cover this class%', 'PRIME blocked, got: ' || sqlerrm);
  end;

  -- Roster counts are visible to members even though other bookings are not.
  select sc.booked_count into n from public.session_counts(
    pg_temp.sgt('2026-09-13', '00:00'), pg_temp.sgt('2026-09-14', '00:00')) sc
   where sc.session_id = s_full;
  perform pg_temp.assert(n = 5, 'session_counts reflects the cancellation, got ' || n);

  raise notice 'booking tests OK';
end $$;

rollback;
