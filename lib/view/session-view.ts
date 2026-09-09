import type { ClassSlug } from "@/lib/types";
import type { MemberPackage } from "@/lib/rules/entitlement";
import { resolveEntitlement } from "@/lib/rules/entitlement";
import { bookingWindow } from "@/lib/rules/booking-window";
import { cancellationOutcome } from "@/lib/rules/cancellation";
import { spotsLabel, spotsLeft } from "@/lib/rules/waitlist";
import type { SessionRow, MyBooking } from "@/lib/queries/sessions";

/**
 * Everything the Book list and detail sheet need, resolved on the server with
 * the pure rules so the client never re-derives a business decision.
 */
export type SessionView = {
  id: string;
  startsAt: string;
  endsAt: string;
  classSlug: ClassSlug;
  className: string;
  venueName: string;
  venueMapUrl: string | null;
  coachName: string | null;
  notes: string | null;
  capacity: number;
  bookedCount: number;
  waitlistedCount: number;
  spotsLeft: number;
  spotsLabel: string;
  full: boolean;
  window: ReturnType<typeof bookingWindow>;
  /** The member's own booking on this session, if any. */
  bookingId: string | null;
  bookingStatus: MyBooking["status"] | null;
  creditsUsed: number;
  /** Primary button label and whether it can be pressed. */
  action: "book" | "waitlist" | "cancel" | "leave_waitlist" | "blocked" | "closed" | "attended";
  actionLabel: string;
  entitlementNote: string | null;
  /** Shown before confirming a cancellation, when a credit would be lost. */
  cancelWarning: string | null;
};

export function buildSessionView(
  session: SessionRow,
  counts: { booked: number; waitlisted: number } | undefined,
  booking: MyBooking | undefined,
  packages: MemberPackage[],
  now: Date,
): SessionView {
  const bookedCount = counts?.booked ?? 0;
  const waitlistedCount = counts?.waitlisted ?? 0;
  const capacity = { capacity: session.capacity, bookedCount };
  const left = spotsLeft(capacity);
  const win = bookingWindow(session, now);
  const entitlement = resolveEntitlement(session, packages, now);

  let action: SessionView["action"];
  let actionLabel: string;
  let cancelWarning: string | null = null;

  if (booking?.status === "attended") {
    action = "attended";
    actionLabel = "Attended";
  } else if (booking?.status === "booked" || booking?.status === "waitlisted") {
    const outcome = cancellationOutcome(
      { status: booking.status, credits_used: booking.credits_used },
      session,
      now,
    );
    action = booking.status === "booked" ? "cancel" : "leave_waitlist";
    actionLabel = booking.status === "booked" ? "Cancel booking" : "Leave waitlist";
    cancelWarning = outcome.warning;
  } else if (win === "closed" || win === "session_cancelled") {
    action = "closed";
    actionLabel = win === "session_cancelled" ? "Cancelled" : "Booking closed";
  } else if (left === 0) {
    action = "waitlist";
    actionLabel = "Join waitlist";
  } else if (entitlement.kind === "blocked") {
    action = "blocked";
    actionLabel = entitlement.label;
  } else {
    action = "book";
    actionLabel = entitlement.label;
  }

  return {
    id: session.id,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
    classSlug: session.class_slug,
    className: session.class_name,
    venueName: session.venue_name,
    venueMapUrl: session.venue_map_url,
    coachName: session.coach_name,
    notes: session.notes,
    capacity: session.capacity,
    bookedCount,
    waitlistedCount,
    spotsLeft: left,
    spotsLabel: spotsLabel(capacity),
    full: left === 0,
    window: win,
    bookingId: booking?.id ?? null,
    bookingStatus: booking?.status ?? null,
    creditsUsed: booking?.credits_used ?? 0,
    action,
    actionLabel,
    entitlementNote:
      entitlement.kind === "blocked"
        ? entitlement.message
        : `Using ${entitlement.packageName}`,
    cancelWarning,
  };
}
