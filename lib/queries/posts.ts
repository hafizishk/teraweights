import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";

/**
 * Community feed reads. RLS returns only published, unarchived rows to a
 * member, and everything to an admin, so the same queries serve both.
 */

export type PostCategory = "announcement" | "news" | "recipe" | "photos";
export type PostAudience = "all" | "east" | "west" | "prime";

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  announcement: "Announcement",
  news: "News",
  recipe: "Recipe",
  photos: "Photos",
};

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  category: PostCategory;
  audience: PostAudience;
  cover_url: string | null;
  images: string[];
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  author_name: string | null;
  author_role: Role | null;
};

type PostJoin = Omit<PostRow, "author_name" | "author_role"> & {
  author: { full_name: string | null; role: Role } | { full_name: string | null; role: Role }[] | null;
};

const SELECT =
  "id, slug, title, body, category, audience, cover_url, images, published_at, archived_at, created_at, " +
  "author:profiles!announcements_created_by_fkey(full_name, role)";

function toRow(r: PostJoin): PostRow {
  const author = Array.isArray(r.author) ? r.author[0] : r.author;
  const { author: _a, ...rest } = r;
  void _a;
  return { ...rest, images: rest.images ?? [], author_name: author?.full_name ?? null, author_role: author?.role ?? null };
}

/** Audiences a member should see: everyone, their zone, and PRIME if they hold PRO. */
export function audiencesFor(zone: "east" | "west" | null, hasPro: boolean): PostAudience[] {
  return ["all", ...(zone ? [zone] : []), ...(hasPro ? (["prime"] as PostAudience[]) : [])];
}

/** The feed, newest first. */
export async function getFeed(
  supabase: SupabaseClient,
  audiences: PostAudience[],
  { limit = 30, category }: { limit?: number; category?: PostCategory } = {},
): Promise<PostRow[]> {
  let query = supabase
    .from("announcements")
    .select(SELECT)
    .in("audience", audiences)
    .is("archived_at", null)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (category) query = query.eq("category", category);
  const { data } = await query;
  return ((data ?? []) as unknown as PostJoin[]).map(toRow);
}

export async function getPostBySlug(supabase: SupabaseClient, slug: string): Promise<PostRow | null> {
  const { data } = await supabase.from("announcements").select(SELECT).eq("slug", slug).maybeSingle();
  return data ? toRow(data as unknown as PostJoin) : null;
}

/** Every post, drafts and archived included. Admin only in practice, by RLS. */
export async function getAllPosts(supabase: SupabaseClient): Promise<PostRow[]> {
  const { data } = await supabase.from("announcements").select(SELECT).order("created_at", { ascending: false });
  return ((data ?? []) as unknown as PostJoin[]).map(toRow);
}
