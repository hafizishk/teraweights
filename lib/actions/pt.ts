"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, requireAdmin, readableError } from "@/lib/actions/guard";
import type { ActionResult } from "@/lib/actions/bookings";

function refreshMember() {
  revalidatePath("/app");
  revalidatePath("/app/pt");
  revalidatePath("/app/pt/book");
  revalidatePath("/app/profile");
  revalidatePath("/admin/pt");
}

/** Books one PT slot. book_pt_session() re-checks hours, clashes and the pack. */
export async function bookPtSession(coachId: string, startsAtIso: string, slotMinutes = 60): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data, error } = await supabase.rpc("book_pt_session", {
    p_coach_id: coachId,
    p_starts_at: startsAtIso,
    p_slot_minutes: slotMinutes,
  });
  if (error) return { ok: false, error: readableError(error.message, "Could not book that slot.") };

  const left = (data as { credits_left: number }[] | null)?.[0]?.credits_left ?? 0;
  refreshMember();
  return { ok: true, message: `Booked. ${left} PT ${left === 1 ? "session" : "sessions"} left on your pack.` };
}

export async function cancelPtSession(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_pt_session", { p_session_id: id });
  if (error) return { ok: false, error: readableError(error.message, "Could not cancel that session.") };

  const row = (data as { refunded: number; late: boolean }[] | null)?.[0];
  refreshMember();
  return {
    ok: true,
    message: row?.late ? "Cancelled. Inside the cutoff, so the session was not returned." : "Cancelled. Your session is back on the pack.",
  };
}

// ---------------------------------------------------------------------------
// Coach and admin
// ---------------------------------------------------------------------------

/** After the session: title and the note the member reads. Coach for own, admin for any. */
export async function savePtNote(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) return guard;

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("coach_note") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  if (!id) return { ok: false, error: "Missing session." };

  const fields: Record<string, string | null> = { title: title || null, coach_note: note || null };
  if (["booked", "attended", "no_show"].includes(status)) fields.status = status;

  const { error } = await guard.supabase.from("pt_sessions").update(fields).eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not save that note.") };

  refreshMember();
  return { ok: true, message: "Saved. The member sees it on their PT page." };
}

/** Add an open-hours window. A coach adds their own; an admin can add for anyone. */
export async function addOpenHours(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) return guard;

  const coachId = String(formData.get("coach_id") ?? "") || guard.userId;
  if (coachId !== guard.userId && guard.role !== "admin") return { ok: false, error: "Coaches can only edit their own hours." };

  const weekday = Number(formData.get("weekday") ?? 0);
  const start = String(formData.get("start_time") ?? "");
  const end = String(formData.get("end_time") ?? "");
  const slot = Number(formData.get("slot_minutes") ?? 60);
  const venueId = String(formData.get("venue_id") ?? "") || null;

  if (!(weekday >= 1 && weekday <= 7)) return { ok: false, error: "Pick a weekday." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) return { ok: false, error: "Times must be HH:mm." };
  if (end <= start) return { ok: false, error: "The window must end after it starts." };
  if (![30, 45, 60, 90].includes(slot)) return { ok: false, error: "Slot length must be 30, 45, 60 or 90 minutes." };

  const { error } = await guard.supabase
    .from("pt_availability")
    .insert({ coach_id: coachId, weekday, start_time: start, end_time: end, slot_minutes: slot, venue_id: venueId });
  if (error) return { ok: false, error: readableError(error.message, "Could not add those hours.") };

  refreshMember();
  revalidatePath("/app/coaches");
  return { ok: true, message: "Open hours added." };
}

export async function removeOpenHours(id: string): Promise<ActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("pt_availability").delete().eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not remove those hours.") };

  refreshMember();
  return { ok: true, message: "Open hours removed. Sessions already booked inside them stay." };
}

/** Admin cancels on a member's behalf, returning the credit regardless of cutoff. */
export async function adminCancelPtSession(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { data: row } = await guard.supabase
    .from("pt_sessions")
    .select("status, member_package_id, credits_used")
    .eq("id", id)
    .maybeSingle<{ status: string; member_package_id: string | null; credits_used: number }>();
  if (!row || row.status !== "booked") return { ok: false, error: "Only a booked session can be cancelled." };

  const { error } = await guard.supabase
    .from("pt_sessions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not cancel that session.") };

  if (row.member_package_id) {
    await guard.supabase.rpc("admin_adjust_credits", {
      p_member_package_id: row.member_package_id,
      p_delta: row.credits_used,
      p_reason: "PT session cancelled by Teraweights",
      p_kind: "credit",
    });
  }

  refreshMember();
  return { ok: true, message: "Cancelled and the session returned to their pack." };
}
