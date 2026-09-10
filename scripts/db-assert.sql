-- Assertions that the seeded database matches brief section 11 and that RLS
-- behaves per section 6. Runs after seed.sql in npm run db:check.

create or replace function pg_temp.assert(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'ASSERT FAILED: %', msg; end if;
end $$;

create or replace function pg_temp.sgt(d date, t time) returns timestamptz
language sql immutable as $$ select (d + t) at time zone 'Asia/Singapore' $$;

do $$
declare
  aisyah uuid := 'a0000000-0000-4000-8000-000000000001';
  n int;
  t text;
begin
  perform pg_temp.assert((select count(*) from public.profiles) = 13, '12 members + admin');
  perform pg_temp.assert((select role from public.profiles where email = 'hafizishk+admin@gmail.com') = 'admin', 'admin role');
  perform pg_temp.assert((select role from public.profiles where email = 'hafizishk+faizal@gmail.com') = 'coach', 'coach role');
  perform pg_temp.assert((select full_name from public.profiles where id = aisyah) = 'Aisyah Rahman', 'demo member name');

  perform pg_temp.assert((select count(*) from public.class_types) = 4, '4 class types');
  perform pg_temp.assert((select count(*) from public.venues) = 6, '6 venues');
  perform pg_temp.assert((select count(*) from public.packages) = 19, '18 packages + trial');
  perform pg_temp.assert((select price_sgd from public.packages where name = 'Energise Weekday 4-month') = 260, 'Weekday 4-month = 260');
  perform pg_temp.assert((select validity_days from public.packages where name = 'Energise PRO 12-month') = 420, 'PRO 12-month validity 420');

  -- September schedule
  select count(*) into n from public.sessions s join public.class_types c on c.id = s.class_type_id
   where c.slug = 'energise_east' and s.starts_at >= pg_temp.sgt('2026-09-01','00:00') and s.starts_at < pg_temp.sgt('2026-10-01','00:00');
  perform pg_temp.assert(n = 17, 'East Sep: 4 Tue + 4 Thu + 4 Sat + 4 Sun + ... = 17, got ' || n);
  select count(*) into n from public.sessions s join public.class_types c on c.id = s.class_type_id
   where c.slug = 'fitness_engine';
  perform pg_temp.assert(n = 6, 'FE has 6 sessions, got ' || n);
  select count(*) into n from public.sessions s join public.class_types c on c.id = s.class_type_id
   where c.slug = 'prime' and s.starts_at >= pg_temp.sgt('2026-09-01','00:00');
  perform pg_temp.assert(n = 13, 'PRIME Sep: 4 Mon + 5 Wed + 4 Sun = 13, got ' || n);
  perform pg_temp.assert(exists (select 1 from public.sessions where starts_at = pg_temp.sgt('2026-09-10','20:00')), 'Thu 10 Sep 8pm exists');
  perform pg_temp.assert(exists (select 1 from public.sessions where starts_at = pg_temp.sgt('2026-09-15','20:00')), 'Tue 15 Sep 8pm exists');
  perform pg_temp.assert(exists (select 1 from public.sessions where starts_at = pg_temp.sgt('2026-09-19','07:30')), 'Sat 19 Sep 7.30am exists');
  perform pg_temp.assert(exists (select 1 from public.sessions s join public.class_types c on c.id = s.class_type_id where c.slug = 'prime' and starts_at = pg_temp.sgt('2026-09-14','18:00')), 'PRIME Mon 14 Sep exists');

  -- Aisyah
  perform pg_temp.assert((select count(*) from public.member_packages where member_id = aisyah and payment_status = 'paid' and expires_at > pg_temp.sgt('2026-09-09','12:00')) = 2, 'Aisyah has 2 active packages');
  perform pg_temp.assert((select credits_remaining from public.member_packages where member_id = aisyah and kind = 'credits') = 6, 'Aisyah 6 credits');
  perform pg_temp.assert((select (expires_at at time zone 'Asia/Singapore')::date from public.member_packages where member_id = aisyah and kind = 'membership') = date '2026-09-28', 'Aisyah membership expires 28 Sep');
  perform pg_temp.assert((select (expires_at at time zone 'Asia/Singapore')::date from public.member_packages where member_id = aisyah and kind = 'credits') = date '2026-11-15', 'Aisyah credits expire 15 Nov');
  perform pg_temp.assert((select count(*) from public.bookings where member_id = aisyah and status = 'attended') = 14, 'Aisyah attended 14');
  perform pg_temp.assert(exists (select 1 from public.bookings b join public.sessions s on s.id = b.session_id where b.member_id = aisyah and b.status = 'booked' and s.starts_at = pg_temp.sgt('2026-09-10','20:00') and b.entitlement = 'membership'), 'Aisyah booked Thu 10 Sep');
  perform pg_temp.assert(not exists (select 1 from public.event_registrations where member_id = aisyah and event_id = 'e0000000-0000-4000-8000-000000000001'), 'Aisyah not yet registered for PA.ROX Sep');
  perform pg_temp.assert(not exists (select 1 from public.coach_assignments where member_id = aisyah), 'Aisyah has no coach');
  select string_agg(total_seconds::text, ',' order by e.event_date) into t
    from public.event_results r join public.events e on e.id = r.event_id where r.member_id = aisyah;
  perform pg_temp.assert(t = '2892,2677,2465', 'Aisyah results 48:12, 44:37, 41:05 — got ' || t);
  perform pg_temp.assert((select count(*) from public.event_results where station_splits is not null
     and (select sum((s->>'seconds')::int) from jsonb_array_elements(station_splits) s) <> total_seconds) = 0, 'splits sum to total');

  -- Marcus, Priya
  perform pg_temp.assert(exists (select 1 from public.member_packages mp join public.packages p on p.id = mp.package_id where mp.member_id = 'a0000000-0000-4000-8000-000000000006' and p.tier = 'pro' and mp.payment_status = 'paid'), 'Marcus PRO');
  perform pg_temp.assert((select count(*) from public.member_packages where member_id = 'a0000000-0000-4000-8000-000000000008' and expires_at > pg_temp.sgt('2026-09-09','12:00')) = 0, 'Priya has no active package');

  -- Events, results, announcements
  perform pg_temp.assert((select count(*) from public.events) = 6, '6 events');
  perform pg_temp.assert((select count(*) from public.event_slots where event_id = 'e0000000-0000-4000-8000-000000000001') = 3, 'PA.ROX Sep 3 waves');
  select count(*) into n from public.event_results group by event_id having count(*) < 10 or count(*) > 15;
  perform pg_temp.assert(n is null, 'results 10–15 per event');
  perform pg_temp.assert((select count(*) from public.event_results where member_id is null) > 0, 'unmatched guests in results');
  perform pg_temp.assert((select count(*) from public.announcements where published_at is not null) = 3, '3 published announcements');

  -- Full session with waitlist
  select count(*) into n from public.bookings b join public.sessions s on s.id = b.session_id
   where s.starts_at = pg_temp.sgt('2026-09-13','07:30') and b.status = 'booked';
  perform pg_temp.assert(n = (select capacity from public.sessions where starts_at = pg_temp.sgt('2026-09-13','07:30')), 'Sun 13 Sep is full');
  perform pg_temp.assert(exists (select 1 from public.bookings b join public.sessions s on s.id = b.session_id where s.starts_at = pg_temp.sgt('2026-09-13','07:30') and b.status = 'waitlisted'), 'Sun 13 Sep has waitlist');
end $$;

-- ---------------------------------------------------------------------------
-- RLS smoke tests
-- ---------------------------------------------------------------------------
create or replace function pg_temp.as_user(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  perform set_config('request.jwt.claim.role', case when uid is null then 'anon' else 'authenticated' end, true);
end $$;

do $$
declare
  aisyah uuid := 'a0000000-0000-4000-8000-000000000001';
  priya  uuid := 'a0000000-0000-4000-8000-000000000008';
  faizal uuid := 'a0000000-0000-4000-8000-000000000003';
  n int;
begin
  -- Aisyah (member)
  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  perform pg_temp.assert((select count(*) from public.member_packages) = 2, 'RLS: Aisyah sees only her 2 packages');
  perform pg_temp.assert((select count(*) from public.bookings where member_id <> aisyah) = 0, 'RLS: Aisyah sees no other bookings');
  perform pg_temp.assert((select count(*) from public.profiles where id = priya) = 0, 'RLS: Aisyah cannot read Priya');
  perform pg_temp.assert((select count(*) from public.profiles where id = faizal) = 1, 'RLS: Aisyah can read coach display row');
  perform pg_temp.assert((select count(*) from public.event_results where event_id = 'e0000000-0000-4000-8000-000000000006') = 14, 'RLS: Aisyah sees Apr 2026 leaderboard');
  perform pg_temp.assert((select count(*) from public.announcements) = 3, 'RLS: published announcements visible');
  perform pg_temp.assert((select count(*) from public.sessions) > 0, 'RLS: sessions readable');
  perform pg_temp.assert((select count(*) from public.admin_allowlist) = 0, 'RLS: allowlist hidden from members');
  begin
    update public.profiles set role = 'admin' where id = aisyah;
    raise exception 'RLS: member escalated own role';
  exception when check_violation or insufficient_privilege then
    null;
  end;
  reset role;

  -- Priya (member with no results in Jul 2025)
  perform pg_temp.as_user(priya);
  set local role authenticated;
  perform pg_temp.assert((select count(*) from public.event_results where event_id = 'e0000000-0000-4000-8000-000000000005') = 0, 'RLS: Priya cannot see Jul 2025 leaderboard');
  perform pg_temp.assert((select count(*) from public.event_results where event_id = 'e0000000-0000-4000-8000-000000000004') = 14, 'RLS: Priya sees KG Aug leaderboard');
  reset role;

  -- Faizal (coach)
  perform pg_temp.as_user(faizal);
  set local role authenticated;
  perform pg_temp.assert((select count(*) from public.bookings b join public.sessions s on s.id = b.session_id where s.starts_at = pg_temp.sgt('2026-09-10','20:00')) = 5, 'RLS: coach sees Thu 10 Sep roster');
  perform pg_temp.assert((select count(*) from public.profiles where id = aisyah) = 1, 'RLS: coach reads member in his session');
  perform pg_temp.assert((select count(*) from public.member_packages) = 0, 'RLS: coach cannot read packages');
  perform pg_temp.assert(public.is_staff(), 'is_staff for coach');
  perform pg_temp.assert(not public.is_admin(), 'coach is not admin');
  reset role;

  -- Anonymous
  perform pg_temp.as_user(null);
  set local role anon;
  perform pg_temp.assert((select count(*) from public.events) = 6, 'RLS: anon sees public events');
  perform pg_temp.assert((select count(*) from public.sessions) > 0, 'RLS: anon reads sessions');
  perform pg_temp.assert((select count(*) from public.packages) = 19, 'RLS: anon reads packages');
  perform pg_temp.assert((select count(*) from public.event_registrations) = 0, 'RLS: anon sees no registrations');
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- Community functions (0003): attendees respect sharing; pulse is sane
-- ---------------------------------------------------------------------------
do $$
declare
  aisyah uuid := 'a0000000-0000-4000-8000-000000000001';
  nur    uuid := 'a0000000-0000-4000-8000-000000000002';
  thu uuid;
  n int;
begin
  select s.id into thu from public.sessions s where s.starts_at = pg_temp.sgt('2026-09-10','20:00');

  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  select count(*) into n from public.session_attendees(array[thu]);
  perform pg_temp.assert(n = 5, 'Thu 10 Sep shows 5 attendees, got ' || n);
  perform pg_temp.assert(exists (select 1 from public.session_attendees(array[thu]) a where a.member_id = nur), 'Nur is listed');
  reset role;

  update public.profiles set share_attendance = false where id = nur;
  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  perform pg_temp.assert(not exists (select 1 from public.session_attendees(array[thu]) a where a.member_id = nur), 'Nur hidden after opting out');
  perform pg_temp.assert((select count(*) from public.session_attendees(array[thu])) = 4, 'count drops to 4');
  reset role;
  update public.profiles set share_attendance = true where id = nur;

  -- A member who opted out still sees themself.
  update public.profiles set share_attendance = false where id = aisyah;
  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  perform pg_temp.assert(exists (select 1 from public.session_attendees(array[thu]) a where a.member_id = aisyah), 'opted-out member still sees self');
  reset role;
  update public.profiles set share_attendance = true where id = aisyah;

  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  perform pg_temp.assert((select trained_this_week from public.community_pulse()) >= 0, 'pulse readable by members');
  perform pg_temp.assert((select sessions_left_this_week from public.community_pulse()) >= 0, 'sessions left readable');
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- Free trial week (0004)
-- ---------------------------------------------------------------------------
do $$
declare
  aisyah uuid := 'a0000000-0000-4000-8000-000000000001';
  priya  uuid := 'a0000000-0000-4000-8000-000000000008';
  v_id uuid;
begin
  perform pg_temp.assert((select count(*) from public.packages where is_trial) = 1, 'one trial package');
  perform pg_temp.assert((select price_sgd from public.packages where is_trial) = 0, 'trial is free');

  -- Priya (expired membership) can start one.
  perform pg_temp.as_user(priya);
  set local role authenticated;
  select public.start_trial() into v_id;
  perform pg_temp.assert(v_id is not null, 'Priya starts a trial');
  perform pg_temp.assert((select count(*) from public.member_packages where member_id = priya and is_trial and payment_status = 'paid' and expires_at > now()) = 1, 'trial is active and paid');
  perform pg_temp.assert((select (expires_at - starts_at) from public.member_packages where id = v_id) = interval '7 days', 'trial lasts 7 days');

  -- Only once.
  begin
    perform public.start_trial();
    raise exception 'second trial was allowed';
  exception when raise_exception then
    perform pg_temp.assert(sqlerrm like '%already used%', 'second trial refused, got: ' || sqlerrm);
  end;
  reset role;

  -- Aisyah (active membership) cannot.
  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  begin
    perform public.start_trial();
    raise exception 'trial allowed alongside an active membership';
  exception when raise_exception then
    perform pg_temp.assert(sqlerrm like '%active membership%', 'active membership blocks trial, got: ' || sqlerrm);
  end;
  reset role;

  -- Leave the seed as the demo expects: Priya has no active package.
  delete from public.member_packages where id = v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Event registration (0005): capacity, waitlist, promotion, guest path
-- ---------------------------------------------------------------------------
do $$
declare
  aisyah uuid := 'a0000000-0000-4000-8000-000000000001';
  priya  uuid := 'a0000000-0000-4000-8000-000000000008';
  marcus uuid := 'a0000000-0000-4000-8000-000000000006';
  parox uuid := 'e0000000-0000-4000-8000-000000000001';
  wave1 uuid := 'f0000000-0000-4000-8000-000000000001';
  wave2 uuid := 'f0000000-0000-4000-8000-000000000002';
  ff uuid := 'e0000000-0000-4000-8000-000000000002';
  walk uuid := 'f0000000-0000-4000-8000-000000000004';
  r record;
  v_priya uuid;
  v_marcus uuid;
  n int;
begin
  -- Demo step 3: Aisyah picks Wave 2 and registers; PA.ROX is paid, so pending.
  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  select * into r from public.register_for_event(parox, wave2);
  perform pg_temp.assert(r.status = 'registered' and r.payment_status = 'pending', 'Aisyah registered, payment pending');
  begin
    perform public.register_for_event(parox, wave2);
    raise exception 'double registration allowed';
  exception when unique_violation then null;
  end;
  select count(*) into n from public.event_registrations where member_id = aisyah and event_id = parox and status <> 'cancelled';
  perform pg_temp.assert(n = 1, 'one live registration');
  select registered_count into n from public.event_slot_counts(parox) where slot_id = wave2;
  perform pg_temp.assert(n = 3, 'Wave 2 count includes Aisyah, got ' || n);
  perform public.cancel_event_registration(r.registration_id);
  reset role;

  -- Capacity: shrink Wave 1 to its current 2, then Priya waitlists; cancelling Marcus promotes her.
  update public.event_slots set capacity = 2 where id = wave1;
  perform pg_temp.as_user(priya);
  set local role authenticated;
  select * into r from public.register_for_event(parox, wave1);
  perform pg_temp.assert(r.status = 'waitlisted', 'full wave waitlists, got ' || r.status);
  v_priya := r.registration_id;
  reset role;

  select id into v_marcus from public.event_registrations where event_id = parox and member_id = marcus and status <> 'cancelled';
  perform pg_temp.as_user(marcus);
  set local role authenticated;
  select * into r from public.cancel_event_registration(v_marcus);
  perform pg_temp.assert(r.promoted_registration_id = v_priya, 'Priya promoted off the waitlist');
  perform pg_temp.assert((select status from public.event_registrations where id = v_priya) = 'registered', 'promoted status');
  reset role;

  -- Restore the seed.
  delete from public.event_registrations where id = v_priya;
  update public.event_registrations set status = 'registered' where id = v_marcus;
  update public.event_slots set capacity = 30 where id = wave1;

  -- Guest path (no auth.uid()): free public event is fine, PA.ROX needs an account.
  perform pg_temp.as_user(null);
  select * into r from public.register_for_event(ff, walk, 'Test Guest', 'test.guest@example.com', '+65 9000 0000');
  perform pg_temp.assert(r.status = 'registered' and r.payment_status = 'n/a', 'guest registered free');
  begin
    perform public.register_for_event(ff, walk, 'Test Guest', 'TEST.GUEST@example.com', '+65 9000 0000');
    raise exception 'duplicate guest email allowed';
  exception when unique_violation then null;
  end;
  begin
    perform public.register_for_event(parox, wave1, 'Test Guest', 'test.guest@example.com', '+65 9000 0000');
    raise exception 'guest registered for PA.ROX';
  exception when raise_exception then
    perform pg_temp.assert(sqlerrm like '%needs an account%', 'PA.ROX refuses guests, got: ' || sqlerrm);
  end;
  delete from public.event_registrations where guest_email = 'test.guest@example.com';

  select registered_count into n from public.event_registration_counts(array[parox]) where event_id = parox;
  perform pg_temp.assert(n = 6, 'PA.ROX Sep has 6 registered, got ' || n);
end $$;

-- ---------------------------------------------------------------------------
-- Profile + check-in (0006)
-- ---------------------------------------------------------------------------
do $$
declare
  aisyah uuid := 'a0000000-0000-4000-8000-000000000001';
  faizal uuid := 'a0000000-0000-4000-8000-000000000003';
  admin_ uuid := 'a0000000-0000-4000-8000-000000000099';
  thu uuid;
  secret text;
  n int;
begin
  select s.id into thu from public.sessions s where s.starts_at = pg_temp.sgt('2026-09-10','20:00');
  perform pg_temp.assert((select count(*) from public.sessions where qr_secret is null) = 0, 'every session has a secret');
  perform pg_temp.assert((select onboarded_at from public.profiles where id = aisyah) is not null, 'seeded members are onboarded');
  perform pg_temp.assert((select weekly_target from public.profiles where id = aisyah) = 3, 'Aisyah targets 3 a week');
  perform pg_temp.assert((select onboarded_at from public.profiles where id = 'a0000000-0000-4000-8000-000000000008') is null, 'Priya still has onboarding to do');

  -- Members can read sessions but never the secret column.
  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  select count(*) into n from public.sessions;
  perform pg_temp.assert(n > 0, 'member still counts sessions');
  select count(*) into n from public.sessions s where s.starts_at > now();
  perform pg_temp.assert(n > 0, 'member still reads session columns');
  begin
    perform s.qr_secret from public.sessions s limit 1;
    raise exception 'member read qr_secret';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.session_qr_secret(thu);
    raise exception 'member fetched a secret via RPC';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- The session's coach and the admin can.
  perform pg_temp.as_user(faizal);
  set local role authenticated;
  select public.session_qr_secret(thu) into secret;
  perform pg_temp.assert(length(secret) = 32, 'coach reads secret');
  reset role;
  perform pg_temp.as_user(admin_);
  set local role authenticated;
  perform pg_temp.assert(public.session_qr_secret(thu) = secret, 'admin reads the same secret');
  reset role;

  -- Attendees now carry avatar_url.
  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  perform pg_temp.assert((select count(*) from public.session_attendees(array[thu])) = 5, 'attendees still 5');
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- 0007 — admin portal: credit adjustments and session cancellation.
-- ---------------------------------------------------------------------------
do $$
declare
  aisyah uuid := 'a0000000-0000-4000-8000-000000000001';
  admin_ uuid := 'a0000000-0000-4000-8000-000000000099';
  pack uuid;
  thu uuid;
  before_credits int;
  after_credits int;
  refunded int;
begin
  select mp.id, mp.credits_remaining into pack, before_credits
    from public.member_packages mp
   where mp.member_id = aisyah and mp.kind = 'credits'
   limit 1;
  perform pg_temp.assert(pack is not null, 'Aisyah holds a credit pack');

  -- A member cannot adjust their own balance.
  perform pg_temp.as_user(aisyah);
  set local role authenticated;
  begin
    perform public.admin_adjust_credits(pack, 5, 'nice try');
    raise exception 'member adjusted credits';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- An admin can, and the reason is recorded.
  perform pg_temp.as_user(admin_);
  set local role authenticated;
  select public.admin_adjust_credits(pack, 2, 'goodwill after a washout') into after_credits;
  perform pg_temp.assert(after_credits = before_credits + 2, 'credits moved by the delta');
  perform pg_temp.assert(
    (select count(*) from public.credit_adjustments ca where ca.member_package_id = pack and ca.delta = 2) = 1,
    'adjustment logged');

  -- A reason is compulsory, and a balance cannot go negative.
  begin
    perform public.admin_adjust_credits(pack, -1, '   ');
    raise exception 'adjusted without a reason';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.admin_adjust_credits(pack, -9999, 'overdraw');
    raise exception 'balance went negative';
  exception when sqlstate 'P0001' then null;
  end;

  -- Put it back so later assertions see the seeded balance.
  perform public.admin_adjust_credits(pack, -2, 'undo test adjustment');
  perform pg_temp.assert(
    (select mp.credits_remaining from public.member_packages mp where mp.id = pack) = before_credits,
    'balance restored');

  -- Cancelling a session releases every booking and refunds credits. Both
  -- credit-paid bookings in the seed sit on sessions the demo script walks
  -- through, so this builds a throwaway session rather than disturbing them.
  insert into public.sessions (class_type_id, venue_id, starts_at, ends_at, capacity)
  select s.class_type_id, s.venue_id, pg_temp.sgt('2026-12-30','20:00'), pg_temp.sgt('2026-12-30','21:00'), 20
    from public.sessions s limit 1
  returning id into thu;

  update public.member_packages set credits_remaining = credits_remaining - 1 where id = pack;
  insert into public.bookings (session_id, member_id, member_package_id, status, entitlement, credits_used)
  values (thu, aisyah, pack, 'booked', 'credit', 1);

  select c.refunded into refunded from public.admin_cancel_session(thu) c;
  perform pg_temp.assert(refunded = 1, 'one credit refunded, got ' || refunded);
  perform pg_temp.assert(
    (select mp.credits_remaining from public.member_packages mp where mp.id = pack) = before_credits,
    'the refunded credit came back');
  perform pg_temp.assert(
    (select count(*) from public.bookings b where b.session_id = thu and b.status in ('booked', 'waitlisted')) = 0,
    'no live bookings remain');
  perform pg_temp.assert(
    (select s.status from public.sessions s where s.id = thu) = 'cancelled',
    'session is cancelled');

  -- Cancelling twice is refused rather than double-refunding.
  begin
    perform public.admin_cancel_session(thu);
    raise exception 'cancelled the same session twice';
  exception when sqlstate 'P0001' then null;
  end;

  delete from public.bookings where session_id = thu;
  delete from public.sessions where id = thu;

  reset role;

  raise notice 'admin portal assertions OK';
end $$;
