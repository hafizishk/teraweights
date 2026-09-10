"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/actions/bookings";

/**
 * Starts the member's free trial week. Eligibility is decided by
 * lib/rules/trial.ts for the UI; start_trial() enforces it again in SQL.
 */
export async function startTrial(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { error } = await supabase.rpc("start_trial");
  if (error) {
    const friendly = /already used|already have|No trial/i.test(error.message)
      ? error.message
      : "Could not start your free week. Contact us.";
    return { ok: false, error: friendly };
  }

  revalidatePath("/app");
  revalidatePath("/app/book");
  revalidatePath("/app/profile");
  return { ok: true, message: "Your free week has started. Book anything East or West." };
}
