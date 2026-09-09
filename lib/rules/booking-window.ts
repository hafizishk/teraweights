/** Booking window — brief section 7: opens while scheduled, closes 1 hour before start. */

export const BOOKING_CLOSES_HOURS_BEFORE = 1;

export type SessionStatus = "scheduled" | "cancelled" | "completed";

export type BookingWindow = "open" | "closing_soon" | "closed" | "session_cancelled";

export function bookingWindow(
  session: { starts_at: string; status: SessionStatus },
  now: Date = new Date(),
): BookingWindow {
  if (session.status === "cancelled") return "session_cancelled";
  const start = new Date(session.starts_at).getTime();
  const closesAt = start - BOOKING_CLOSES_HOURS_BEFORE * 3_600_000;
  if (now.getTime() >= closesAt) return "closed";
  if (session.status === "completed") return "closed";
  if (closesAt - now.getTime() <= 2 * 3_600_000) return "closing_soon";
  return "open";
}

export function isBookable(
  session: { starts_at: string; status: SessionStatus },
  now: Date = new Date(),
): boolean {
  const w = bookingWindow(session, now);
  return w === "open" || w === "closing_soon";
}
