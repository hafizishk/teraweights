import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isStaff, type Role } from "@/lib/types";

/**
 * Role gate for admin server actions.
 *
 * RLS is still the real guard — every policy re-checks `is_admin()` — but a
 * refused write surfaces as a confusing empty result, so actions check first
 * and return a sentence instead.
 */
export type Guarded =
  | { ok: true; supabase: SupabaseClient; userId: string; role: Role }
  | { ok: false; error: string };

async function guard(minimum: "staff" | "admin"): Promise<Guarded> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: Role }>();
  const role = data?.role;
  if (!role || !isStaff(role)) return { ok: false, error: "Admins and coaches only." };
  if (minimum === "admin" && role !== "admin") return { ok: false, error: "Admins only." };

  return { ok: true, supabase, userId: user.id, role };
}

export const requireStaff = () => guard("staff");
export const requireAdmin = () => guard("admin");

/** Postgres RAISE messages in these functions are written to be shown. */
export function readableError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (/violates row-level security|permission denied|JWT|duplicate key/i.test(message)) return fallback;
  return message;
}
