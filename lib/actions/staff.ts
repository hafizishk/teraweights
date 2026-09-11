"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, readableError } from "@/lib/actions/guard";
import { STAFF_ROLES, type Role } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/bookings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isStaffRole(value: string): value is Role {
  return (STAFF_ROLES as string[]).includes(value);
}

function refresh(id?: string) {
  revalidatePath("/admin/staff");
  revalidatePath("/admin/members");
  if (id) revalidatePath(`/admin/members/${id}`);
}

/**
 * Invites someone who has not signed in yet. `admin_allowlist` is read by
 * handle_new_user() on first sign-in, so the role is waiting for them rather
 * than needing a second step once they arrive.
 */
export async function inviteStaff(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (!EMAIL_RE.test(email)) return { ok: false, error: "That does not look like an email address." };
  if (!isStaffRole(role)) return { ok: false, error: "Pick a staff role." };

  const { data: existing } = await guard.supabase
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle<{ id: string }>();

  if (existing) {
    const { error } = await guard.supabase.from("profiles").update({ role }).eq("id", existing.id);
    if (error) return { ok: false, error: readableError(error.message, "Could not change that role.") };
    refresh(existing.id);
    return { ok: true, message: "They already had an account, so the role was applied straight away." };
  }

  const { error } = await guard.supabase
    .from("admin_allowlist")
    .upsert({ email, role }, { onConflict: "email" });
  if (error) return { ok: false, error: readableError(error.message, "Could not send that invite.") };

  refresh();
  return { ok: true, message: `${email} becomes ${role.replace("_", " ")} when they first sign in.` };
}

export async function cancelInvite(email: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("admin_allowlist").delete().eq("email", email);
  if (error) return { ok: false, error: readableError(error.message, "Could not cancel that invite.") };

  refresh();
  return { ok: true, message: "Invite cancelled." };
}

/**
 * The job title shown beside their name, and the bio members read on the
 * coaches page. Display only; permissions follow the role.
 */
export async function setStaffProfile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("staff_title") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  if (!id) return { ok: false, error: "Missing staff member." };
  if (bio.length > 600) return { ok: false, error: "Keep the bio under 600 characters." };

  const { error } = await guard.supabase
    .from("profiles")
    .update({ staff_title: title || null, bio: bio || null })
    .eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not save that profile.") };

  refresh(id);
  revalidatePath("/app/coaches");
  revalidatePath(`/app/coaches/${id}`);
  return { ok: true, message: "Saved." };
}

/** Takes someone off the staff. Their bookings and history are untouched. */
export async function removeStaff(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  if (id === guard.userId) return { ok: false, error: "You cannot remove yourself." };

  const { data: profile } = await guard.supabase
    .from("profiles")
    .select("email")
    .eq("id", id)
    .maybeSingle<{ email: string | null }>();

  const { error } = await guard.supabase
    .from("profiles")
    .update({ role: "member", staff_title: null })
    .eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not remove that staff member.") };

  // Otherwise the allowlist would put the role straight back on next sign-in.
  if (profile?.email) await guard.supabase.from("admin_allowlist").delete().eq("email", profile.email.toLowerCase());

  refresh(id);
  return { ok: true, message: "Removed from staff. They keep their member account." };
}
