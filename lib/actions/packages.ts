"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, readableError } from "@/lib/actions/guard";
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

// ---------------------------------------------------------------------------
// Admin: package definitions (brief section 9). RLS already limits writes to
// admins; requireAdmin only turns a refusal into a sentence.
// ---------------------------------------------------------------------------

function list(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Create or update a package definition. */
export async function savePackage(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const validityDays = Number(formData.get("validity_days") ?? 0);
  const price = Number(formData.get("price_sgd") ?? 0);

  if (!name) return { ok: false, error: "Give the package a name." };
  if (!["membership", "credits", "dropin", "pt"].includes(kind)) return { ok: false, error: "Pick a kind." };
  if (!Number.isFinite(validityDays) || validityDays < 1) return { ok: false, error: "Validity must be at least a day." };
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Price cannot be negative." };

  const allowed = list(formData.get("allowed_class_types"));
  if (allowed.length === 0 && kind !== "pt") return { ok: false, error: "Pick at least one class type." };

  const fields = {
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    kind,
    tier: String(formData.get("tier") ?? "") || null,
    variant: String(formData.get("variant") ?? "") || null,
    term_months: optionalNumber(formData.get("term_months")),
    validity_days: validityDays,
    credits: optionalNumber(formData.get("credits")),
    price_sgd: price,
    price_per_month: optionalNumber(formData.get("price_per_month")),
    allowed_class_types: allowed,
    fe_credits_included: Number(formData.get("fe_credits_included") ?? 0) || 0,
    cashback_eligible: formData.get("cashback_eligible") === "on",
    perks: list(formData.get("perks")),
    is_active: formData.get("is_active") === "on",
  };

  const { error } = id
    ? await guard.supabase.from("packages").update(fields).eq("id", id)
    : await guard.supabase.from("packages").insert(fields);
  if (error) return { ok: false, error: readableError(error.message, "Could not save that package.") };

  revalidatePath("/admin/packages");
  revalidatePath("/app/profile");
  return { ok: true, message: id ? "Package saved." : "Package created." };
}

/** Retiring a package hides it from new assignments; existing ones keep working. */
export async function setPackageActive(id: string, active: boolean): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("packages").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not change that package.") };

  revalidatePath("/admin/packages");
  return { ok: true, message: active ? "Package is on sale again." : "Package retired." };
}
