-- Free trial week (scope change, 10 Sep 2026). A trial is an ordinary
-- membership package that costs nothing, lasts 7 days and can be taken once.
-- Members cannot write member_packages under RLS, so starting one is a
-- definer function that enforces "once per member" and "not while a paid
-- membership is active".

alter table public.packages
  add column if not exists is_trial boolean not null default false;

alter table public.member_packages
  add column if not exists is_trial boolean not null default false;

-- One trial per member, ever. Catches concurrent taps too.
create unique index if not exists member_packages_one_trial_uq
  on public.member_packages (member_id)
  where is_trial;

create or replace function public.start_trial()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_pkg public.packages%rowtype;
  v_id uuid;
begin
  if v_member is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_pkg from public.packages p
   where p.is_trial and p.is_active
   order by p.name
   limit 1;
  if not found then
    raise exception 'No trial is available right now' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.member_packages mp where mp.member_id = v_member and mp.is_trial) then
    raise exception 'You have already used your free week' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.member_packages mp
     where mp.member_id = v_member
       and mp.kind = 'membership'
       and mp.payment_status = 'paid'
       and mp.expires_at > now()
  ) then
    raise exception 'You already have an active membership' using errcode = 'P0001';
  end if;

  insert into public.member_packages
    (member_id, package_id, kind, starts_at, expires_at, payment_status, payment_ref, purchased_at, is_trial, fe_credits_remaining)
  values
    (v_member, v_pkg.id, 'membership', now(), now() + make_interval(days => v_pkg.validity_days), 'paid', 'TRIAL', now(), true, 0)
  returning id into v_id;

  return v_id;
end $$;

grant execute on function public.start_trial() to authenticated, service_role;
