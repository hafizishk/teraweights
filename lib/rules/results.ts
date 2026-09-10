/**
 * PA.ROX results — brief section 8 (My PA.ROX).
 * Pure functions over a member's result rows.
 */

export type ResultRow = {
  eventId: string;
  eventSlug: string;
  eventName: string;
  eventType: "parox" | "kampung_grind" | "community";
  eventDate: string; // yyyy-MM-dd
  division: "open" | "doubles" | "relay" | "family";
  totalSeconds: number;
  rank: number | null;
  splits: { station: string; seconds: number }[] | null;
};

export type ResultWithDelta = ResultRow & {
  /** Seconds versus the member's previous edition, chronologically. Negative is faster. */
  deltaSeconds: number | null;
  isPersonalBest: boolean;
};

/** Oldest first. */
export function chronological<T extends { eventDate: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

/** Fastest race time across PA.ROX and Kampung Grind editions. */
export function personalBest(rows: ResultRow[]): ResultRow | null {
  const races = rows.filter((r) => r.eventType !== "community");
  if (races.length === 0) return null;
  return races.reduce((best, r) => (r.totalSeconds < best.totalSeconds ? r : best));
}

/** Adds delta versus the previous edition and marks the PB. */
export function withDeltas(rows: ResultRow[]): ResultWithDelta[] {
  const pb = personalBest(rows);
  const ordered = chronological(rows);
  return ordered.map((r, i) => ({
    ...r,
    deltaSeconds: i === 0 ? null : r.totalSeconds - ordered[i - 1].totalSeconds,
    isPersonalBest: pb !== null && r.eventId === pb.eventId,
  }));
}

/** "−3:32" faster, "+1:05" slower, "±0:00" level. */
export function formatDelta(seconds: number): string {
  const sign = seconds < 0 ? "−" : seconds > 0 ? "+" : "±";
  const s = Math.abs(Math.round(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${sign}${mm}:${ss.toString().padStart(2, "0")}`;
}

/** Longest split, for scaling bars. */
export function maxSplit(splits: { seconds: number }[]): number {
  return splits.reduce((m, s) => Math.max(m, s.seconds), 0);
}
