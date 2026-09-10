-- Event registration (brief section 7): slot capacity enforced, waitlist like
-- sessions, free events n/a, PA.ROX pending until admin records payment.
-- Members can insert their own registrations under RLS, but capacity needs a
-- lock and counts need other people's rows, so both live here as definers.
-- Guests never touch these directly: the server action calls with the service
-- role, where auth.uid() is null and the guest fields are required.

-- ---------------------------------------------------------------------------
-- Counts: per slot for the picker, per event for teasers.
-- ---------------------------------------------------------------------------
create or replace function public.event_slot_counts(p_event_id uuid)
returns table (slot_id uuid, registered_count int, waitlisted_count int)
language sql
stable
security definer
set search_path = public
as $$
  select s.id,
         count(r.id) filter (where r.status in ('registered', 'attended'))::int,
         count(r.id) filter (where r.status = 'waitlisted')::int
    from public.event_slots s
    left join public.event_registrations r on r.slot_id = s.id
   where s.event_id = p_event_id
   group by s.id
$$;

create or replace function public.event_registration_counts(p_event_ids uuid[])
returns table (event_id uuid, registered_count int)
language sql
stable
security definer
set search_path = public
as $$
  select e.id,
         count(r.id) filter (where r.status in ('registered', 'attended'))::int
    from public.events e
    left join public.event_registrations r on r.event_id = e.id
   where e.id = any (p_event_ids)
   group by e.id
$$;

grant execute on function public.event_slot_counts(uuid) to anon, authenticated, service_role;
grant execute on function public.event_registration_counts(uuid[]) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- register_for_event — member (auth.uid()) or guest (service role, uid null).
-- ---------------------------------------------------------------------------
create or replace function public.register_for_event(
  p_event_id uuid,
  p_slot_id uuid,
  p_guest_name text default null,
  p_guest_email text default null,
  p_guest_phone text default null
)
returns table (registration_id uuid, status text, payment_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_event public.events%rowtype;
  v_slot public.event_slots%rowtype;
  v_count int;
  v_status text;
  v_pay text;
  v_id uuid;
  v_email text := lower(trim(coalesce(p_guest_email, '')));
begin
  select * into v_event from public.events e where e.id = p_event_id;
  if not found then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;
  if not v_event.registration_open then
    raise exception 'Registration is closed for this event' using errcode = 'P0001';
  end if;

  if v_member is null then
    if not v_event.is_public or v_event.requires_account then
      raise exception 'This event needs an account. Sign in to register.' using errcode = 'P0001';
    end if;
    if coalesce(trim(p_guest_name), '') = '' or v_email = '' then
      raise exception 'Name and email are required' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.event_registrations r
       where r.event_id = p_event_id and lower(r.guest_email) = v_email and r.status <> 'cancelled'
    ) then
      raise exception 'That email is already registered for this event' using errcode = '23505';
    end if;
  else
    if exists (
      select 1 from public.event_registrations r
       where r.event_id = p_event_id and r.member_id = v_member and r.status <> 'cancelled'
    ) then
      raise exception 'You are already registered for this event' using errcode = '23505';
    end if;
  end if;

  if p_slot_id is not null then
    select * into v_slot from public.event_slots s
     where s.id = p_slot_id and s.event_id = p_event_id
     for update;
    if not found then
      raise exception 'Pick a slot' using errcode = 'P0001';
    end if;
    select count(*)::int into v_count from public.event_registrations r
     where r.slot_id = p_slot_id and r.status in ('registered', 'attended');
    v_status := case when v_count >= v_slot.capacity then 'waitlisted' else 'registered' end;
  else
    if exists (select 1 from public.event_slots s where s.event_id = p_event_id) then
      raise exception 'Pick a slot' using errcode = 'P0001';
    end if;
    v_status := 'registered';
  end if;

  v_pay := case when v_event.is_free then 'n/a' else 'pending' end;

  insert into public.event_registrations
    (event_id, slot_id, member_id, guest_name, guest_email, guest_phone, status, payment_status)
  values
    (p_event_id, p_slot_id, v_member,
     case when v_member is null then trim(p_guest_name) end,
     case when v_member is null then v_email end,
     case when v_member is null then nullif(trim(p_guest_phone), '') end,
     v_status, v_pay)
  returning id into v_id;

  return query select v_id, v_status, v_pay;
end $$;

grant execute on function public.register_for_event(uuid, uuid, text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- cancel_event_registration — own registration; promotes the earliest
-- waitlisted entry in the same slot. Events carry no entitlement, so the
-- promotion can complete here.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_event_registration(p_registration_id uuid)
returns table (promoted_registration_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member uuid := auth.uid();
  v_reg public.event_registrations%rowtype;
  v_slot public.event_slots%rowtype;
  v_count int;
  v_promote uuid;
begin
  if v_member is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_reg from public.event_registrations r where r.id = p_registration_id for update;
  if not found then
    raise exception 'Registration not found' using errcode = 'P0002';
  end if;
  if v_reg.member_id <> v_member and not public.is_admin() then
    raise exception 'Not your registration' using errcode = '42501';
  end if;
  if v_reg.status not in ('registered', 'waitlisted') then
    raise exception 'That registration is not active' using errcode = 'P0001';
  end if;

  update public.event_registrations set status = 'cancelled' where id = v_reg.id;

  if v_reg.status = 'registered' and v_reg.slot_id is not null then
    select * into v_slot from public.event_slots s where s.id = v_reg.slot_id for update;
    select count(*)::int into v_count from public.event_registrations r
     where r.slot_id = v_slot.id and r.status in ('registered', 'attended');
    if v_count < v_slot.capacity then
      select r.id into v_promote from public.event_registrations r
       where r.slot_id = v_slot.id and r.status = 'waitlisted'
       order by r.created_at
       limit 1;
      if v_promote is not null then
        update public.event_registrations set status = 'registered' where id = v_promote;
      end if;
    end if;
  end if;

  return query select v_promote;
end $$;

grant execute on function public.cancel_event_registration(uuid) to authenticated, service_role;
