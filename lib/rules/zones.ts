/**
 * Heart-rate zones and the summary of a session's samples.
 *
 * Five bands as a share of the member's max heart rate. Profiles carry no
 * date of birth, so the max is a plain default until the member sets their
 * own under Your details. The bands are the usual ones: below 60% easy, then
 * 60, 70, 80 and 90% upward. Pure functions, no I/O.
 */

export const DEFAULT_MAX_HR = 190;

export const ZONE_LABELS = ["Easy", "Fat burn", "Aerobic", "Hard", "Max"] as const;
const ZONE_FLOORS = [0, 0.6, 0.7, 0.8, 0.9];

/** [seconds from session start, bpm] */
export type Sample = [number, number];

export type ZoneSummary = {
  avgBpm: number;
  maxBpm: number;
  /** Whole minutes in each of the five zones, in order. */
  zoneMinutes: [number, number, number, number, number];
  /** Minutes at 80% or above, zones four and five. */
  hardMinutes: number;
  totalMinutes: number;
};

export function maxHeartRate(profileMax: number | null | undefined): number {
  return profileMax && profileMax >= 120 && profileMax <= 230 ? profileMax : DEFAULT_MAX_HR;
}

/** Zone index 0–4 for a heart rate against a max. */
export function zoneOf(bpm: number, maxHr: number): number {
  const share = bpm / maxHr;
  let zone = 0;
  for (let i = 1; i < ZONE_FLOORS.length; i++) if (share >= ZONE_FLOORS[i]) zone = i;
  return zone;
}

/**
 * Each sample covers the time until the next one; the last sample covers
 * the median gap, so a trace with a missing tail is not inflated.
 */
export function summariseSamples(samples: Sample[], maxHr: number): ZoneSummary | null {
  const sorted = samples.filter((s) => Number.isFinite(s[0]) && Number.isFinite(s[1])).sort((a, b) => a[0] - b[0]);
  if (sorted.length === 0) return null;

  const gaps = sorted.slice(1).map((s, i) => Math.max(0, s[0] - sorted[i][0]));
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 60;

  const seconds = [0, 0, 0, 0, 0];
  let weighted = 0;
  let total = 0;
  let max = 0;
  sorted.forEach((s, i) => {
    const dur = i < gaps.length ? gaps[i] : medianGap;
    seconds[zoneOf(s[1], maxHr)] += dur;
    weighted += s[1] * dur;
    total += dur;
    if (s[1] > max) max = s[1];
  });
  if (total === 0) return null;

  const zoneMinutes = seconds.map((s) => Math.round(s / 60)) as ZoneSummary["zoneMinutes"];
  return {
    avgBpm: Math.round(weighted / total),
    maxBpm: max,
    zoneMinutes,
    hardMinutes: zoneMinutes[3] + zoneMinutes[4],
    totalMinutes: Math.round(total / 60),
  };
}

/** Widths for the zone bar, as percentages that sum to 100 (or all zero). */
export function zoneShares(zoneMinutes: readonly number[]): number[] {
  const total = zoneMinutes.reduce((a, b) => a + b, 0);
  if (total === 0) return zoneMinutes.map(() => 0);
  return zoneMinutes.map((m) => Math.round((m / total) * 100));
}

export type MetricsLike = { avgBpm: number; hardMinutes: number; kcal: number | null };

/**
 * One line against the member's previous session of the same class, in the
 * order avg, hard minutes, calories. Null when there is nothing to compare.
 */
export function compareLine(current: MetricsLike, previous: MetricsLike | null): string | null {
  if (!previous) return null;
  const parts: string[] = [];
  const dAvg = current.avgBpm - previous.avgBpm;
  parts.push(dAvg === 0 ? "Avg unchanged" : `Avg ${dAvg > 0 ? "up" : "down"} ${Math.abs(dAvg)} bpm`);
  const dHard = current.hardMinutes - previous.hardMinutes;
  parts.push(dHard === 0 ? "Same minutes hard" : `${Math.abs(dHard)} ${dHard > 0 ? "more" : "fewer"} minutes hard`);
  if (current.kcal !== null && previous.kcal !== null) {
    const dK = current.kcal - previous.kcal;
    parts.push(dK === 0 ? "Same kcal" : `${Math.abs(dK)} kcal ${dK > 0 ? "more" : "less"}`);
  }
  return parts.join(" · ");
}

/** The one sentence under the numbers on You. */
export function sessionLine(summary: ZoneSummary, hardestOfClassThisMonth: boolean): string {
  const hard = `${summary.hardMinutes} ${summary.hardMinutes === 1 ? "minute" : "minutes"} above 80%.`;
  return hardestOfClassThisMonth ? `${hard} Your hardest session this month.` : hard;
}
