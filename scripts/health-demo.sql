-- Aisyah's connected-health demo data, for a database that was seeded before
-- migration 0012. Paste into the Supabase SQL editor after running the
-- migration. Safe to run twice: nothing is inserted a second time.
-- Same numbers as supabase/seed.sql; keep the two in step.

create or replace function pg_temp.sgt(d date, t time) returns timestamptz
language sql immutable as $$ select (d + t) at time zone 'Asia/Singapore' $$;

update public.profiles
   set health_source = 'apple_health', health_device = 'Whoop 4.0'
 where id = 'a0000000-0000-4000-8000-000000000001';

do $$
declare
  b record;
  i int := 0;
  t int;
  bpm int;
  base numeric;
  peak numeric;
  total numeric;
  mx int;
  samples jsonb;
begin
  for b in
    select bk.id, bk.session_id
      from public.bookings bk
      join public.sessions s on s.id = bk.session_id
     where bk.member_id = 'a0000000-0000-4000-8000-000000000001'
       and bk.status = 'attended'
     order by s.starts_at
  loop
    i := i + 1;
    base := 98 + (i % 3) * 2;
    peak := 158 + i * 0.9;
    samples := '[]'::jsonb;
    total := 0;
    mx := 0;
    for t in 0..60 loop
      bpm := round(base + (peak - base) * greatest(0, sin(pi() * least(1, t / 54.0))) ^ 0.7
             + ((t * 7 + i * 13) % 9) - 4);
      samples := samples || jsonb_build_array(jsonb_build_array(t * 60, bpm));
      total := total + bpm;
      if bpm > mx then mx := bpm; end if;
    end loop;
    insert into public.session_metrics (booking_id, member_id, session_id, source, device, avg_bpm, max_bpm, kcal, samples, synced_at)
    select b.id, 'a0000000-0000-4000-8000-000000000001', b.session_id, 'apple_health', 'Whoop 4.0',
           round(total / 61), mx, 452 + i * 5, samples, s.ends_at + interval '25 minutes'
      from public.sessions s where s.id = b.session_id
    on conflict (booking_id) do nothing;
  end loop;
end $$;

insert into public.health_workouts (member_id, source, external_id, kind, started_at, ended_at, kcal, distance_m) values
  ('a0000000-0000-4000-8000-000000000001', 'apple_health', 'whoop-run-2026-09-11', 'run', pg_temp.sgt('2026-09-11', '07:02'), pg_temp.sgt('2026-09-11', '07:34'), 312, 5000),
  ('a0000000-0000-4000-8000-000000000001', 'apple_health', 'whoop-run-2026-09-16', 'run', pg_temp.sgt('2026-09-16', '06:48'), pg_temp.sgt('2026-09-16', '07:18'), 298, 5000)
on conflict (member_id, source, external_id) do nothing;
