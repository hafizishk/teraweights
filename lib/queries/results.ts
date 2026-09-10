import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResultRow } from "@/lib/rules/results";

type ResultJoin = {
  id: string;
  event_id: string;
  division: ResultRow["division"];
  total_seconds: number;
  rank: number | null;
  station_splits: { station: string; seconds: number }[] | null;
  events: {
    slug: string;
    name: string;
    type: ResultRow["eventType"];
    event_date: string;
  } | null;
};

/** The member's own results across every event, with the event attached. */
export async function getMyResults(supabase: SupabaseClient, memberId: string): Promise<ResultRow[]> {
  const { data } = await supabase
    .from("event_results")
    .select("id, event_id, division, total_seconds, rank, station_splits, events(slug, name, type, event_date)")
    .eq("member_id", memberId);

  return ((data ?? []) as unknown as ResultJoin[])
    .filter((r) => r.events)
    .map((r) => ({
      eventId: r.event_id,
      eventSlug: r.events!.slug,
      eventName: r.events!.name,
      eventType: r.events!.type,
      eventDate: r.events!.event_date,
      division: r.division,
      totalSeconds: r.total_seconds,
      rank: r.rank,
      splits: r.station_splits,
    }));
}
