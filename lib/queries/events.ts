import type { SupabaseClient } from "@supabase/supabase-js";

export type EventType = "parox" | "kampung_grind" | "community";

export type EventRow = {
  id: string;
  slug: string;
  name: string;
  type: EventType;
  description: string | null;
  cover_url: string | null;
  event_date: string;
  is_free: boolean;
  price_sgd: number | null;
  is_public: boolean;
  requires_account: boolean;
  registration_open: boolean;
  partner_line: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_map_url: string | null;
};

type EventJoin = Omit<EventRow, "venue_name" | "venue_address" | "venue_map_url"> & {
  venues: { name: string; address: string | null; map_url: string | null } | null;
};

const SELECT =
  "id, slug, name, type, description, cover_url, event_date, is_free, price_sgd, is_public, requires_account, registration_open, partner_line, " +
  "venues(name, address, map_url)";

function toRow(r: EventJoin): EventRow {
  const { venues, ...rest } = r;
  return {
    ...rest,
    price_sgd: rest.price_sgd === null ? null : Number(rest.price_sgd),
    venue_name: venues?.name ?? null,
    venue_address: venues?.address ?? null,
    venue_map_url: venues?.map_url ?? null,
  };
}

export async function getEvents(supabase: SupabaseClient): Promise<EventRow[]> {
  const { data } = await supabase.from("events").select(SELECT).order("event_date", { ascending: true });
  return ((data ?? []) as unknown as EventJoin[]).map(toRow);
}

export async function getEventBySlug(supabase: SupabaseClient, slug: string): Promise<EventRow | null> {
  const { data } = await supabase.from("events").select(SELECT).eq("slug", slug).maybeSingle();
  return data ? toRow(data as unknown as EventJoin) : null;
}

export type SlotRow = {
  id: string;
  label: string;
  starts_at: string;
  capacity: number;
  registered: number;
  waitlisted: number;
};

export async function getSlots(supabase: SupabaseClient, eventId: string): Promise<SlotRow[]> {
  const [{ data: slots }, { data: counts }] = await Promise.all([
    supabase
      .from("event_slots")
      .select("id, label, starts_at, capacity")
      .eq("event_id", eventId)
      .order("starts_at", { ascending: true }),
    supabase.rpc("event_slot_counts", { p_event_id: eventId }),
  ]);

  const byId = new Map<string, { registered: number; waitlisted: number }>();
  for (const c of (counts ?? []) as { slot_id: string; registered_count: number; waitlisted_count: number }[]) {
    byId.set(c.slot_id, { registered: c.registered_count, waitlisted: c.waitlisted_count });
  }

  return ((slots ?? []) as { id: string; label: string; starts_at: string; capacity: number }[]).map((s) => ({
    ...s,
    registered: byId.get(s.id)?.registered ?? 0,
    waitlisted: byId.get(s.id)?.waitlisted ?? 0,
  }));
}

export async function getRegistrationCounts(
  supabase: SupabaseClient,
  eventIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (eventIds.length === 0) return map;
  const { data } = await supabase.rpc("event_registration_counts", { p_event_ids: eventIds });
  for (const row of (data ?? []) as { event_id: string; registered_count: number }[]) {
    map.set(row.event_id, row.registered_count);
  }
  return map;
}

export type MyRegistration = {
  id: string;
  event_id: string;
  slot_id: string | null;
  status: "registered" | "waitlisted" | "cancelled" | "attended";
  payment_status: "n/a" | "pending" | "paid";
};

/** The member's live registrations, keyed by event. RLS scopes to them. */
export async function getMyRegistrations(
  supabase: SupabaseClient,
  memberId: string,
): Promise<Map<string, MyRegistration>> {
  const { data } = await supabase
    .from("event_registrations")
    .select("id, event_id, slot_id, status, payment_status")
    .eq("member_id", memberId)
    .neq("status", "cancelled");

  const map = new Map<string, MyRegistration>();
  for (const r of (data ?? []) as MyRegistration[]) map.set(r.event_id, r);
  return map;
}

export type LeaderboardRow = {
  id: string;
  member_id: string | null;
  display_name: string;
  division: "open" | "doubles" | "relay" | "family";
  total_seconds: number;
  rank: number | null;
  station_splits: { station: string; seconds: number }[] | null;
};

/** Every result for an event the member can see (RLS: took part or registered). */
export async function getLeaderboard(supabase: SupabaseClient, eventId: string): Promise<LeaderboardRow[]> {
  const { data } = await supabase
    .from("event_results")
    .select("id, member_id, display_name, division, total_seconds, rank, station_splits")
    .eq("event_id", eventId)
    .order("division", { ascending: true })
    .order("total_seconds", { ascending: true });
  return (data ?? []) as LeaderboardRow[];
}
