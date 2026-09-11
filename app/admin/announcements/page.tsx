import { createClient } from "@/lib/supabase/server";
import { getAllPosts } from "@/lib/queries/posts";
import { PageHeader, StatCard } from "@/components/admin/PageHeader";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";

export const metadata = { title: "Community" };

/**
 * The community feed's composer (brief section 9 "Announcements", extended).
 * Posts replace the Telegram channel: announcements, news, recipes and event
 * photos, each targeted to everyone, a zone or PRIME.
 */
export default async function AdminCommunityPage() {
  const supabase = await createClient();
  const posts = await getAllPosts(supabase);

  const live = posts.filter((p) => p.published_at && !p.archived_at).length;
  const drafts = posts.filter((p) => !p.published_at && !p.archived_at).length;
  const archived = posts.filter((p) => p.archived_at).length;

  return (
    <>
      <PageHeader title="Community" sub="What every Energiser sees in their feed, and the newest one on Home." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="In the feed" value={live} />
        <StatCard label="Drafts" value={drafts} hint={drafts > 0 ? "not visible to members" : undefined} />
        <StatCard label="Archived" value={archived} />
      </div>

      <AnnouncementForm posts={posts} />
    </>
  );
}
