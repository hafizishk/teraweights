"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { devLoginEnabled } from "@/lib/dev-login";
import { isStaff, type Role } from "@/lib/types";

/**
 * Dev only. Mints a one-time sign-in token for a seeded account and verifies
 * it here, so the session cookie is written by this request and the resulting
 * session is the same as one from an emailed code.
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

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError) redirect(`/dev/login?error=${encodeURIComponent(verifyError.message)}`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle<{ role: Role }>();

  redirect(isStaff(profile?.role) ? "/admin" : "/app");
}
