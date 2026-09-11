import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpenHours, Window } from "@/lib/rules/pt";
import type { MemberPackageRow } from "@/lib/queries/packages";

/**
 * Personal training reads. RLS scopes pt_sessions to the member (own), the
 * coach (own) and admins; open hours are readable by every signed-in member.
 */

export type PtStatus = "booked" | "cancelled" | "attended" | "no_show";

export type PtSessionRow = {
  id: string;
  coach_id: string;
  member_id: string;
  starts_at: string;
  ends_at: string;
  status: PtStatus;
  title: string | null;
  coach_note: string | null;
  credits_used: number;
  venue_name: string | null;
  coach_name: string | null;
  coach_title: string | null;
  coach_avatar: string | null;
  member_name: string | null;
  member_avatar: string | null;
};

type PtJoin = Omit<PtSessionRow, "venue_name" | "coach_name" | "coach_title" | "coach_avatar" | "member_name" | "member_avatar"> & {
  venues: { name: string } | null;
  coach: { full_name: string | null; staff_title: string | null; avatar_url: string | null } | null;
  member: { full_name: string | null; avatar_url: string | null } | null;
};

const SELECT =
  "id, coach_id, member_id, starts_at, ends_at, status, title, coach_note, credits_used, venues(name), " +
  "coach:profiles!pt_sessions_coach_id_fkey(full_name, staff_title, avatar_url), " +
  "member:profiles!pt_sessions_member_id_fkey(full_name, avatar_url)";

function toRow(r: PtJoin): PtSessionRow {
  const { venues, coach, member, ...rest } = r;
  return {
    ...rest,
    venue_name: venues?.name ?? null,
    coach_name: coach?.full_name ?? null,
    coach_title: coach?.staff_title ?? null,
    coach_avatar: coach?.avatar_url ?? null,
    member_name: member?.full_name ?? null,
    member_avatar: member?.avatar_url ?? null,
  };
}

/** A member's PT sessions, newest first. */
export async function getMyPtSessions(supabase: SupabaseClient, memberId: string): Promise<PtSessionRow[]> {
  const { data } = await supabase
    .from("pt_sessions")
    .select(SELECT)
    .eq("member_id", memberId)
    .order("starts_at", { ascending: false });
  return ((data ?? []) as unknown as PtJoin[]).map(toRow);
}

/** Every PT session in a window, for the coach's diary and the admin page. RLS trims it to what the caller may see. */
export async function getPtSessionsBetween(supabase: SupabaseClient, fromIso: string, toIso: string): Promise<PtSessionRow[]> {
  const { data } = await supabase
    .from("pt_sessions")
    .select(SELECT)
    .gte("starts_at", fromIso)
    .lt("starts_at", toIso)
    .order("starts_at", { ascending: true });
  return ((data ?? []) as unknown as PtJoin[]).map(toRow);
}

export type OpenHoursRow = OpenHours & { id: string; coach_id: string; venue_name: string | null };

export async function getOpenHours(supabase: SupabaseClient, coachId?: string): Promise<OpenHoursRow[]> {
  let query = supabase
    .from("pt_availability")
    .select("id, coach_id, weekday, start_time, end_time, slot_minutes, venue_id, venues(name)")
    .order("weekday")
    .order("start_time");
  if (coachId) query = query.eq("coach_id", coachId);
  const { data } = await query;
  return ((data ?? []) as unknown as (OpenHoursRow & { venues: { name: string } | null })[]).map(({ venues, ...r }) => ({
    ...r,
    venue_name: venues?.name ?? null,
  }));
}

/** Windows already taken by classes or PT, without who took them (definer function). */
export async function getTakenSlots(supabase: SupabaseClient, coachId: string, fromIso: string, toIso: string): Promise<Window[]> {
  const { data } = await supabase.rpc("pt_taken_slots", { p_coach_id: coachId, p_from: fromIso, p_to: toIso });
  return (data ?? []) as Window[];
}

/** The member's live PT pack, if any: paid, unexpired, soonest to expire first. */
export function activePtPack(packages: MemberPackageRow[], now = new Date()): MemberPackageRow | null {
  return (
    packages
      .filter((p) => p.kind === "pt" && p.payment_status === "paid" && new Date(p.expires_at).getTime() > now.getTime())
      .sort((a, b) => a.expires_at.localeCompare(b.expires_at))[0] ?? null
  );
}

/** Coaches who take PT: anyone with open hours, plus the member's assigned coach. */
export async function getPtCoaches(supabase: SupabaseClient): Promise<{ id: string; full_name: string | null; staff_title: string | null; avatar_url: string | null; hours: OpenHoursRow[] }[]> {
  const hours = await getOpenHours(supabase);
  const ids = [...new Set(hours.map((h) => h.coach_id))];
  if (ids.length === 0) return [];
  const { data } = await supabase.from("profiles").select("id, full_name, staff_title, avatar_url").in("id", ids).order("full_name");
  return ((data ?? []) as { id: string; full_name: string | null; staff_title: string | null; avatar_url: string | null }[]).map((c) => ({
    ...c,
    hours: hours.filter((h) => h.coach_id === c.id),
  }));
}
