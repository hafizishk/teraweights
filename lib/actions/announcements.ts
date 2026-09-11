"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, readableError } from "@/lib/actions/guard";
import type { ActionResult } from "@/lib/actions/bookings";

const AUDIENCES = ["all", "east", "west", "prime"] as const;
const CATEGORIES = ["announcement", "news", "recipe", "photos"] as const;

function refresh(slug?: string) {
  revalidatePath("/admin/announcements");
  revalidatePath("/app");
  revalidatePath("/app/community");
  if (slug) revalidatePath(`/app/community/${slug}`);
}

/** Only URLs from our own storage bucket or the app's own photos are stored. */
function imageUrl(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("/photos/")) return v;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (base && v.startsWith(`${base}/storage/v1/object/public/posts/`)) return v;
  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Create or update a post. Publishing is a separate, deliberate step, and
 * the slug is fixed at creation so a shared link never breaks on a retitle.
 */
export async function saveAnnouncement(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "all");
  const category = String(formData.get("category") ?? "announcement");
  const publishNow = formData.get("publish") === "on";
  const cover = imageUrl(String(formData.get("cover_url") ?? ""));

  let images: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("images") ?? "[]")) as unknown;
    if (Array.isArray(parsed)) {
      images = parsed.map((v) => imageUrl(String(v))).filter((v): v is string => v !== null).slice(0, 24);
    }
  } catch {
    return { ok: false, error: "The gallery list was malformed. Reload and try again." };
  }

  if (!title) return { ok: false, error: "Give it a title." };
  if (!body) return { ok: false, error: "Write something in the body." };
  if (!(AUDIENCES as readonly string[]).includes(audience)) return { ok: false, error: "Unknown audience." };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: "Unknown category." };

  const fields = { title, body, audience, category, cover_url: cover, images };

  if (id) {
    const { data, error } = await guard.supabase
      .from("announcements")
      .update(fields)
      .eq("id", id)
      .select("slug")
      .maybeSingle<{ slug: string }>();
    if (error) return { ok: false, error: readableError(error.message, "Could not save that post.") };
    refresh(data?.slug);
    return { ok: true, message: "Post saved." };
  }

  // The database trigger also derives a slug; passing one keeps the retry
  // loop here rather than surfacing a unique-violation to the admin.
  let slug = slugify(title) || "post";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await guard.supabase.from("announcements").insert({
      ...fields,
      slug,
      created_by: guard.userId,
      published_at: publishNow ? new Date().toISOString() : null,
    });
    if (!error) {
      refresh(slug);
      return { ok: true, message: publishNow ? "Published. It's in the feed now." : "Saved as a draft." };
    }
    if (error.code !== "23505") return { ok: false, error: readableError(error.message, "Could not create that post.") };
    slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return { ok: false, error: "Could not find a free link for that title. Try a different one." };
}

export async function setAnnouncementPublished(id: string, published: boolean): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { data, error } = await guard.supabase
    .from("announcements")
    .update({ published_at: published ? new Date().toISOString() : null })
    .eq("id", id)
    .select("slug")
    .maybeSingle<{ slug: string }>();
  if (error) return { ok: false, error: readableError(error.message, "Could not change that post.") };

  refresh(data?.slug);
  return { ok: true, message: published ? "Published. It's in the feed now." : "Unpublished." };
}

/** Archiving takes a post out of the feed without losing it. */
export async function setAnnouncementArchived(id: string, archived: boolean): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { data, error } = await guard.supabase
    .from("announcements")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("slug")
    .maybeSingle<{ slug: string }>();
  if (error) return { ok: false, error: readableError(error.message, "Could not change that post.") };

  refresh(data?.slug);
  return { ok: true, message: archived ? "Archived." : "Back in the feed." };
}

/** Kept for a draft that was never worth keeping. Published posts archive instead. */
export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;

  const { data: existing } = await guard.supabase
    .from("announcements")
    .select("published_at")
    .eq("id", id)
    .maybeSingle<{ published_at: string | null }>();
  if (existing?.published_at) {
    return { ok: false, error: "That post has been published. Archive it instead, so links keep working." };
  }

  const { error } = await guard.supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: readableError(error.message, "Could not delete that draft.") };

  refresh();
  return { ok: true, message: "Draft deleted." };
}
