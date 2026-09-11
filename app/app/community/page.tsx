import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getActivePackages } from "@/lib/queries/packages";
import { audiencesFor, getFeed, CATEGORY_LABELS, type PostCategory } from "@/lib/queries/posts";
import { PostCard } from "@/components/member/PostCard";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Community" };

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "announcement", label: "Announcements" },
  { key: "news", label: "News" },
  { key: "recipe", label: "Recipes" },
  { key: "photos", label: "Photos" },
];

/** The feed: what the Telegram channel used to be, one place, in order. */
export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);

  const [{ data: profile }, packages] = await Promise.all([
    supabase.from("profiles").select("zone_pref").eq("id", user!.id).maybeSingle<Pick<Profile, "zone_pref">>(),
    getActivePackages(supabase, user!.id),
  ]);
  const hasPro = packages.some((p) => p.tier === "pro");
  const category = c && c in CATEGORY_LABELS ? (c as PostCategory) : undefined;
  const posts = await getFeed(supabase, audiencesFor(profile?.zone_pref ?? null, hasPro), { category });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">Community</h1>
          <p className="text-sm text-muted">From the coaches and the crew.</p>
        </div>
        <Link href="/app/coaches" className="display text-lg text-brand">
          Coaches →
        </Link>
      </div>

      <nav aria-label="Categories" className="-mx-4 flex gap-4 overflow-x-auto px-4">
        {FILTERS.map((f) => {
          const active = (category ?? "all") === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/app/community" : `/app/community?c=${f.key}`}
              className={`display whitespace-nowrap border-b-2 pb-1 text-lg tracking-wide ${
                active ? "border-brand text-paper" : "border-transparent text-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {posts.length === 0 ? (
        <p className="rule py-8 text-center text-sm text-muted">Nothing here yet. The coaches will be along.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((p, i) => (
            <PostCard key={p.id} post={p} priority={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
