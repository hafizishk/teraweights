-- Admin portal (brief section 9).
--
-- Admins already hold `for all` policies on every table, so ordinary CRUD runs
-- through the normal client under RLS — no service role. Only two operations
-- need SQL: a credit adjustment (two writes that must agree) and cancelling a
-- session (refunds every booked member, which touches rows across members).

-- ---------------------------------------------------------------------------
-- Credit adjustments — an audit trail, because "she says she had 7" needs an
-- answer. Never written directly; admin_adjust_credits() is the only writer.
-- ---------------------------------------------------------------------------
create table if not exists public.credit_adjustments (
  id uuid primary key default gen_random_uuid(),
  member_package_id uuid not null references public.member_packages (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  delta int not null check (delta <> 0),
  kind text not null default 'credit' check (kind in ('credit', 'fe_credit')),
  reason text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists credit_adjustments_member_id_idx on public.credit_adjustments (member_id);

-- 0001's blanket grants ran before this table existed, so it needs its own.
grant select on public.credit_adjustments to anon, authenticated;
grant insert, update, delete on public.credit_adjustments to authenticated;
grant all on public.credit_adjustments to service_role;

alter table public.credit_adjustments enable row level security;

create policy "credit_adjustments: member read" on public.credit_adjustments
  for select to authenticated using (member_id = auth.uid());
create policy "credit_adjustments: admin all" on public.credit_adjustments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- admin_adjust_credits — moves a package's balance and records why, in one
-- transaction. Refuses to take a balance below zero.
-- ---------------------------------------------------------------------------
create or replace function public.admin_adjust_credits(
  p_member_package_id uuid,
  p_delta int,
  p_reason text,
  p_kind text default 'credit'
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pkg public.member_packages%rowtype;
  v_balance int;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_delta = 0 then
    raise exception 'Adjustment cannot be zero' using errcode = '22023';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  if p_kind not in ('credit', 'fe_credit') then
    raise exception 'Unknown credit kind %', p_kind using errcode = '22023';
  end if;

  select * into v_pkg from public.member_packages mp where mp.id = p_member_package_id for update;
  if not found then
    raise exception 'Package not found' using errcode = 'P0002';
  end if;

  if p_kind = 'credit' then
    if v_pkg.credits_remaining is null then
      raise exception 'That package does not carry credits' using errcode = 'P0001';
    end if;
    v_balance := v_pkg.credits_remaining + p_delta;
    if v_balance < 0 then
      raise exception 'That would leave a negative balance' using errcode = 'P0001';
    end if;
    update public.member_packages
       set credits_remaining = v_balance,
           credits_total = greatest(coalesce(credits_total, 0), v_balance)
     where id = v_pkg.id;
  else
    v_balance := v_pkg.fe_credits_remaining + p_delta;
    if v_balance < 0 then
      raise exception 'That would leave a negative balance' using errcode = 'P0001';
    end if;
    update public.member_packages set fe_credits_remaining = v_balance where id = v_pkg.id;
  end if;

  insert into public.credit_adjustments (member_package_id, member_id, delta, kind, reason, created_by)
  values (p_member_package_id, v_pkg.member_id, p_delta, p_kind, btrim(p_reason), auth.uid());

  return v_balance;
end $$;

grant execute on function public.admin_adjust_credits(uuid, int, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- admin_cancel_session — cancels a session and gives every booked member their
-- credit back. Waitlisted rows are cancelled without a refund; nothing was
-- charged for them. Attended rows are left alone: the session happened.
-- ---------------------------------------------------------------------------
create or replace function public.admin_cancel_session(p_session_id uuid)
returns table (cancelled int, refunded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions%rowtype;
  v_booking public.bookings%rowtype;
  v_cancelled int := 0;
  v_refunded int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  select * into v_session from public.sessions s where s.id = p_session_id for update;
  if not found then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  if v_session.status = 'cancelled' then
    raise exception 'That session is already cancelled' using errcode = 'P0001';
  end if;

  for v_booking in
    select * from public.bookings b
     where b.session_id = p_session_id and b.status in ('booked', 'waitlisted')
     order by b.created_at
  loop
    if v_booking.credits_used > 0 and v_booking.member_package_id is not null then
      if v_booking.entitlement = 'fe_credit' then
        update public.member_packages
           set fe_credits_remaining = fe_credits_remaining + v_booking.credits_used
         where id = v_booking.member_package_id;
      else
        update public.member_packages
           set credits_remaining = coalesce(credits_remaining, 0) + v_booking.credits_used
         where id = v_booking.member_package_id;
      end if;
      v_refunded := v_refunded + v_booking.credits_used;
    end if;

    update public.bookings
       set status = 'cancelled',
           cancelled_at = now(),
           credits_used = 0,
           late_cancel = false
     where id = v_booking.id;
    v_cancelled := v_cancelled + 1;
  end loop;

  update public.sessions set status = 'cancelled' where id = p_session_id;

  return query select v_cancelled, v_refunded;
end $$;

grant execute on function public.admin_cancel_session(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Staff roster reads. 0006 revoked `sessions.qr_secret` from members and
-- granted the other columns back; a coach's roster also needs the names of
-- members booked into their own sessions, which `coaches_member()` already
-- allows. Nothing further is needed there.
--
-- What is missing is a count of every session's roster for the schedule list:
-- session_counts() is limited to a date window, which suits the member Book
-- screen but not an admin looking at one session.
-- ---------------------------------------------------------------------------
create or replace function public.session_roster_counts(p_session_id uuid)
returns table (booked int, waitlisted int, attended int, no_show int)
language sql
stable
security definer
set search_path = public
as $$
  select count(*) filter (where b.status = 'booked')::int,
         count(*) filter (where b.status = 'waitlisted')::int,
         count(*) filter (where b.status = 'attended')::int,
         count(*) filter (where b.status = 'no_show')::int
    from public.bookings b
   where b.session_id = p_session_id
$$;

grant execute on function public.session_roster_counts(uuid) to authenticated, service_role;
