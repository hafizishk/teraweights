"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, readableError } from "@/lib/actions/guard";
import type { ActionResult } from "@/lib/actions/bookings";

const AUDIENCES = ["all", "east", "west", "prime"] as const;

function refresh() {
  revalidatePath("/admin/announcements");
  revalidatePath("/app");
}

/** Create or update. Publishing is a separate, deliberate step. */
export async function saveAnnouncement(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "all");
  const publishNow = formData.get("publish") === "on";

  if (!title) return { ok: false, error: "Give it a title." };
  if (!body) return { ok: false, error: "Write something in the body." };
  if (!(AUDIENCES as readonly string[]).includes(audience)) return { ok: false, error: "Unknown audience." };

  const fields = { title, body, audience };

  if (id) {
    const { error } = await guard.supabase.from("announcements").update(fields).eq("id", id);
    if (error) return { ok: false, error: readableError(error.message, "Could not save that announcement.") };
    refresh();
    return { ok: true, message: "Announcement saved." };
  }

  const { error } = await guard.supabase.from("announcements").insert({
    ...fields,
    created_by: guard.userId,
    published_at: publishNow ? new Date().toISOString() : null,
  });
  if (error) return { ok: false, error: readableError(error.message, "Could not create that announcement.") };

  refresh();
  return { ok: true, message: publishNow ? "Published." : "Saved as a draft." };
}

export async function setAnnouncementPublished(id: string, published: boolean): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("announcements")
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not change that announcement.") };

  refresh();
  return { ok: true, message: published ? "Published. It's on Home now." : "Unpublished." };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not delete that announcement.") };

  refresh();
  return { ok: true, message: "Deleted." };
}
