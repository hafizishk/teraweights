import type { SupabaseClient } from "@supabase/supabase-js";

export type Attendee = { id: string; name: string };

/** Who is booked into each session, limited to members who share attendance. */
export async function getAttendees(
  supabase: SupabaseClient,
  sessionIds: string[],
): Promise<Map<string, Attendee[]>> {
  const map = new Map<string, Attendee[]>();
  if (sessionIds.length === 0) return map;

  const { data } = await supabase.rpc("session_attendees", { p_session_ids: sessionIds });
  for (const row of (data ?? []) as { session_id: string; member_id: string; full_name: string | null }[]) {
    const list = map.get(row.session_id) ?? [];
    list.push({ id: row.member_id, name: row.full_name ?? "Energiser" });
    map.set(row.session_id, list);
  }
  return map;
}

export type CommunityPulse = { trainedThisWeek: number; sessionsLeftThisWeek: number };

export async function getCommunityPulse(supabase: SupabaseClient): Promise<CommunityPulse> {
  const { data } = await supabase.rpc("community_pulse");
  const row = (data as { trained_this_week: number; sessions_left_this_week: number }[] | null)?.[0];
  return {
    trainedThisWeek: row?.trained_this_week ?? 0,
    sessionsLeftThisWeek: row?.sessions_left_this_week ?? 0,
  };
}

/** "Nur, Irfan, Daniel +2 are in" — first names, excluding the viewer. */
export function attendeeLine(attendees: Attendee[], meId: string, totalBooked: number): string {
  const others = attendees.filter((a) => a.id !== meId).map((a) => a.name.split(" ")[0]);
  const me = attendees.some((a) => a.id === meId);
  const named = others.slice(0, 3);
  const unnamed = Math.max(0, totalBooked - named.length - (me ? 1 : 0));

  if (named.length === 0) {
    if (totalBooked - (me ? 1 : 0) <= 0) return me ? "You're first in" : "Be the first in";
    return `${totalBooked - (me ? 1 : 0)} going`;
  }
  const tail = unnamed > 0 ? ` +${unnamed}` : "";
  return `${named.join(", ")}${tail} ${named.length + unnamed === 1 ? "is" : "are"} in`;
}
