-- Community surface for Home (direction A): who is in a session, and a
-- community pulse. RLS hides other members' bookings and profiles, so these
-- run as definer functions that expose only what a member chose to share.

-- Members share their attendance by default and can switch it off in Profile.
alter table public.profiles
  add column if not exists share_attendance boolean not null default true;

-- ---------------------------------------------------------------------------
-- Who is booked into these sessions, for members who share attendance.
-- Never exposes emails, phones or anyone who opted out.
-- ---------------------------------------------------------------------------
create or replace function public.session_attendees(p_session_ids uuid[])
returns table (session_id uuid, member_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select b.session_id, p.id, p.full_name
    from public.bookings b
    join public.profiles p on p.id = b.member_id
   where b.session_id = any (p_session_ids)
     and b.status in ('booked', 'attended')
     and (p.share_attendance or p.id = auth.uid())
   order by b.created_at
$$;

grant execute on function public.session_attendees(uuid[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Community pulse for the current Singapore week (Mon–Sun).
-- ---------------------------------------------------------------------------
create or replace function public.community_pulse()
returns table (trained_this_week int, sessions_left_this_week int)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select (date_trunc('week', (now() at time zone 'Asia/Singapore'))) at time zone 'Asia/Singapore' as week_start,
           (date_trunc('week', (now() at time zone 'Asia/Singapore')) + interval '7 days') at time zone 'Asia/Singapore' as week_end
  )
  select
    (select count(distinct b.member_id)::int
       from public.bookings b
       join public.sessions s on s.id = b.session_id, bounds
      where b.status = 'attended'
        and s.starts_at >= bounds.week_start and s.starts_at < bounds.week_end),
    (select count(*)::int
       from public.sessions s, bounds
      where s.status = 'scheduled'
        and s.starts_at > now() and s.starts_at < bounds.week_end)
$$;

grant execute on function public.community_pulse() to authenticated, service_role;
