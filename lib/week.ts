import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";

/** Singapore has no daylight saving, so the offset is always +08:00. */
const SGT_OFFSET = "+08:00";

/** The yyyy-MM-dd calendar date in Singapore for an instant. */
export function sgtDate(when: Date | string): string {
  return formatInTimeZone(new Date(when), TZ, "yyyy-MM-dd");
}

/** Midnight Singapore time on a yyyy-MM-dd date, as a UTC instant. */
export function sgtMidnight(date: string): Date {
  return new Date(`${date}T00:00:00${SGT_OFFSET}`);
}

function addDays(date: string, days: number): string {
  const d = sgtMidnight(date);
  d.setUTCDate(d.getUTCDate() + days);
  return sgtDate(d);
}

export type Week = {
  /** yyyy-MM-dd for Monday through Sunday. */
  days: string[];
  startIso: string;
  endIso: string;
  label: string;
};

/**
 * The Monday–Sunday week containing `now` in Singapore, shifted by `offset` weeks.
 */
export function weekOf(now: Date, offset = 0): Week {
  const today = sgtDate(now);
  const isoDay = Number(formatInTimeZone(now, TZ, "i")); // 1 = Mon … 7 = Sun
  const monday = addDays(today, -(isoDay - 1) + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const start = sgtMidnight(monday);
  const end = sgtMidnight(addDays(monday, 7));

  return {
    days,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: weekLabel(days[0], days[6]),
  };
}

function weekLabel(from: string, to: string): string {
  const a = sgtMidnight(from);
  const b = sgtMidnight(to);
  const sameMonth = formatInTimeZone(a, TZ, "MMM") === formatInTimeZone(b, TZ, "MMM");
  return sameMonth
    ? `${formatInTimeZone(a, TZ, "d")}–${formatInTimeZone(b, TZ, "d MMM")}`
    : `${formatInTimeZone(a, TZ, "d MMM")} – ${formatInTimeZone(b, TZ, "d MMM")}`;
}

/** "Mon" / "Tue" … for the week strip. */
export function dayInitial(date: string): string {
  return formatInTimeZone(sgtMidnight(date), TZ, "EEE");
}

/** Day of the month, for the week strip. */
export function dayNumber(date: string): string {
  return formatInTimeZone(sgtMidnight(date), TZ, "d");
}
