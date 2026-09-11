import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getCoach, getCoachSessions } from "@/lib/queries/coaches";
import { getSessionCounts } from "@/lib/queries/sessions";
import { Avatar } from "@/components/ui/Avatar";
import { ClassBadge } from "@/components/ui/Badge";
import { formatDay, formatTime, shortVenue } from "@/lib/format";
import { sgtDate, weekOf } from "@/lib/week";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const coach = await getCoach(supabase, id);
  return { title: coach?.full_name ?? "Coach" };
}

/** Which week offset, relative to now, a session falls in, for the Book deep link. */
function weekOffset(startsAt: string, now: Date): number {
  const thisMonday = new Date(weekOf(now).startIso).getTime();
  const thatMonday = new Date(weekOf(new Date(startsAt)).startIso).getTime();
  return Math.round((thatMonday - thisMonday) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * A coach's page: bio, then their upcoming sessions. Each row opens the
 * session in Book with its sheet already up, so booking is one tap away.
 */
export default async function CoachPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);

  const now = new Date();
  const coach = await getCoach(supabase, id, now);
  if (!coach) notFound();

  const sessions = await getCoachSessions(supabase, id, now);
  const counts =
    sessions.length > 0
      ? await getSessionCounts(supabase, sessions[0].starts_at, new Date(new Date(sessions[sessions.length - 1].starts_at).getTime() + 1).toISOString())
      : new Map<string, { booked: number; waitlisted: number }>();

  const byDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const day = sgtDate(s.starts_at);
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/app/coaches" className="text-xs text-muted underline-offset-4 hover:underline">
        ← Coaches
      </Link>

      <header className="flex items-center gap-4">
        <Avatar name={coach.full_name ?? "Coach"} src={coach.avatar_url} size={80} />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[32px] leading-none">{coach.full_name}</h1>
          {coach.staff_title ? <p className="eyebrow">{coach.staff_title}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            {coach.classes.map((slug) => (
              <ClassBadge key={slug} slug={slug} />
            ))}
          </div>
        </div>
      </header>

      {coach.bio ? <p className="text-[16px] leading-relaxed text-paper/90">{coach.bio}</p> : null}

      <section className="flex flex-col gap-1">
        <h2 className="eyebrow pb-1">Upcoming sessions</h2>
        {sessions.length === 0 ? (
          <p className="rule py-8 text-center text-sm text-muted">Nothing on the calendar in the next four weeks.</p>
        ) : (
          [...byDay.entries()].map(([day, list]) => (
            <div key={day} className="rule pt-3">
              <p className="eyebrow pb-1">{formatDay(list[0].starts_at)}</p>
              {list.map((s) => {
                const count = counts.get(s.id) ?? { booked: 0, waitlisted: 0 };
                const left = Math.max(0, s.capacity - count.booked);
                return (
                  <Link
                    key={s.id}
                    href={`/app/book?w=${weekOffset(s.starts_at, now)}&s=${s.id}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className="display tnum w-[88px] text-[26px] leading-none">{formatTime(s.starts_at)}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <ClassBadge slug={s.class_slug} className="w-fit" />
                      <span className="truncate text-sm text-muted">{shortVenue(s.venue_name)}</span>
                    </span>
                    <span className={`text-sm ${left === 0 ? "text-brand" : "text-muted"}`}>
                      {left === 0 ? "Full" : `${left} left`}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
