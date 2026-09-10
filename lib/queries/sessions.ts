import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassSlug } from "@/lib/types";
import type { SessionStatus } from "@/lib/rules/booking-window";

export type SessionRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: SessionStatus;
  notes: string | null;
  class_slug: ClassSlug;
  class_name: string;
  venue_name: string;
  venue_map_url: string | null;
  coach_id: string | null;
  coach_name: string | null;
};

type SessionJoin = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: SessionStatus;
  notes: string | null;
  coach_id: string | null;
  class_types: { slug: ClassSlug; name: string } | null;
  venues: { name: string; map_url: string | null } | null;
  coach: { full_name: string | null } | null;
};

const SELECT =
  "id, starts_at, ends_at, capacity, status, notes, coach_id, " +
  "class_types(slug, name), venues(name, map_url), coach:profiles!sessions_coach_id_fkey(full_name)";

function toRow(r: SessionJoin): SessionRow {
  return {
    id: r.id,
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    capacity: r.capacity,
    status: r.status,
    notes: r.notes,
    class_slug: r.class_types?.slug ?? "energise_east",
    class_name: r.class_types?.name ?? "Session",
    venue_name: r.venues?.name ?? "TBC",
    venue_map_url: r.venues?.map_url ?? null,
    coach_id: r.coach_id,
    coach_name: r.coach?.full_name ?? null,
  };
}

export async function getSessionsBetween(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<SessionRow[]> {
  const { data } = await supabase
    .from("sessions")
    .select(SELECT)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at", { ascending: true });

  return ((data ?? []) as unknown as SessionJoin[]).map(toRow);
}

export async function getSession(
  supabase: SupabaseClient,
  id: string,
): Promise<SessionRow | null> {
  const { data } = await supabase.from("sessions").select(SELECT).eq("id", id).maybeSingle();
  return data ? toRow(data as unknown as SessionJoin) : null;
}

/** booked / waitlisted counts per session, via the definer function (RLS hides other members' bookings). */
export async function getSessionCounts(
  supabase: SupabaseClient,
  fromIso: string,
  toIso: string,
): Promise<Map<string, { booked: number; waitlisted: number }>> {
  const { data } = await supabase.rpc("session_counts", { p_from: fromIso, p_to: toIso });
  const map = new Map<string, { booked: number; waitlisted: number }>();
  for (const row of (data ?? []) as { session_id: string; booked_count: number; waitlisted_count: number }[]) {
    map.set(row.session_id, { booked: row.booked_count, waitlisted: row.waitlisted_count });
  }
  return map;
}

export type MyBooking = {
  id: string;
  session_id: string;
  status: "booked" | "waitlisted" | "cancelled" | "attended" | "no_show";
  entitlement: "membership" | "credit" | "fe_credit" | null;
  credits_used: number;
  checked_in_at: string | null;
};

/** The member's live bookings (booked, waitlisted or attended) in a date range. */
export async function getMyBookings(
  supabase: SupabaseClient,
  memberId: string,
  sessionIds: string[],
): Promise<Map<string, MyBooking>> {
  const map = new Map<string, MyBooking>();
  if (sessionIds.length === 0) return map;

  const { data } = await supabase
    .from("bookings")
    .select("id, session_id, status, entitlement, credits_used, checked_in_at")
    .eq("member_id", memberId)
    .in("session_id", sessionIds)
    .in("status", ["booked", "waitlisted", "attended"]);

  for (const b of (data ?? []) as MyBooking[]) map.set(b.session_id, b);
  return map;
}
