"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCheckin } from "@/lib/rules/checkin";

export type CheckinResult =
  | { ok: true; message: string; alreadyIn: boolean }
  | { ok: false; error: string };

/**
 * Validates a scanned QR and marks the member attended.
 *
 * The session secret is read with the service role because members must never
 * be able to read it (a member who could would be able to forge check-ins).
 * The decision itself is lib/rules/checkin.ts; this only fetches and applies.
 */
export async function checkIn(sessionId: string, token: string): Promise<CheckinResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to check in." };
  if (!sessionId || !token) return { ok: false, error: "That QR code is incomplete. Scan it again." };

  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, starts_at, ends_at, status, qr_secret")
    .eq("id", sessionId)
    .maybeSingle<{ id: string; starts_at: string; ends_at: string; status: string; qr_secret: string | null }>();

  if (!session || !session.qr_secret) return { ok: false, error: "That session doesn't exist." };
  if (session.status === "cancelled") return { ok: false, error: "That session was cancelled." };

  const verdict = validateCheckin({
    secret: session.qr_secret,
    sessionId: session.id,
    token,
    startsAt: session.starts_at,
    endsAt: session.ends_at,
  });
  if (!verdict.ok) return { ok: false, error: verdict.message };

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("member_id", user.id)
    .maybeSingle<{ id: string; status: string }>();

  if (!booking || booking.status === "cancelled") {
    return { ok: false, error: "You're not booked into this session. Book it first, then scan again." };
  }
  if (booking.status === "attended") {
    return { ok: true, message: "You're already checked in.", alreadyIn: true };
  }
  if (booking.status === "waitlisted") {
    return { ok: false, error: "You're on the waitlist for this session, so there isn't a spot to check into yet." };
  }

  const { error } = await admin
    .from("bookings")
    .update({ status: "attended", checked_in_at: new Date().toISOString() })
    .eq("id", booking.id);
  if (error) return { ok: false, error: "Could not check you in. Show the coach this screen." };

  revalidatePath("/app");
  revalidatePath("/app/parox");
  return { ok: true, message: "Checked in. Have a good one.", alreadyIn: false };
}
