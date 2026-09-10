import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * First sign-in: three questions before anything else. Called from each
 * member page rather than the member layout, because a redirect thrown in a
 * layout shared by the source and target routes loops during client-side
 * navigation. /app/onboarding and /app/checkin do not call it, so a scanned
 * QR still works for a brand-new member.
 */
export async function requireOnboarded(supabase: SupabaseClient, userId: string): Promise<void> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", userId)
    .maybeSingle<{ onboarded_at: string | null }>();
  if (data && !data.onboarded_at) redirect("/app/onboarding");
}
