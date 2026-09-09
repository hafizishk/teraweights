import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActivePackages } from "@/lib/queries/packages";
import { getSession } from "@/lib/queries/sessions";
import { buildSessionView } from "@/lib/view/session-view";
import { NextSessionCard } from "@/components/member/NextSessionCard";
import { PackageCards } from "@/components/member/PackageCards";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { sgtDate } from "@/lib/week";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Home" };

type BookingJoin = {
  id: string;
  status: "booked";
  credits_used: number;
  session_id: string;
  sessions: { starts_at: string } | null;
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  const now = new Date();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle<Profile>();

  const packages = await getActivePackages(supabase, uid);
  const hasPro = packages.some((p) => p.tier === "pro");

  // Next booked session.
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id, status, credits_used, session_id, sessions(starts_at)")
    .eq("member_id", uid)
    .eq("status", "booked");

  const upcoming = ((bookingRows ?? []) as unknown as BookingJoin[])
    .filter((b) => b.sessions && new Date(b.sessions.starts_at) > now)
    .sort((a, b) => new Date(a.sessions!.starts_at).getTime() - new Date(b.sessions!.starts_at).getTime())[0];

  const nextSession = upcoming ? await getSession(supabase, upcoming.session_id) : null;
  const nextView = nextSession
    ? buildSessionView(
        nextSession,
        undefined,
        {
          id: upcoming.id,
          session_id: upcoming.session_id,
          status: "booked",
          entitlement: null,
          credits_used: upcoming.credits_used,
          checked_in_at: null,
        },
        packages,
        now,
      )
    : null;

  // Latest announcement for this member's audience.
  const audiences = ["all", ...(profile?.zone_pref ? [profile.zone_pref] : []), ...(hasPro ? ["prime"] : [])];
  const { data: announcement } = await supabase
    .from("announcements")
    .select("id, title, body, published_at")
    .in("audience", audiences)
    .not("published_at", "is", null)
    .lte("published_at", now.toISOString())
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; title: string; body: string; published_at: string }>();

  // Assigned coach, if any.
  const { data: coach } = await supabase
    .from("coach_assignments")
    .select("id, coach:profiles!coach_assignments_coach_id_fkey(full_name)")
    .eq("member_id", uid)
    .limit(1)
    .maybeSingle<{ id: string; coach: { full_name: string | null } | null }>();

  // Next upcoming event.
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, name, event_date, partner_line, is_free, price_sgd, registration_open")
    .gte("event_date", sgtDate(now))
    .eq("registration_open", true)
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle<{
      id: string;
      slug: string;
      name: string;
      event_date: string;
      partner_line: string | null;
      is_free: boolean;
    }>();

  const firstName = profile?.full_name?.split(" ")[0] ?? "Energiser";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">Hey {firstName}</p>

      {nextView ? (
        <NextSessionCard view={nextView} />
      ) : (
        <Card className="flex flex-col gap-3">
          <CardTitle>No session booked</CardTitle>
          <p className="text-sm text-muted">Your week is open. Pick a session and lock it in.</p>
          <Link href="/app/book" className="display text-lg text-brand">
            Book a session →
          </Link>
        </Card>
      )}

      <PackageCards packages={packages} />

      {announcement ? (
        <Card className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-muted">Latest</p>
          <CardTitle>{announcement.title}</CardTitle>
          <p className="text-sm text-muted">{announcement.body}</p>
        </Card>
      ) : null}

      {coach?.coach?.full_name ? (
        <Card className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest text-muted">My coach</p>
          <CardTitle>{coach.coach.full_name}</CardTitle>
          <p className="text-sm text-muted">Next PT session: contact your coach.</p>
        </Card>
      ) : null}

      {event ? (
        <Card className="flex flex-col gap-2 border-prime/40">
          <p className="text-xs uppercase tracking-widest text-prime">Next event</p>
          <CardTitle>{event.name}</CardTitle>
          <p className="text-sm text-muted">
            {formatDate(`${event.event_date}T00:00:00+08:00`)}
            {event.partner_line ? ` · ${event.partner_line}` : ""}
          </p>
          <Link href={`/app/events`} className="display text-lg text-brand">
            {event.is_free ? "Free · Register →" : "Register →"}
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
