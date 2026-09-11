-- Teraweights seed — implements brief section 11 exactly.
-- Demo anchor date: Wed 9 Sep 2026 (Asia/Singapore). Names, dates and times are
-- what the demo script (section 13) depends on. Do not change them casually.
--
-- Demo sign-in addresses are plus-aliases of one real inbox
-- (hafizishk+<name>@gmail.com), because email OTP needs an address that can
-- actually receive the code. To point them at a different inbox, replace
-- `hafizishk` and `gmail.com` throughout this file, scripts/db-assert.sql and
-- the README table. Member names, dates and times are unchanged.
--
-- Safe to re-run: clears seeded rows first.

begin;

-- Supabase installs pgcrypto into the `extensions` schema, plain Postgres into
-- `public`. Naming both keeps crypt()/gen_salt() resolvable on either.
set local search_path = pg_temp, public, extensions;

-- ---------------------------------------------------------------------------
-- Reset
-- ---------------------------------------------------------------------------
truncate table
  public.coach_assignments,
  public.announcements,
  public.event_results,
  public.event_registrations,
  public.event_slots,
  public.events,
  public.bookings,
  public.member_packages,
  public.packages,
  public.sessions,
  public.venues,
  public.class_types,
  public.admin_allowlist
restart identity cascade;

-- Remove previously seeded auth users by their fixed seed ids, so changing the
-- demo email addresses never leaves an orphaned account behind. The older
-- @teraweights.test pattern is kept so a database seeded before the switch to
-- deliverable addresses is cleaned up too.
delete from auth.users
 where id in (
   'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
   'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006',
   'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000008',
   'a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000010',
   'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012',
   'a0000000-0000-4000-8000-000000000099'
 )
 or email like '%@teraweights.test'
 or email = 'admin@stackform.test'
 or email like 'hafizishk+%@gmail.com';

-- ---------------------------------------------------------------------------
-- Helpers (dropped at the end)
-- ---------------------------------------------------------------------------
create or replace function pg_temp.sgt(d date, t time) returns timestamptz
language sql immutable as $$ select (d + t) at time zone 'Asia/Singapore' $$;

create or replace function pg_temp.secs(mmss text) returns int
language sql immutable as $$
  select split_part(mmss, ':', 1)::int * 60 + split_part(mmss, ':', 2)::int
$$;

-- Station splits that sum exactly to the total.
create or replace function pg_temp.splits(total int) returns jsonb
language plpgsql immutable as $$
declare
  names text[] := array['1km Run','SkiErg','Sled Push','Sled Pull','Burpee Broad Jump','Row','Farmers Carry','Sandbag Lunges','Wall Balls'];
  props numeric[] := array[0.10,0.09,0.10,0.11,0.12,0.09,0.09,0.14,0.16];
  out jsonb := '[]'::jsonb;
  acc int := 0;
  s int;
  i int;
begin
  for i in 1..array_length(names, 1) loop
    if i = array_length(names, 1) then
      s := total - acc;
    else
      s := floor(total * props[i]);
      acc := acc + s;
    end if;
    out := out || jsonb_build_object('station', names[i], 'seconds', s);
  end loop;
  return out;
end $$;

-- Creates an auth user (email OTP; password unused) and returns its id.
create or replace function pg_temp.mk_user(uid uuid, email text, full_name text, phone text) returns uuid
language plpgsql as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    email, crypt('teraweights-demo', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', full_name, 'phone', phone),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', email, 'email_verified', true),
    'email', now(), now(), now()
  );
  return uid;
end $$;

-- ---------------------------------------------------------------------------
-- Admin allowlist (D2D pattern): these emails get their role on first sign-in
-- ---------------------------------------------------------------------------
insert into public.admin_allowlist (email, role) values
  ('hafizishk+admin@gmail.com', 'admin'),
  ('hafizishk+faizal@gmail.com', 'coach');

-- ---------------------------------------------------------------------------
-- Users → profiles (trigger creates the profile; we then set role/zone)
-- ---------------------------------------------------------------------------
do $$ begin
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000001', 'hafizishk+aisyah@gmail.com',  'Aisyah Rahman',  '+65 9123 0001');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000002', 'hafizishk+nur@gmail.com',     'Nur Hidayah',    '+65 9123 0002');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000003', 'hafizishk+faizal@gmail.com',  'Faizal Hamid',   '+65 9123 0003');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000004', 'hafizishk+irfan@gmail.com',   'Irfan Yusof',    '+65 9123 0004');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000005', 'hafizishk+siti@gmail.com',    'Siti Zulaikha',  '+65 9123 0005');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000006', 'hafizishk+marcus@gmail.com',  'Marcus Tan',     '+65 9123 0006');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000007', 'hafizishk+weilin@gmail.com',  'Wei Lin Ng',     '+65 9123 0007');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000008', 'hafizishk+priya@gmail.com',   'Priya Nair',     '+65 9123 0008');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000009', 'hafizishk+daniel@gmail.com',  'Daniel Lim',     '+65 9123 0009');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000010', 'hafizishk+hafizah@gmail.com', 'Hafizah Osman',  '+65 9123 0010');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000011', 'hafizishk+ryan@gmail.com',    'Ryan Sufian',    '+65 9123 0011');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000012', 'hafizishk+amirah@gmail.com',  'Amirah Zainal',  '+65 9123 0012');
  perform pg_temp.mk_user('a0000000-0000-4000-8000-000000000099', 'hafizishk+admin@gmail.com',   'Stackform Admin', null);
end $$;

update public.profiles set zone_pref = 'east' where id in (
  'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004',
  'a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000008',
  'a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000011');
update public.profiles set zone_pref = 'west' where id in (
  'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000007',
  'a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000012');
update public.profiles set role = 'coach' where id = 'a0000000-0000-4000-8000-000000000003';
update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000099';

-- Seeded Energisers have already answered the onboarding questions, except
-- Priya (no active package), who demos first sign-in: onboarding, then the
-- free trial offer on Home.
update public.profiles
   set onboarded_at = now(),
       weekly_target = 3,
       preferred_time = case when zone_pref = 'west' then 'morning' else 'evening' end
 where id::text like 'a0000000-0000-4000-8000-%'
   and id <> 'a0000000-0000-4000-8000-000000000008';

-- ---------------------------------------------------------------------------
-- Class types
-- ---------------------------------------------------------------------------
insert into public.class_types (id, slug, name, credit_cost, colour, default_capacity) values
  ('c0000000-0000-4000-8000-000000000001', 'energise_east',  'Energise East Bootcamp', 1, '#B11226', 20),
  ('c0000000-0000-4000-8000-000000000002', 'energise_west',  'Energise West Bootcamp', 1, '#2B6CB0', 20),
  ('c0000000-0000-4000-8000-000000000003', 'prime',          'PRIME',                  1, '#F2C230', 12),
  ('c0000000-0000-4000-8000-000000000004', 'fitness_engine', 'Fitness Engine',         1, '#F4F1EC', 16);

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------
insert into public.venues (id, name, zone, address, map_url) values
  ('b0000000-0000-4000-8000-000000000001', 'Bedok Reservoir Road (East)',     'east',    'Bedok Reservoir Road, Singapore (exact spot TBC)', 'https://maps.google.com/?q=Bedok+Reservoir+Road'),
  ('b0000000-0000-4000-8000-000000000002', 'West Bootcamp Venue (TBC)',       'west',    'TBC', null),
  ('b0000000-0000-4000-8000-000000000003', 'PRIME Gym (TBC)',                 'central', 'TBC', null),
  ('b0000000-0000-4000-8000-000000000004', 'PAssion Wave @ Bedok Reservoir',  'east',    'Bedok Reservoir Park', 'https://maps.google.com/?q=PAssion+Wave+Bedok+Reservoir'),
  ('b0000000-0000-4000-8000-000000000005', 'PAssion Wave @ Pasir Ris',        'east',    '125 Elias Road, Singapore 519926', 'https://maps.google.com/?q=125+Elias+Road+Singapore+519926'),
  ('b0000000-0000-4000-8000-000000000006', 'Pour-traits Cafe',                'central', 'TBC', null);

-- ---------------------------------------------------------------------------
-- Sessions
-- September 2026 per the brief. Energise East also runs back to 20 Jul so the
-- demo member's 14 attended sessions this year have real rows behind them.
-- ---------------------------------------------------------------------------
do $$
declare
  d date;
  dow int;
  east  uuid := 'c0000000-0000-4000-8000-000000000001';
  west  uuid := 'c0000000-0000-4000-8000-000000000002';
  prime uuid := 'c0000000-0000-4000-8000-000000000003';
  fe    uuid := 'c0000000-0000-4000-8000-000000000004';
  v_east  uuid := 'b0000000-0000-4000-8000-000000000001';
  v_west  uuid := 'b0000000-0000-4000-8000-000000000002';
  v_prime uuid := 'b0000000-0000-4000-8000-000000000003';
  faizal uuid := 'a0000000-0000-4000-8000-000000000003';
begin
  for d in select generate_series(date '2026-07-20', date '2026-09-30', interval '1 day')::date loop
    dow := extract(isodow from d);

    -- Energise East: Tue & Thu 20:00–21:00; Sat & Sun 07:30–08:30
    if dow in (2, 4) then
      insert into public.sessions (class_type_id, venue_id, coach_id, starts_at, ends_at, capacity)
      values (east, v_east, faizal, pg_temp.sgt(d, '20:00'), pg_temp.sgt(d, '21:00'), 20);
    elsif dow in (6, 7) then
      insert into public.sessions (class_type_id, venue_id, coach_id, starts_at, ends_at, capacity)
      values (east, v_east, faizal, pg_temp.sgt(d, '07:30'), pg_temp.sgt(d, '08:30'), 20);
    end if;

    if d >= date '2026-09-01' then
      -- Energise West: Wed 20:00–21:00; Sun 08:00–09:00
      if dow = 3 then
        insert into public.sessions (class_type_id, venue_id, starts_at, ends_at, capacity)
        values (west, v_west, pg_temp.sgt(d, '20:00'), pg_temp.sgt(d, '21:00'), 20);
      elsif dow = 7 then
        insert into public.sessions (class_type_id, venue_id, starts_at, ends_at, capacity)
        values (west, v_west, pg_temp.sgt(d, '08:00'), pg_temp.sgt(d, '09:00'), 20);
      end if;

      -- PRIME: Mon & Wed 18:00–21:00; Sun 08:00–11:00
      if dow in (1, 3) then
        insert into public.sessions (class_type_id, venue_id, starts_at, ends_at, capacity)
        values (prime, v_prime, pg_temp.sgt(d, '18:00'), pg_temp.sgt(d, '21:00'), 12);
      elsif dow = 7 then
        insert into public.sessions (class_type_id, venue_id, starts_at, ends_at, capacity)
        values (prime, v_prime, pg_temp.sgt(d, '08:00'), pg_temp.sgt(d, '11:00'), 12);
      end if;

      -- Fitness Engine: Wed 2, 9, 16, 23, 30 (19:30–21:00); Sat 26 (08:00–10:00)
      if d in (date '2026-09-02', date '2026-09-09', date '2026-09-16', date '2026-09-23', date '2026-09-30') then
        insert into public.sessions (class_type_id, venue_id, starts_at, ends_at, capacity, notes)
        values (fe, v_east, pg_temp.sgt(d, '19:30'), pg_temp.sgt(d, '21:00'), 16, 'Placeholder time');
      elsif d = date '2026-09-26' then
        insert into public.sessions (class_type_id, venue_id, starts_at, ends_at, capacity, notes)
        values (fe, v_east, pg_temp.sgt(d, '08:00'), pg_temp.sgt(d, '10:00'), 16, 'Placeholder time');
      end if;
    end if;
  end loop;
end $$;

-- Sessions before the demo anchor are completed.
update public.sessions set status = 'completed'
 where ends_at < pg_temp.sgt(date '2026-09-09', '12:00');

-- Sun 13 Sep 07:30 East runs at reduced capacity so the demo can show a full session + waitlist.
update public.sessions set capacity = 6
 where starts_at = pg_temp.sgt(date '2026-09-13', '07:30')
   and class_type_id = 'c0000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Packages (28 Aug 2026 pricing post)
-- ---------------------------------------------------------------------------
insert into public.packages (name, kind, tier, variant, term_months, validity_days, credits, price_sgd, price_per_month, allowed_class_types, fe_credits_included, cashback_eligible, perks)
select
  'Energise ' || initcap(v.variant) || ' ' || t.term_months || '-month',
  'membership', 'energise', v.variant, t.term_months, t.validity_days, null,
  t.price_sgd, t.price_per_month,
  case when v.variant = 'west' then array['energise_west'] else array['energise_east', 'energise_west'] end,
  t.fe_credits, t.cashback, t.perks
from (values ('weekday'), ('weekend'), ('west')) as v(variant)
cross join (values
  (1,  30,  65::numeric,  65::numeric, 0, true,  array['10% off Atlas Whey', '1 free class']),
  (4,  120, 260::numeric, 65::numeric, 0, false, array['Teraweights top', 'Giftbag']),
  (8,  270, 464::numeric, 58::numeric, 1, false, array['Teraweights top', 'Giftbag', '1 recovery voucher', '1 Fitness Engine session', '1 month free']),
  (12, 420, 672::numeric, 56::numeric, 2, false, array['Teraweights top', 'Giftbag', '2 recovery vouchers', '2 Fitness Engine sessions', '2 months free'])
) as t(term_months, validity_days, price_sgd, price_per_month, fe_credits, cashback, perks);

insert into public.packages (name, kind, tier, variant, term_months, validity_days, credits, price_sgd, price_per_month, allowed_class_types, fe_credits_included, cashback_eligible, perks)
values
  ('Energise PRO 1-month',  'membership', 'pro', null, 1,  30,  null, 90,  90, array['prime', 'energise_east', 'energise_west'], 0, true,  array['10% off Atlas Whey', '1 free class']),
  ('Energise PRO 4-month',  'membership', 'pro', null, 4,  120, null, 360, 90, array['prime', 'energise_east', 'energise_west'], 0, false, array['Teraweights top', 'Giftbag']),
  ('Energise PRO 8-month',  'membership', 'pro', null, 8,  270, null, 632, 79, array['prime', 'energise_east', 'energise_west'], 1, false, array['Teraweights top', 'Giftbag', '1 recovery voucher', '1 Fitness Engine session', '1 month free']),
  ('Energise PRO 12-month', 'membership', 'pro', null, 12, 420, null, 900, 75, array['prime', 'energise_east', 'energise_west'], 2, false, array['Teraweights top', 'Giftbag', '2 recovery vouchers', '2 Fitness Engine sessions', '2 months free']),
  ('Energise X',            'credits',    'energise', null, null, 90, 10, 180, null, array['energise_east', 'energise_west'], 0, true,  array['10 sessions, valid 3 months']),
  ('Energise + (Drop-in)',  'dropin',     'energise', null, null, 1,  1,  20,  null, array['energise_east', 'energise_west'], 0, false, array['Single session']);

-- Free trial week (scope change, 10 Sep 2026): one per Energiser, ever.
insert into public.packages (name, kind, tier, variant, term_months, validity_days, credits, price_sgd, price_per_month, allowed_class_types, fe_credits_included, cashback_eligible, perks, is_trial)
values ('Trial Week', 'membership', 'energise', null, null, 7, null, 0, null, array['energise_east', 'energise_west'], 0, false, array['Any Energise East or West session for 7 days', 'One per Energiser'], true);

update public.packages set description = case
  when is_trial then 'Seven days of Energise East and West, on us.'
  when kind = 'membership' then 'Unlimited sessions for the term.'
  when kind = 'credits' then '10 credits, valid 90 days.'
  else 'One session, valid on the day.' end;

-- ---------------------------------------------------------------------------
-- Member packages
-- ---------------------------------------------------------------------------
-- Aisyah: Energise Weekday 4-month, started 1 Jun, expires 28 Sep + Energise X with 6/10 left, expires 15 Nov
insert into public.member_packages (id, member_id, package_id, kind, starts_at, expires_at, payment_status, payment_ref, recorded_by, purchased_at)
values ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
        (select id from public.packages where name = 'Energise Weekday 4-month'), 'membership',
        pg_temp.sgt('2026-06-01', '00:00'), pg_temp.sgt('2026-09-28', '23:59:59'), 'paid', 'PAYNOW-2606-AR',
        'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-06-01', '10:00'));
insert into public.member_packages (id, member_id, package_id, kind, starts_at, expires_at, credits_total, credits_remaining, payment_status, payment_ref, recorded_by, purchased_at)
values ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
        (select id from public.packages where name = 'Energise X'), 'credits',
        pg_temp.sgt('2026-08-17', '00:00'), pg_temp.sgt('2026-11-15', '23:59:59'), 10, 6, 'paid', 'PAYNOW-2608-AR',
        'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-08-17', '18:30'));

-- Marcus: Energise PRO 1-month, paid, expires 30 Sep
insert into public.member_packages (id, member_id, package_id, kind, starts_at, expires_at, payment_status, payment_ref, recorded_by, purchased_at)
values ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006',
        (select id from public.packages where name = 'Energise PRO 1-month'), 'membership',
        pg_temp.sgt('2026-08-31', '00:00'), pg_temp.sgt('2026-09-30', '23:59:59'), 'paid', 'PAYNOW-2608-MT',
        'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-08-31', '09:00'));

-- Priya: expired Energise 1-month (ended 31 Aug)
insert into public.member_packages (id, member_id, package_id, kind, starts_at, expires_at, payment_status, payment_ref, recorded_by, purchased_at)
values ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000008',
        (select id from public.packages where name = 'Energise Weekday 1-month'), 'membership',
        pg_temp.sgt('2026-08-01', '00:00'), pg_temp.sgt('2026-08-31', '23:59:59'), 'paid', 'PAYNOW-2608-PN',
        'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-08-01', '11:00'));

-- Others (so rosters and the members table look real)
insert into public.member_packages (member_id, package_id, kind, starts_at, expires_at, credits_total, credits_remaining, payment_status, payment_ref, recorded_by, purchased_at)
values
  -- Nur: Weekday 4-month
  ('a0000000-0000-4000-8000-000000000002', (select id from public.packages where name = 'Energise Weekday 4-month'), 'membership', pg_temp.sgt('2026-07-01','00:00'), pg_temp.sgt('2026-10-29','23:59:59'), null, null, 'paid', 'PAYNOW-2607-NH', 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-07-01','12:00')),
  -- Irfan: Energise X, 3 left
  ('a0000000-0000-4000-8000-000000000004', (select id from public.packages where name = 'Energise X'), 'credits', pg_temp.sgt('2026-07-25','00:00'), pg_temp.sgt('2026-10-23','23:59:59'), 10, 3, 'paid', 'PAYNOW-2607-IY', 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-07-25','12:00')),
  -- Siti: West 4-month
  ('a0000000-0000-4000-8000-000000000005', (select id from public.packages where name = 'Energise West 4-month'), 'membership', pg_temp.sgt('2026-08-01','00:00'), pg_temp.sgt('2026-11-29','23:59:59'), null, null, 'paid', 'PAYNOW-2608-SZ', 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-08-01','12:00')),
  -- Wei Lin: West 1-month
  ('a0000000-0000-4000-8000-000000000007', (select id from public.packages where name = 'Energise West 1-month'), 'membership', pg_temp.sgt('2026-09-01','00:00'), pg_temp.sgt('2026-10-01','23:59:59'), null, null, 'paid', 'PAYNOW-2609-WL', 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-09-01','12:00')),
  -- Daniel: Weekday 8-month (has 1 FE credit)
  ('a0000000-0000-4000-8000-000000000009', (select id from public.packages where name = 'Energise Weekday 8-month'), 'membership', pg_temp.sgt('2026-05-01','00:00'), pg_temp.sgt('2027-01-26','23:59:59'), null, null, 'paid', 'PAYNOW-2605-DL', 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-05-01','12:00')),
  -- Hafizah: Weekend 4-month
  ('a0000000-0000-4000-8000-000000000010', (select id from public.packages where name = 'Energise Weekend 4-month'), 'membership', pg_temp.sgt('2026-08-15','00:00'), pg_temp.sgt('2026-12-13','23:59:59'), null, null, 'paid', 'PAYNOW-2608-HO', 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-08-15','12:00')),
  -- Ryan: Weekday 1-month, payment pending
  ('a0000000-0000-4000-8000-000000000011', (select id from public.packages where name = 'Energise Weekday 1-month'), 'membership', pg_temp.sgt('2026-09-01','00:00'), pg_temp.sgt('2026-10-01','23:59:59'), null, null, 'pending', null, null, pg_temp.sgt('2026-09-01','12:00')),
  -- Amirah: Weekend 1-month
  ('a0000000-0000-4000-8000-000000000012', (select id from public.packages where name = 'Energise Weekend 1-month'), 'membership', pg_temp.sgt('2026-09-05','00:00'), pg_temp.sgt('2026-10-05','23:59:59'), null, null, 'paid', 'PAYNOW-2609-AZ', 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-09-05','12:00'));

update public.member_packages mp
   set fe_credits_remaining = p.fe_credits_included
  from public.packages p
 where p.id = mp.package_id;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
-- Aisyah: booked into Thu 10 Sep 8pm (membership)
insert into public.bookings (session_id, member_id, member_package_id, status, entitlement, credits_used, created_at)
select s.id, 'a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'booked', 'membership', 0, pg_temp.sgt('2026-09-05', '09:12')
  from public.sessions s
 where s.starts_at = pg_temp.sgt('2026-09-10', '20:00') and s.class_type_id = 'c0000000-0000-4000-8000-000000000001';

-- Aisyah: 14 attended East sessions this year (Tue/Thu 8pm, 8 consecutive weeks up to 8 Sep)
insert into public.bookings (session_id, member_id, member_package_id, status, entitlement, credits_used, created_at, checked_in_at)
select s.id, 'a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'attended', 'membership', 0,
       s.starts_at - interval '3 days', s.starts_at - interval '6 minutes'
  from public.sessions s
 where s.class_type_id = 'c0000000-0000-4000-8000-000000000001'
   and s.starts_at in (
     pg_temp.sgt('2026-07-23','20:00'), pg_temp.sgt('2026-07-28','20:00'), pg_temp.sgt('2026-07-30','20:00'),
     pg_temp.sgt('2026-08-04','20:00'), pg_temp.sgt('2026-08-06','20:00'), pg_temp.sgt('2026-08-11','20:00'),
     pg_temp.sgt('2026-08-13','20:00'), pg_temp.sgt('2026-08-18','20:00'), pg_temp.sgt('2026-08-20','20:00'),
     pg_temp.sgt('2026-08-25','20:00'), pg_temp.sgt('2026-08-27','20:00'), pg_temp.sgt('2026-09-01','20:00'),
     pg_temp.sgt('2026-09-03','20:00'), pg_temp.sgt('2026-09-08','20:00'));

-- Marcus: booked into PRIME Mon 14 Sep (membership)
insert into public.bookings (session_id, member_id, member_package_id, status, entitlement, credits_used, created_at)
select s.id, 'a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'booked', 'membership', 0, pg_temp.sgt('2026-09-07', '19:40')
  from public.sessions s
 where s.starts_at = pg_temp.sgt('2026-09-14', '18:00') and s.class_type_id = 'c0000000-0000-4000-8000-000000000003';

-- Thu 10 Sep 8pm roster: Nur, Irfan (credit), Daniel, Ryan alongside Aisyah
insert into public.bookings (session_id, member_id, member_package_id, status, entitlement, credits_used, created_at)
select s.id, m.member_id, mp.id, 'booked', case when mp.kind = 'credits' then 'credit' else 'membership' end, case when mp.kind = 'credits' then 1 else 0 end, pg_temp.sgt('2026-09-06', '10:00')
  from public.sessions s
  cross join (values ('a0000000-0000-4000-8000-000000000002'::uuid), ('a0000000-0000-4000-8000-000000000004'), ('a0000000-0000-4000-8000-000000000009'), ('a0000000-0000-4000-8000-000000000011')) as m(member_id)
  join public.member_packages mp on mp.member_id = m.member_id
 where s.starts_at = pg_temp.sgt('2026-09-10', '20:00') and s.class_type_id = 'c0000000-0000-4000-8000-000000000001';

-- Sun 13 Sep 07:30 East: full (6/6) with one on the waitlist
insert into public.bookings (session_id, member_id, member_package_id, status, entitlement, credits_used, created_at)
select s.id, m.member_id, mp.id, 'booked', case when mp.kind = 'credits' then 'credit' else 'membership' end, case when mp.kind = 'credits' then 1 else 0 end, pg_temp.sgt('2026-09-06', '11:00')
  from public.sessions s
  cross join (values ('a0000000-0000-4000-8000-000000000002'::uuid), ('a0000000-0000-4000-8000-000000000004'), ('a0000000-0000-4000-8000-000000000009'),
                     ('a0000000-0000-4000-8000-000000000011'), ('a0000000-0000-4000-8000-000000000010'), ('a0000000-0000-4000-8000-000000000012')) as m(member_id)
  join public.member_packages mp on mp.member_id = m.member_id
 where s.starts_at = pg_temp.sgt('2026-09-13', '07:30') and s.class_type_id = 'c0000000-0000-4000-8000-000000000001';

insert into public.bookings (session_id, member_id, status, entitlement, credits_used, created_at)
select s.id, 'a0000000-0000-4000-8000-000000000005', 'waitlisted', null, 0, pg_temp.sgt('2026-09-07', '08:15')
  from public.sessions s
 where s.starts_at = pg_temp.sgt('2026-09-13', '07:30') and s.class_type_id = 'c0000000-0000-4000-8000-000000000001';

-- Some attended history for other members (recent East Tue/Thu sessions)
insert into public.bookings (session_id, member_id, member_package_id, status, entitlement, credits_used, created_at, checked_in_at)
select s.id, m.member_id, mp.id, 'attended', 'membership', 0, s.starts_at - interval '2 days', s.starts_at - interval '4 minutes'
  from public.sessions s
  cross join (values ('a0000000-0000-4000-8000-000000000002'::uuid), ('a0000000-0000-4000-8000-000000000009')) as m(member_id)
  join public.member_packages mp on mp.member_id = m.member_id and mp.kind = 'membership'
 where s.class_type_id = 'c0000000-0000-4000-8000-000000000001'
   and s.starts_at in (pg_temp.sgt('2026-08-25','20:00'), pg_temp.sgt('2026-09-01','20:00'), pg_temp.sgt('2026-09-03','20:00'), pg_temp.sgt('2026-09-08','20:00'));

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
insert into public.events (id, slug, name, type, description, event_date, venue_id, is_free, price_sgd, is_public, requires_account, registration_open, partner_line) values
  ('e0000000-0000-4000-8000-000000000001', 'parox-sep-2026', 'PA.ROX @ PAssion Wave Bedok Reservoir', 'parox',
   'Hyrox-style race: 1km runs between functional stations. Open, doubles and family divisions. Entry fee TBC.',
   '2026-09-12', 'b0000000-0000-4000-8000-000000000004', false, null, true, true, true, 'In collaboration with PAssion Wave'),
  ('e0000000-0000-4000-8000-000000000002', 'friends-family-sep-2026', 'Friends & Family Morning', 'community',
   'Bring someone new. Easy 3km walk or 5km run, then coffee at Pour-traits.',
   '2026-09-19', 'b0000000-0000-4000-8000-000000000006', true, null, true, false, true, 'With Pour-traits Cafe'),
  ('e0000000-0000-4000-8000-000000000003', 'kampung-grind-nov-2026', 'Kampung Grind (November)', 'kampung_grind',
   'Free community workout at PAssion Wave Pasir Ris. All levels. Date TBC.',
   '2026-11-21', 'b0000000-0000-4000-8000-000000000005', true, null, true, false, true, 'In collaboration with PAssion Wave'),
  ('e0000000-0000-4000-8000-000000000004', 'kampung-grind-aug-2026', 'Kampung Grind (August)', 'kampung_grind',
   'Free community workout at PAssion Wave Pasir Ris.',
   '2026-08-22', 'b0000000-0000-4000-8000-000000000005', true, null, true, false, false, 'In collaboration with PAssion Wave'),
  ('e0000000-0000-4000-8000-000000000005', 'parox-jul-2025', 'PA.ROX July 2025', 'parox',
   'The first PA.ROX edition.',
   '2025-07-12', 'b0000000-0000-4000-8000-000000000004', false, null, true, true, false, 'In collaboration with PAssion Wave'),
  ('e0000000-0000-4000-8000-000000000006', 'parox-apr-2026', 'PA.ROX April 2026', 'parox',
   'Second edition.',
   '2026-04-11', 'b0000000-0000-4000-8000-000000000004', false, null, true, true, false, 'In collaboration with PAssion Wave');

insert into public.event_slots (id, event_id, label, starts_at, capacity) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'Wave 1 · 07:30', pg_temp.sgt('2026-09-12', '07:30'), 30),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'Wave 2 · 08:30', pg_temp.sgt('2026-09-12', '08:30'), 30),
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'Wave 3 · 09:30', pg_temp.sgt('2026-09-12', '09:30'), 30),
  ('f0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002', '3km Walk', pg_temp.sgt('2026-09-19', '08:00'), 40),
  ('f0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000002', '5km Run',  pg_temp.sgt('2026-09-19', '08:00'), 40),
  ('f0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000003', '07:30', pg_temp.sgt('2026-11-21', '07:30'), 40),
  ('f0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000003', '08:30', pg_temp.sgt('2026-11-21', '08:30'), 40),
  ('f0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000003', '09:30', pg_temp.sgt('2026-11-21', '09:30'), 40);

-- Upcoming registrations (Aisyah is NOT registered for PA.ROX Sep — she registers live in the demo)
insert into public.event_registrations (event_id, slot_id, member_id, guest_name, guest_email, guest_phone, status, payment_status, created_at) values
  ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006', null, null, null, 'registered', 'paid',    pg_temp.sgt('2026-08-30', '10:00')),
  ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000011', null, null, null, 'registered', 'paid',    pg_temp.sgt('2026-08-30', '11:00')),
  ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', null, null, null, 'registered', 'pending', pg_temp.sgt('2026-09-01', '09:00')),
  ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000009', null, null, null, 'registered', 'paid',    pg_temp.sgt('2026-09-02', '09:00')),
  ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', null, null, null, 'registered', 'pending', pg_temp.sgt('2026-09-03', '09:00')),
  ('e0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', null, null, null, 'registered', 'paid',    pg_temp.sgt('2026-09-03', '09:30')),
  ('e0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000007', null, null, null, 'registered', 'n/a', pg_temp.sgt('2026-09-05', '14:00')),
  ('e0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000004', null, 'Sarah Lee',  'sarah.lee@example.com',  '+65 9876 1001', 'registered', 'n/a', pg_temp.sgt('2026-09-06', '15:00')),
  ('e0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000005', null, 'Kumar Raj',  'kumar.raj@example.com',  '+65 9876 1002', 'registered', 'n/a', pg_temp.sgt('2026-09-07', '16:00')),
  ('e0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000006', null, 'Ahmad Fauzi','ahmad.fauzi@example.com','+65 9876 1003', 'registered', 'n/a', pg_temp.sgt('2026-09-08', '12:00'));

-- ---------------------------------------------------------------------------
-- Results for the 3 past events. Ranks are computed per event + division.
-- Aisyah: 48:12 → 44:37 → 41:05 (improving; PB 41:05).
-- ---------------------------------------------------------------------------
create temporary table seed_results (event_id uuid, member_email text, display_name text, division text, mmss text) on commit drop;

insert into seed_results values
  -- PA.ROX July 2025
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+faizal@gmail.com',  'Faizal Hamid',   'open',    '39:48'),
  ('e0000000-0000-4000-8000-000000000005', null,                       'Jonathan Koh',   'open',    '41:02'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+marcus@gmail.com',  'Marcus Tan',     'open',    '42:30'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+daniel@gmail.com',  'Daniel Lim',     'open',    '45:10'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+irfan@gmail.com',   'Irfan Yusof',    'open',    '47:20'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+aisyah@gmail.com',  'Aisyah Rahman',  'open',    '48:12'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+nur@gmail.com',     'Nur Hidayah',    'open',    '49:55'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+ryan@gmail.com',    'Ryan Sufian',    'open',    '51:08'),
  ('e0000000-0000-4000-8000-000000000005', null,                       'Team Chua',      'doubles', '50:15'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+siti@gmail.com',    'Siti Zulaikha',  'doubles', '52:40'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+hafizah@gmail.com', 'Hafizah Osman',  'doubles', '55:02'),
  ('e0000000-0000-4000-8000-000000000005', null,                       'The Lims',       'family',  '58:30'),
  ('e0000000-0000-4000-8000-000000000005', 'hafizishk+amirah@gmail.com',  'Amirah Zainal',  'family',  '61:15'),
  -- PA.ROX April 2026
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+faizal@gmail.com',  'Faizal Hamid',   'open',    '38:55'),
  ('e0000000-0000-4000-8000-000000000006', null,                       'Jonathan Koh',   'open',    '40:44'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+marcus@gmail.com',  'Marcus Tan',     'open',    '41:20'),
  ('e0000000-0000-4000-8000-000000000006', null,                       'Kevin Ong',      'open',    '43:58'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+daniel@gmail.com',  'Daniel Lim',     'open',    '44:02'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+aisyah@gmail.com',  'Aisyah Rahman',  'open',    '44:37'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+irfan@gmail.com',   'Irfan Yusof',    'open',    '46:10'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+nur@gmail.com',     'Nur Hidayah',    'open',    '47:48'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+ryan@gmail.com',    'Ryan Sufian',    'open',    '49:30'),
  ('e0000000-0000-4000-8000-000000000006', null,                       'Team Chua',      'doubles', '49:05'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+siti@gmail.com',    'Siti Zulaikha',  'doubles', '50:12'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+hafizah@gmail.com', 'Hafizah Osman',  'doubles', '53:40'),
  ('e0000000-0000-4000-8000-000000000006', null,                       'The Lims',       'family',  '57:44'),
  ('e0000000-0000-4000-8000-000000000006', 'hafizishk+amirah@gmail.com',  'Amirah Zainal',  'family',  '59:20'),
  -- Kampung Grind August 2026
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+faizal@gmail.com',  'Faizal Hamid',   'open',    '36:20'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+marcus@gmail.com',  'Marcus Tan',     'open',    '39:05'),
  ('e0000000-0000-4000-8000-000000000004', null,                       'Kevin Ong',      'open',    '40:30'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+aisyah@gmail.com',  'Aisyah Rahman',  'open',    '41:05'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+daniel@gmail.com',  'Daniel Lim',     'open',    '42:15'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+irfan@gmail.com',   'Irfan Yusof',    'open',    '43:48'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+nur@gmail.com',     'Nur Hidayah',    'open',    '44:20'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+ryan@gmail.com',    'Ryan Sufian',    'open',    '46:02'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+priya@gmail.com',   'Priya Nair',     'open',    '47:35'),
  ('e0000000-0000-4000-8000-000000000004', null,                       'Sarah Lee',      'open',    '48:50'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+siti@gmail.com',    'Siti Zulaikha',  'doubles', '47:10'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+weilin@gmail.com',  'Wei Lin Ng',     'doubles', '48:22'),
  ('e0000000-0000-4000-8000-000000000004', null,                       'The Lims',       'family',  '54:12'),
  ('e0000000-0000-4000-8000-000000000004', 'hafizishk+amirah@gmail.com',  'Amirah Zainal',  'family',  '55:40');

-- Past-event registrations for seeded members (attended), so leaderboard RLS works.
insert into public.event_registrations (event_id, member_id, status, payment_status, created_at)
select r.event_id, p.id, 'attended', case when e.is_free then 'n/a' else 'paid' end, (e.event_date - interval '21 days')
  from seed_results r
  join public.profiles p on p.email = r.member_email
  join public.events e on e.id = r.event_id;

insert into public.event_results (event_id, registration_id, member_id, display_name, division, total_seconds, station_splits, imported_at)
select r.event_id,
       reg.id,
       p.id,
       r.display_name,
       r.division,
       pg_temp.secs(r.mmss),
       case when e.type = 'parox' then pg_temp.splits(pg_temp.secs(r.mmss)) else null end,
       (e.event_date + interval '1 day 10 hours')
  from seed_results r
  join public.events e on e.id = r.event_id
  left join public.profiles p on p.email = r.member_email
  left join public.event_registrations reg on reg.event_id = r.event_id and reg.member_id = p.id;

update public.event_results x
   set rank = ranked.rn
  from (select id, row_number() over (partition by event_id, division order by total_seconds) as rn from public.event_results) ranked
 where ranked.id = x.id;

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
-- Coach bio (Session 6: coaches on the member side).
update public.profiles
   set bio = 'Runs Energise East at Bedok Reservoir. Ten years of bootcamps, two PA.ROX podiums, and a firm belief that the warm-up is not optional.',
       staff_title = 'Head Coach'
 where id = 'a0000000-0000-4000-8000-000000000003';

-- Community feed posts (Session 6). The three brief announcements stay as they
-- are; these two give the feed a recipe and a photo post to scroll past.
insert into public.announcements (title, body, audience, category, cover_url, images, published_at, created_by, created_at) values
  ('Post-session overnight oats',
   E'Faizal''s go-to after a Saturday 7.30. Makes two jars.\n\n## You need\n\nRolled oats, a cup. Milk or oat milk, a cup. Greek yoghurt, half a cup. A banana. Chia, a spoon. Honey to taste.\n\n## Do\n\nMash the banana. Stir everything together. Jar it, fridge it, forget it until morning.\n\nProtein from the yoghurt, carbs from the oats, no cooking. Tag Faizal if you make it.',
   'all', 'recipe', '/photos/fitness_engine.jpg', '{}', pg_temp.sgt('2026-09-06', '10:00'), 'a0000000-0000-4000-8000-000000000003', pg_temp.sgt('2026-09-06', '09:40')),
  ('Kampung Grind August: the photos',
   E'Forty-one of you turned up in the rain. Here is the proof.\n\nFull results are in My PA.ROX. Next edition is November.',
   'all', 'photos', '/photos/event.jpg', '{"/photos/energise_east.jpg","/photos/prime.jpg","/photos/energise_west.jpg"}', pg_temp.sgt('2026-08-24', '18:00'), 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-08-24', '17:30'));

insert into public.announcements (title, body, audience, published_at, created_by, created_at) values
  ('September bookings are open',
   'The full September schedule is live in the Book tab. Energise East Tue/Thu 8pm and Sat/Sun 7.30am, West Wed 8pm and Sun 8am, PRIME Mon/Wed evenings and Sun mornings. See you out there, Energisers.',
   'all', pg_temp.sgt('2026-08-31', '09:00'), 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-08-31', '08:50')),
  ('Friends & Family Morning — 19 Sept',
   'Bring someone who has never trained with us. 3km walk or 5km run from Pour-traits Cafe, coffee after. Free. Register in the Events tab.',
   'all', pg_temp.sgt('2026-09-04', '09:00'), 'a0000000-0000-4000-8000-000000000099', pg_temp.sgt('2026-09-04', '08:45')),
  ('East: Thursday venue reminder',
   'Thursday 8pm meets at the usual Bedok Reservoir Road spot by the car park. Bring water, wet-weather plan is the shelter nearby.',
   'east', pg_temp.sgt('2026-09-08', '09:00'), 'a0000000-0000-4000-8000-000000000003', pg_temp.sgt('2026-09-08', '08:30'));

-- ---------------------------------------------------------------------------
-- Coach assignments (Aisyah: none — assigned live in the demo)
-- ---------------------------------------------------------------------------
insert into public.coach_assignments (member_id, coach_id, notes) values
  ('a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000003', 'PT: strength block, 2x/week');

commit;
