"use server";

import { revalidatePath } from "next/cache";
import { requireStaff, readableError } from "@/lib/actions/guard";
import type { ActionResult } from "@/lib/actions/bookings";

type Mark = "attended" | "no_show" | "booked";

const LABEL: Record<Mark, string> = {
  attended: "Marked attended.",
  no_show: "Marked no-show.",
  booked: "Attendance cleared.",
};

/**
 * Manual attendance from the roster. Coaches may do this for their own
 * sessions; the `bookings: coach update` policy is what scopes it.
 */
export async function setAttendance(bookingId: string, mark: Mark, sessionId: string): Promise<ActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("bookings")
    .update({
      status: mark,
      checked_in_at: mark === "attended" ? new Date().toISOString() : null,
    })
    .eq("id", bookingId);
  if (error) return { ok: false, error: readableError(error.message, "Could not update attendance.") };

  revalidatePath(`/admin/schedule/${sessionId}`);
  revalidatePath("/admin");
  return { ok: true, message: LABEL[mark] };
}
