"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, readableError } from "@/lib/actions/guard";
import type { ActionResult } from "@/lib/actions/bookings";
import type { Role } from "@/lib/types";

function refresh(memberId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/app");
  revalidatePath("/app/profile");
  revalidatePath("/app/book");
}

/**
 * Gives a member a package. Expiry is derived from the package's validity, and
 * credits are seeded from its definition, so the admin picks one thing.
 */
export async function assignPackage(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const memberId = String(formData.get("member_id") ?? "");
  const packageId = String(formData.get("package_id") ?? "");
  const paid = String(formData.get("payment_status") ?? "pending") === "paid";
  const paymentRef = String(formData.get("payment_ref") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  if (!memberId || !packageId) return { ok: false, error: "Pick a package." };

  const { data: pkg, error: pkgError } = await guard.supabase
    .from("packages")
    .select("name, kind, validity_days, credits, fe_credits_included, is_trial")
    .eq("id", packageId)
    .maybeSingle<{
      name: string;
      kind: "membership" | "credits" | "dropin" | "pt";
      validity_days: number;
      credits: number | null;
      fe_credits_included: number;
      is_trial: boolean;
    }>();
  if (pkgError || !pkg) return { ok: false, error: "That package no longer exists." };

  const start = /^\d{4}-\d{2}-\d{2}$/.test(startsAt) ? new Date(`${startsAt}T00:00:00+08:00`) : new Date();
  const expires = new Date(start.getTime() + pkg.validity_days * 24 * 60 * 60 * 1000);

  const { error } = await guard.supabase.from("member_packages").insert({
    member_id: memberId,
    package_id: packageId,
    kind: pkg.kind,
    starts_at: start.toISOString(),
    expires_at: expires.toISOString(),
    credits_total: pkg.credits,
    credits_remaining: pkg.credits,
    fe_credits_remaining: pkg.fe_credits_included,
    payment_status: paid ? "paid" : "pending",
    payment_ref: paymentRef || null,
    recorded_by: guard.userId,
    is_trial: pkg.is_trial,
  });
  if (error) return { ok: false, error: readableError(error.message, "Could not assign that package.") };

  refresh(memberId);
  return { ok: true, message: `${pkg.name} assigned${paid ? " and marked paid" : ""}.` };
}

/** The PayNow fallback: a package becomes active once payment is recorded. */
export async function recordPayment(
  memberPackageId: string,
  memberId: string,
  reference: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("member_packages")
    .update({
      payment_status: "paid",
      payment_ref: reference.trim() || null,
      recorded_by: guard.userId,
    })
    .eq("id", memberPackageId);
  if (error) return { ok: false, error: readableError(error.message, "Could not record that payment.") };

  refresh(memberId);
  return { ok: true, message: "Payment recorded. The package is active." };
}

/** Credit adjustment with a reason (admin_adjust_credits keeps the audit row). */
export async function adjustCredits(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const memberId = String(formData.get("member_id") ?? "");
  const memberPackageId = String(formData.get("member_package_id") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  const kind = String(formData.get("kind") ?? "credit");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!memberPackageId) return { ok: false, error: "Pick a package." };
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, error: "Enter a whole number, positive or negative." };
  if (!reason) return { ok: false, error: "A reason is required." };

  const { data, error } = await guard.supabase.rpc("admin_adjust_credits", {
    p_member_package_id: memberPackageId,
    p_delta: delta,
    p_reason: reason,
    p_kind: kind === "fe_credit" ? "fe_credit" : "credit",
  });
  if (error) return { ok: false, error: readableError(error.message, "Could not adjust credits.") };

  refresh(memberId);
  return { ok: true, message: `Balance is now ${data as number}.` };
}

export async function assignCoach(memberId: string, coachId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("coach_assignments")
    .upsert({ member_id: memberId, coach_id: coachId }, { onConflict: "member_id,coach_id" });
  if (error) return { ok: false, error: readableError(error.message, "Could not assign that coach.") };

  refresh(memberId);
  return { ok: true, message: "Coach assigned." };
}

export async function removeCoach(memberId: string, coachId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("coach_assignments")
    .delete()
    .eq("member_id", memberId)
    .eq("coach_id", coachId);
  if (error) return { ok: false, error: readableError(error.message, "Could not remove that coach.") };

  refresh(memberId);
  return { ok: true, message: "Coach removed." };
}

export async function setRole(memberId: string, role: Role): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  if (memberId === guard.userId) return { ok: false, error: "You cannot change your own role." };
  if (!["member", "coach", "event_assistant", "admin"].includes(role)) return { ok: false, error: "Unknown role." };

  const { error } = await guard.supabase.from("profiles").update({ role }).eq("id", memberId);
  if (error) return { ok: false, error: readableError(error.message, "Could not change that role.") };

  refresh(memberId);
  return { ok: true, message: `Role changed to ${role.replace("_", " ")}.` };
}
