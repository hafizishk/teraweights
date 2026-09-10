import { createClient } from "@/lib/supabase/server";
import {
  AnnouncementForm,
  type AnnouncementRow,
  type Audience,
} from "@/components/admin/AnnouncementForm";
import { PageHeader, StatCard } from "@/components/admin/PageHeader";

export const metadata = { title: "Announcements" };

/** Shape the join comes back in. RLS lets admins read drafts too. */
type AnnouncementSelect = {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  published_at: string | null;
  created_at: string;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

function authorName(profiles: AnnouncementSelect["profiles"]): string | null {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles;
  return profile?.full_name ?? null;
}

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, audience, published_at, created_at, profiles(full_name)")
    .order("created_at", { ascending: false });

  const rows: AnnouncementRow[] = ((data ?? []) as unknown as AnnouncementSelect[]).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience,
    published_at: a.published_at,
    created_at: a.created_at,
    author: authorName(a.profiles),
  }));

  const published = rows.filter((a) => a.published_at !== null).length;

  return (
    <>
      <PageHeader title="Announcements" sub="Broadcast to everyone, or to one zone or tier." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Published" value={published} hint="Live on member Home" />
        <StatCard label="Drafts" value={rows.length - published} hint="Only staff can see these" />
        <StatCard label="Total" value={rows.length} />
      </div>

      <AnnouncementForm announcements={rows} />
    </>
  );
}
