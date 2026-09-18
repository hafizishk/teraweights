import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassSlug } from "@/lib/types";
import type { Sample } from "@/lib/rules/zones";

export type HealthSource = "apple_health" | "health_connect";

export type SessionMetricsRow = {
  id: string;
  booking_id: string;
  session_id: string;
  source: HealthSource;
  device: string | null;
  avg_bpm: number;
  max_bpm: number;
  kcal: number | null;
  samples: Sample[];
  synced_at: string;
  /** From the session join. */
  starts_at: string;
  ends_at: string;
  class_slug: ClassSlug;
  class_name: string;
  venue_name: string;
  coach_name: string | null;
  checked_in_at: string | null;
};

export type WorkoutRow = {
  id: string;
  kind: string;
  started_at: string;
  ended_at: string;
  kcal: number | null;
  distance_m: number | null;
};

type MetricsJoin = Omit<SessionMetricsRow, "starts_at" | "ends_at" | "class_slug" | "class_name" | "venue_name" | "coach_name" | "checked_in_at"> & {
  sessions: {
    starts_at: string;
    ends_at: string;
    class_types: { slug: ClassSlug; name: string } | null;
    venues: { name: string } | null;
    coach: { full_name: string | null } | null;
  } | null;
  bookings: { checked_in_at: string | null } | null;
};

const SELECT =
  "id, booking_id, session_id, source, device, avg_bpm, max_bpm, kcal, samples, synced_at, " +
  "sessions!inner(starts_at, ends_at, class_types(slug, name), venues(name), coach:profiles!sessions_coach_id_fkey(full_name)), " +
  "bookings!inner(checked_in_at)";

function toRow(r: MetricsJoin): SessionMetricsRow {
  return {
    id: r.id,
    booking_id: r.booking_id,
    session_id: r.session_id,
    source: r.source,
    device: r.device,
    avg_bpm: r.avg_bpm,
    max_bpm: r.max_bpm,
    kcal: r.kcal,
    samples: Array.isArray(r.samples) ? r.samples : [],
    synced_at: r.synced_at,
    starts_at: r.sessions?.starts_at ?? "",
    ends_at: r.sessions?.ends_at ?? "",
    class_slug: r.sessions?.class_types?.slug ?? "energise_east",
    class_name: r.sessions?.class_types?.name ?? "Session",
    venue_name: r.sessions?.venues?.name ?? "TBC",
    coach_name: r.sessions?.coach?.full_name ?? null,
    checked_in_at: r.bookings?.checked_in_at ?? null,
  };
}

/** The member's session metrics, newest session first. RLS keeps them to the member. */
export async function getMyMetrics(supabase: SupabaseClient, memberId: string, limit = 20): Promise<SessionMetricsRow[]> {
  const { data } = await supabase
    .from("session_metrics")
    .select(SELECT)
    .eq("member_id", memberId)
    .order("starts_at", { referencedTable: "sessions", ascending: false })
    .limit(limit);
  const rows = ((data ?? []) as unknown as MetricsJoin[]).map(toRow);
  // PostgREST orders inside the embed, not the parent, so sort here to be safe.
  return rows.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
}

export async function getMetricsForSession(supabase: SupabaseClient, memberId: string, sessionId: string): Promise<SessionMetricsRow | null> {
  const { data } = await supabase.from("session_metrics").select(SELECT).eq("member_id", memberId).eq("session_id", sessionId).maybeSingle();
  return data ? toRow(data as unknown as MetricsJoin) : null;
}

/** Own workouts (runs, rides) that started inside a range. */
export async function getMyWorkoutsBetween(supabase: SupabaseClient, memberId: string, fromIso: string, toIso: string): Promise<WorkoutRow[]> {
  const { data } = await supabase
    .from("health_workouts")
    .select("id, kind, started_at, ended_at, kcal, distance_m")
    .eq("member_id", memberId)
    .gte("started_at", fromIso)
    .lt("started_at", toIso)
    .order("started_at", { ascending: true });
  return (data ?? []) as WorkoutRow[];
}
