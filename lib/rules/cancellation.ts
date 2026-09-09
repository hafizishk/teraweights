/**
 * Cancellation — brief section 7.
 *
 * ≥ 6 hours before start: cancel, credit returned if one was used.
 * < 6 hours: credit forfeited (warn first); membership bookings just cancel.
 * Late cancels are counted on the member record.
 *
 * CANCELLATION_CUTOFF_HOURS is canonical. The SQL function
 * public.cancellation_cutoff_hours() must match; scripts/db-assert.sql checks it.
 */

export const CANCELLATION_CUTOFF_HOURS = 6;

export type CancellableBooking = {
  status: "booked" | "waitlisted" | "cancelled" | "attended" | "no_show";
  credits_used: number;
};

export type CancellationOutcome = {
  allowed: boolean;
  /** Inside the cutoff: a used credit is forfeited. */
  late: boolean;
  creditsRefunded: number;
  /** Shown before the member confirms; null when there is nothing to warn about. */
  warning: string | null;
};

export function cancellationOutcome(
  booking: CancellableBooking,
  session: { starts_at: string },
  now: Date = new Date(),
): CancellationOutcome {
  if (booking.status !== "booked" && booking.status !== "waitlisted") {
    return { allowed: false, late: false, creditsRefunded: 0, warning: null };
  }

  // Leaving a waitlist costs nothing — nothing was charged.
  if (booking.status === "waitlisted") {
    return { allowed: true, late: false, creditsRefunded: 0, warning: null };
  }

  const cutoff = new Date(session.starts_at).getTime() - CANCELLATION_CUTOFF_HOURS * 3_600_000;
  const late = now.getTime() > cutoff;
  const usedCredit = booking.credits_used > 0;

  if (late && usedCredit) {
    return {
      allowed: true,
      late: true,
      creditsRefunded: 0,
      warning: `Less than ${CANCELLATION_CUTOFF_HOURS} hours before the session. Your credit will not be returned.`,
    };
  }

  return {
    allowed: true,
    late,
    creditsRefunded: usedCredit ? booking.credits_used : 0,
    warning: null,
  };
}
