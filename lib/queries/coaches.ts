import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassSlug } from "@/lib/types";
import { getSessionsBetween, type SessionRow } from "@/lib/queries/sessions";

/**
 * Coaches on the member side. Any signed-in member can read staff display
 * rows ("profiles: staff visible"); sessions are public. Nothing here needs a
 * definer function.
 */

export type CoachRow = {
  id: string;
  full_name: string | null;
  staff_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  /** Class types they run in the coming weeks, most frequent first. */
  classes: ClassSlug[];
  next_session: SessionRow | null;
};

const HORIZON_DAYS = 28;

/** Coaches who run sessions, with what they coach next. Admins who coach count too. */
export async function getCoaches(supabase: SupabaseClient, now = new Date()): Promise<CoachRow[]> {
  const to = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const [{ data: staff }, sessions] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, staff_title, bio, avatar_url, role")
      .in("role", ["coach", "admin"])
      .order("full_name"),
    getSessionsBetween(supabase, now.toISOString(), to.toISOString()),
  ]);

  const upcoming = sessions.filter((s) => s.status === "scheduled");

  return ((staff ?? []) as { id: string; full_name: string | null; staff_title: string | null; bio: string | null; avatar_url: string | null; role: string }[])
    .map((p) => {
      const mine = upcoming.filter((s) => s.coach_id === p.id);
      const counts = new Map<ClassSlug, number>();
      for (const s of mine) counts.set(s.class_slug, (counts.get(s.class_slug) ?? 0) + 1);
      const classes = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
      return {
        id: p.id,
        full_name: p.full_name,
        staff_title: p.staff_title,
        bio: p.bio,
        avatar_url: p.avatar_url,
        classes,
        next_session: mine[0] ?? null,
      };
    })
    // An admin who never coaches is not a coach to members.
    .filter((c) => c.classes.length > 0 || c.bio);
}

export async function getCoach(supabase: SupabaseClient, id: string, now = new Date()) {
  const all = await getCoaches(supabase, now);
  return all.find((c) => c.id === id) ?? null;
}

/** A coach's upcoming sessions, for their page. */
export async function getCoachSessions(supabase: SupabaseClient, coachId: string, now = new Date()): Promise<SessionRow[]> {
  const to = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const sessions = await getSessionsBetween(supabase, now.toISOString(), to.toISOString());
  return sessions.filter((s) => s.coach_id === coachId && s.status === "scheduled");
}
