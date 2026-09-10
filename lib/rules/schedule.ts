import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";
import { sgtDate, sgtMidnight } from "@/lib/week";

/**
 * Bulk session creation (brief section 9). Pure: turns a recurrence into the
 * list of instants it produces, so the admin can be shown exactly what will be
 * written before anything is.
 */

export type BulkSpec = {
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  weekdays: number[];
  /** "HH:mm" in Singapore time. */
  time: string;
  durationMinutes: number;
  /** yyyy-MM-dd, inclusive. */
  from: string;
  /** yyyy-MM-dd, inclusive. */
  to: string;
};

export type PlannedSession = { startsAt: Date; endsAt: Date };

export const MAX_BULK_SESSIONS = 200;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Human-readable reason the spec cannot be used, or null when it is fine. */
export function bulkSpecError(spec: BulkSpec): string | null {
  if (!DATE_RE.test(spec.from) || !DATE_RE.test(spec.to)) return "Pick a start and end date.";
  if (spec.to < spec.from) return "The end date is before the start date.";
  if (!TIME_RE.test(spec.time)) return "Enter a time as HH:mm.";
  if (spec.weekdays.length === 0) return "Pick at least one weekday.";
  if (spec.weekdays.some((d) => d < 1 || d > 7)) return "Weekdays must be 1 (Monday) to 7 (Sunday).";
  if (spec.durationMinutes <= 0) return "Duration must be more than zero.";
  if (spec.durationMinutes > 240) return "Duration looks too long.";
  const count = planSessions(spec).length;
  if (count === 0) return "That range contains none of the chosen weekdays.";
  if (count > MAX_BULK_SESSIONS) return `That would create ${count} sessions. Narrow the range.`;
  return null;
}

/**
 * Every instant the recurrence lands on, in order. Singapore has no daylight
 * saving, so a fixed +08:00 offset is exact.
 */
export function planSessions(spec: BulkSpec): PlannedSession[] {
  if (!DATE_RE.test(spec.from) || !DATE_RE.test(spec.to) || !TIME_RE.test(spec.time)) return [];
  if (spec.to < spec.from) return [];

  const wanted = new Set(spec.weekdays);
  const out: PlannedSession[] = [];
  const cursor = sgtMidnight(spec.from);
  const last = sgtMidnight(spec.to);

  while (cursor.getTime() <= last.getTime() && out.length <= MAX_BULK_SESSIONS) {
    const date = sgtDate(cursor);
    const isoDay = Number(formatInTimeZone(cursor, TZ, "i"));
    if (wanted.has(isoDay)) {
      const startsAt = new Date(`${date}T${spec.time}:00+08:00`);
      out.push({ startsAt, endsAt: new Date(startsAt.getTime() + spec.durationMinutes * 60_000) });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
}

/** "Tue and Thu" / "Mon, Wed and Fri" — for the confirmation line. */
export function describeWeekdays(weekdays: number[]): string {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const picked = [...new Set(weekdays)].sort((a, b) => a - b).map((d) => names[d - 1]);
  if (picked.length === 0) return "no days";
  if (picked.length === 1) return picked[0];
  return `${picked.slice(0, -1).join(", ")} and ${picked[picked.length - 1]}`;
}
