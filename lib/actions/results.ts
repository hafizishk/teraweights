"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, readableError } from "@/lib/actions/guard";
import { getResultCandidates } from "@/lib/queries/admin";
import { matchResults, parseResultsCsv, rankResults, type MatchedRow } from "@/lib/rules/results-import";
import type { ActionResult } from "@/lib/actions/bookings";

export type ImportPreview = {
  rows: (MatchedRow & { rank: number })[];
  errors: { line: number; message: string }[];
  matched: number;
  unmatched: number;
};

/**
 * Parses and matches without writing anything, so the admin sees who each row
 * lands on before confirming (brief section 9).
 */
export async function previewResults(eventId: string, csvText: string): Promise<ImportPreview | { error: string }> {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const { rows, errors } = parseResultsCsv(csvText);
  const candidates = await getResultCandidates(guard.supabase, eventId);
  const ranked = rankResults(matchResults(rows, candidates));

  return {
    rows: ranked,
    errors,
    matched: ranked.filter((r) => r.memberId).length,
    unmatched: ranked.filter((r) => !r.memberId).length,
  };
}

/**
 * Writes the results. The CSV is re-parsed and re-matched here rather than
 * trusting the preview that came back from the browser.
 *
 * An import replaces the event's existing results, so a corrected file can be
 * uploaded again without leaving duplicates behind.
 */
export async function confirmResults(
  eventId: string,
  csvText: string,
  includeUnmatched: boolean,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { rows, errors } = parseResultsCsv(csvText);
  if (rows.length === 0) {
    return { ok: false, error: errors[0]?.message ?? "Nothing in that file could be read." };
  }

  const candidates = await getResultCandidates(guard.supabase, eventId);
  const ranked = rankResults(matchResults(rows, candidates));
  const keep = includeUnmatched ? ranked : ranked.filter((r) => r.memberId);
  if (keep.length === 0) return { ok: false, error: "No rows matched a member. Nothing was imported." };

  const { error: clearError } = await guard.supabase.from("event_results").delete().eq("event_id", eventId);
  if (clearError) return { ok: false, error: readableError(clearError.message, "Could not clear the old results.") };

  const { error } = await guard.supabase.from("event_results").insert(
    keep.map((r) => ({
      event_id: eventId,
      registration_id: r.registrationId,
      member_id: r.memberId,
      display_name: r.displayName,
      division: r.division,
      total_seconds: r.totalSeconds,
      rank: r.rank,
      station_splits: r.splits,
    })),
  );
  if (error) return { ok: false, error: readableError(error.message, "Could not import those results.") };

  revalidatePath("/admin/events");
  revalidatePath("/app/parox");
  revalidatePath("/app/events");

  const skipped = ranked.length - keep.length;
  return {
    ok: true,
    message: `Imported ${keep.length} results${skipped > 0 ? `, ${skipped} unmatched rows skipped` : ""}.`,
  };
}
