/**
 * Attendance streak — brief section 7.
 *
 * Streak: consecutive calendar weeks (Mon–Sun, Singapore) with at least one
 * attended booking. The current week counts once it has an attendance; until
 * then the streak is measured up to last week, so it is not "broken" on Monday
 * morning before anyone has trained.
 *
 * Sessions this month: attended bookings in the current Singapore month.
 */
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";
import { sgtMidnight, weekOf } from "@/lib/week";

/** yyyy-MM-dd of the Monday starting the Singapore week containing `when`. */
function weekKey(when: Date): string {
  return weekOf(when).days[0];
}

function previousWeekKey(key: string): string {
  const d = sgtMidnight(key);
  d.setUTCDate(d.getUTCDate() - 7);
  return weekOf(d).days[0];
}

export function attendanceStreakWeeks(attendedAt: (string | Date)[], now: Date = new Date()): number {
  const weeks = new Set(attendedAt.map((d) => weekKey(new Date(d))));
  if (weeks.size === 0) return 0;

  let cursor = weekKey(now);
  if (!weeks.has(cursor)) {
    cursor = previousWeekKey(cursor);
    if (!weeks.has(cursor)) return 0;
  }

  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = previousWeekKey(cursor);
  }
  return streak;
}

export function sessionsThisMonth(attendedAt: (string | Date)[], now: Date = new Date()): number {
  const month = formatInTimeZone(now, TZ, "yyyy-MM");
  return attendedAt.filter((d) => formatInTimeZone(new Date(d), TZ, "yyyy-MM") === month).length;
}

/** Attended bookings in the current Singapore week (Mon–Sun). */
export function sessionsThisWeek(attendedAt: (string | Date)[], now: Date = new Date()): number {
  const key = weekKey(now);
  return attendedAt.filter((d) => weekKey(new Date(d)) === key).length;
}
