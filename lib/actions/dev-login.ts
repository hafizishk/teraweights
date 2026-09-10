"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { devLoginEnabled } from "@/lib/dev-login";

/**
 * Dev only. Mints a one-time sign-in token for a seeded account and completes
 * it through the normal /auth/callback path, so the session is a real one.
 */
export async function devSignInAs(formData: FormData): Promise<void> {
  if (!devLoginEnabled()) redirect("/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/dev/login?error=Pick+an+account");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    redirect(`/dev/login?error=${encodeURIComponent(error?.message ?? "Could not create a sign-in token")}`);
  }

  const params = new URLSearchParams({ token_hash: data.properties.hashed_token, type: "magiclink" });
  redirect(`/auth/callback?${params.toString()}`);
}
