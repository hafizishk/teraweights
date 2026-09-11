import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";
import { sgtDate, sgtMidnight } from "@/lib/week";

/**
 * Personal training (scope change, direction A): which slots a member can
 * book. Pure: open hours in, taken windows in, bookable instants out. The
 * database re-checks every one of these on booking (book_pt_session).
 */

export type OpenHours = {
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;
  /** "HH:mm" or "HH:mm:ss", Singapore local. */
  start_time: string;
  end_time: string;
  slot_minutes: number;
  venue_id: string | null;
};

export type Window = { starts_at: string; ends_at: string };

export type Slot = { startsAt: Date; endsAt: Date; venueId: string | null; taken: boolean };

/** How far ahead a member may book PT. */
export const PT_BOOKING_HORIZON_DAYS = 14;

/** Book at least this long before the slot, so the coach is not surprised. */
export const PT_MIN_NOTICE_HOURS = 12;

function minutesOf(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function overlaps(a: { startsAt: Date; endsAt: Date }, b: Window): boolean {
  return a.startsAt.getTime() < new Date(b.ends_at).getTime() && a.endsAt.getTime() > new Date(b.starts_at).getTime();
}

/**
 * Every slot inside the coach's open hours from `now` for `days` days, in
 * order, each flagged taken when it clashes with a class or another PT
 * session. Slots that start within the notice period are left out.
 */
export function ptSlots(hours: OpenHours[], taken: Window[], now: Date, days = PT_BOOKING_HORIZON_DAYS): Slot[] {
  const out: Slot[] = [];
  const earliest = now.getTime() + PT_MIN_NOTICE_HOURS * 3_600_000;
  const cursor = sgtMidnight(sgtDate(now));

  for (let d = 0; d < days; d += 1) {
    const date = sgtDate(cursor);
    const isoDay = Number(formatInTimeZone(cursor, TZ, "i"));
    for (const h of hours.filter((x) => x.weekday === isoDay)) {
      const from = minutesOf(h.start_time);
      const to = minutesOf(h.end_time);
      for (let m = from; m + h.slot_minutes <= to; m += h.slot_minutes) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        const startsAt = new Date(`${date}T${hh}:${mm}:00+08:00`);
        if (startsAt.getTime() < earliest) continue;
        const endsAt = new Date(startsAt.getTime() + h.slot_minutes * 60_000);
        const slot = { startsAt, endsAt, venueId: h.venue_id, taken: false };
        slot.taken = taken.some((w) => overlaps(slot, w));
        out.push(slot);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Slots grouped by Singapore calendar day, for the picker. */
export function slotsByDay(slots: Slot[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const day = sgtDate(s.startsAt);
    map.set(day, [...(map.get(day) ?? []), s]);
  }
  return map;
}

/** "Tue and Thu mornings" style summary of a coach's hours, for the coach list. */
export function describeHours(hours: OpenHours[]): string {
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = [...new Set(hours.map((h) => h.weekday))].sort((a, b) => a - b).map((d) => names[d - 1]);
  if (days.length === 0) return "No PT hours set";
  if (days.length === 1) return days[0];
  return `${days.slice(0, -1).join(", ")} and ${days[days.length - 1]}`;
}

/** Days until a PT pack expires, floored at zero. */
export function daysToRenew(expiresAt: string, now: Date): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000));
}
