-- Connected health for PT. A session_metrics row now points at either a class
-- booking or a PT session, never both. The wearable sees a PT hour exactly
-- as it sees a class; only the table it belongs to differs.

alter table public.session_metrics
  alter column booking_id drop not null,
  alter column session_id drop not null,
  add column if not exists pt_session_id uuid unique references public.pt_sessions (id) on delete cascade;

alter table public.session_metrics drop constraint if exists session_metrics_one_parent;
alter table public.session_metrics add constraint session_metrics_one_parent
  check (num_nonnulls(booking_id, pt_session_id) = 1);
