import { formatInTimeZone } from "date-fns-tz";

/** All display times are Asia/Singapore (CLAUDE.md conventions). */
export const TZ = "Asia/Singapore";

/** S$58 — whole dollars unless there are cents. */
export function formatSgd(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return `S$${hasCents ? n.toFixed(2) : Math.round(n).toString()}`;
}

/** 2892 → "48:12"; hours roll into minutes (3725 → "62:05"). */
export function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

/** "48:12" → 2892. Returns null if malformed. */
export function parseMmSs(value: string): number | null {
  const m = /^\s*(\d{1,3}):([0-5]\d)\s*$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "Thu 10 Sep" */
export function formatDay(date: Date | string): string {
  return formatInTimeZone(new Date(date), TZ, "EEE d MMM");
}

/** "8:00pm" / "7:30am" */
export function formatTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), TZ, "h:mmaaa");
}

/** "Thu 10 Sep · 8:00pm" */
export function formatDayTime(date: Date | string): string {
  return `${formatDay(date)} · ${formatTime(date)}`;
}

/** "28 Sep 2026" */
export function formatDate(date: Date | string): string {
  return formatInTimeZone(new Date(date), TZ, "d MMM yyyy");
}
