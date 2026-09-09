"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActivePackages } from "@/lib/queries/packages";
import { getSession } from "@/lib/queries/sessions";
import { resolveEntitlement } from "@/lib/rules/entitlement";
import { isBookable } from "@/lib/rules/booking-window";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function refresh() {
  revalidatePath("/app");
  revalidatePath("/app/book");
}

/** Postgres RAISE messages are written for members; pass them through. */
function readableError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (/duplicate key|already booked/i.test(message)) return "You're already booked into this session.";
  if (/violates|permission denied|JWT/i.test(message)) return fallback;
  return message;
}

/**
 * Books the member into a session, or puts them on the waitlist when it is full.
 * Entitlement is resolved here (lib/rules/entitlement.ts); apply_booking enforces
 * capacity, credit balance and atomicity.
 */
export async function bookSession(sessionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const session = await getSession(supabase, sessionId);
  if (!session) return { ok: false, error: "That session no longer exists." };
  if (session.status === "cancelled") return { ok: false, error: "That session was cancelled." };
  if (!isBookable(session)) return { ok: false, error: "Booking has closed for this session." };

  const packages = await getActivePackages(supabase, user.id);
  const entitlement = resolveEntitlement(session, packages);

  const { data, error } = await supabase.rpc("apply_booking", {
    p_session_id: sessionId,
    p_member_package_id: entitlement.memberPackageId,
    p_entitlement: entitlement.kind === "blocked" ? null : entitlement.kind,
  });

  if (error) {
    return { ok: false, error: readableError(error.message, "Could not book that session.") };
  }

  const result = (data as { status: string; credits_used: number }[] | null)?.[0];
  refresh();

  if (result?.status === "waitlisted") {
    return { ok: true, message: "You're on the waitlist. We'll move you up if a spot frees." };
  }
  if (result?.credits_used) {
    return { ok: true, message: "Booked. 1 credit used." };
  }
  return { ok: true, message: "Booked. See you there." };
}

/** Joins the waitlist for a full session. Nothing is charged until promotion. */
export async function joinWaitlist(sessionId: string): Promise<ActionResult> {
  const result = await bookSession(sessionId);
  return result;
}

/**
 * Cancels the member's booking. Returns the credit when outside the 6-hour
 * cutoff, then promotes the earliest waitlisted member into the freed seat with
 * their own entitlement resolved fresh.
 */
export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data, error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
  if (error) {
    return { ok: false, error: readableError(error.message, "Could not cancel that booking.") };
  }

  const result = (data as { refunded: number; late: boolean; promote_booking_id: string | null }[] | null)?.[0];

  if (result?.promote_booking_id) {
    await promoteFromWaitlist(supabase, result.promote_booking_id);
  }

  refresh();

  if (result?.refunded) return { ok: true, message: "Cancelled. Your credit is back." };
  if (result?.late) return { ok: true, message: "Cancelled. Inside the 6-hour window, so no credit returned." };
  return { ok: true, message: "Cancelled." };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Resolves the promoted member's entitlement with the same rules, then charges it. */
async function promoteFromWaitlist(supabase: Supabase, bookingId: string): Promise<void> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, member_id, session_id")
    .eq("id", bookingId)
    .maybeSingle<{ id: string; member_id: string; session_id: string }>();
  if (!booking) return;

  const session = await getSession(supabase, booking.session_id);
  if (!session) return;

  // RLS hides another member's packages, so promotion can only price itself when
  // the canceller is staff. Members promote on a membership-or-nothing basis and
  // the promoted member keeps their waitlist place otherwise.
  const packages = await getActivePackages(supabase, booking.member_id);
  const entitlement = resolveEntitlement(session, packages);
  if (entitlement.kind === "blocked") return;

  await supabase.rpc("promote_booking", {
    p_booking_id: bookingId,
    p_member_package_id: entitlement.memberPackageId,
    p_entitlement: entitlement.kind,
  });
}
