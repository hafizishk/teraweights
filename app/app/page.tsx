import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getActivePackages, getMemberPackages } from "@/lib/queries/packages";
import { trialEligibility } from "@/lib/rules/trial";
import { getMyBookings, getSession, getSessionCounts, getSessionsBetween } from "@/lib/queries/sessions";
import { attendeeLine, attendeePeople, getAttendees, getCommunityPulse } from "@/lib/queries/community";
import { checkinState } from "@/lib/rules/checkin";
import { formatInTimeZone } from "date-fns-tz";
import { TZ, formatTime, formatWeekday } from "@/lib/format";
import { buildSessionView } from "@/lib/view/session-view";
import { attendanceStreakWeeks, sessionsThisWeek } from "@/lib/rules/streak";
import { sgtDate, sgtMidnight, weekOf } from "@/lib/week";
import { HomeHero } from "@/components/member/HomeHero";
import { PulseTiles } from "@/components/member/PulseTiles";
import { WhoIsTraining, type TrainingRow } from "@/components/member/WhoIsTraining";
import { CoachPost, type Post } from "@/components/member/CoachPost";
import { AvatarRow } from "@/components/ui/Avatar";
import { getCoaches } from "@/lib/queries/coaches";
import { activePtPack, getMyPtSessions } from "@/lib/queries/pt";
import { MembershipBar } from "@/components/member/MembershipBar";
import { PackagesList } from "@/components/member/PackagesList";
import type { Profile, Role } from "@/lib/types";

export const metadata = { title: "You" };

type BookingJoin = {
  id: string;
  status: "booked" | "attended";
  credits_used: number;
  session_id: string;
  sessions: { starts_at: string } | null;
};

type AnnouncementJoin = {
  id: string;
  slug: string;
  title: string;
  body: string;
  audience: Post["audience"];
  published_at: string;
  author: { full_name: string | null; role: Role } | null;
};

/**
 * The You tab, which is also the landing screen: your next session and
 * streak, the community pulse, the latest post, then the places and packages
 * that are yours. Name, photo and settings live under Account in the header.
 */
export default async function YouPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  await requireOnboarded(supabase, uid);
  const now = new Date();
  const week = weekOf(now);

  const [{ data: profile }, packages, allPackages, pulse, weekSessions, weekCounts] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle<Profile>(),
    getActivePackages(supabase, uid),
    getMemberPackages(supabase, uid),
    getCommunityPulse(supabase),
    getSessionsBetween(supabase, week.startIso, week.endIso),
    getSessionCounts(supabase, week.startIso, week.endIso),
  ]);
  const hasPro = packages.some((p) => p.tier === "pro");
  const trial = trialEligibility(allPackages, now);

  // The member's live bookings: the next one is the hero, attended ones feed the streak.
  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("id, status, credits_used, session_id, sessions(starts_at)")
    .eq("member_id", uid)
    .in("status", ["booked", "attended"]);
  const bookings = ((bookingRows ?? []) as unknown as BookingJoin[]).filter((b) => b.sessions);

  const upcoming = bookings
    .filter((b) => b.status === "booked" && new Date(b.sessions!.starts_at) > now)
    .sort((a, b) => new Date(a.sessions!.starts_at).getTime() - new Date(b.sessions!.starts_at).getTime())[0];

  const attendedAt = bookings.filter((b) => b.status === "attended").map((b) => b.sessions!.starts_at);
  const streakWeeks = attendanceStreakWeeks(attendedAt, now);
  const trainedThisWeek = sessionsThisWeek(attendedAt, now);

  const nextSession = upcoming ? await getSession(supabase, upcoming.session_id) : null;

  // Sessions still to come this week, the next booked one included.
  const remaining = weekSessions.filter((s) => new Date(s.starts_at) > now && s.status === "scheduled");
  const listIds = remaining.map((s) => s.id);
  const attendeeIds = nextSession ? Array.from(new Set([nextSession.id, ...listIds])) : listIds;

  const [attendees, myWeekBookings] = await Promise.all([
    getAttendees(supabase, attendeeIds),
    getMyBookings(supabase, uid, listIds),
  ]);

  const nextView = nextSession
    ? buildSessionView(
        nextSession,
        weekCounts.get(nextSession.id) ?? (await getSessionCounts(supabase, nextSession.starts_at, new Date(new Date(nextSession.starts_at).getTime() + 1).toISOString())).get(nextSession.id),
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

  const heroAttendees = nextSession ? (attendees.get(nextSession.id) ?? []) : [];
  const heroPeople = attendeePeople(heroAttendees, uid);
  const checkinOpen = nextSession ? checkinState(nextSession, now) === "open" : false;

  function isUsual(startsAt: string): boolean {
    const pref = profile?.preferred_time;
    if (!pref || pref === "either") return false;
    const hour = Number(formatInTimeZone(new Date(startsAt), TZ, "H"));
    return pref === "morning" ? hour < 12 : hour >= 12;
  }

  const rows: TrainingRow[] = remaining
    .filter((s) => s.id !== nextSession?.id)
    .slice(0, 4)
    .map((s) => ({
      view: buildSessionView(s, weekCounts.get(s.id), myWeekBookings.get(s.id), packages, now),
      people: attendeePeople(attendees.get(s.id) ?? [], uid),
      usual: isUsual(s.starts_at),
    }));

  // Latest announcement for this member's audience, with its author.
  const audiences = ["all", ...(profile?.zone_pref ? [profile.zone_pref] : []), ...(hasPro ? ["prime"] : [])];
  const { data: announcement } = await supabase
    .from("announcements")
    .select("id, slug, title, body, audience, published_at, author:profiles!announcements_created_by_fkey(full_name, role)")
    .in("audience", audiences)
    .is("archived_at", null)
    .not("published_at", "is", null)
    .lte("published_at", now.toISOString())
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle<AnnouncementJoin>();

  const coaches = await getCoaches(supabase, now);
  const ptPack = activePtPack(allPackages, now);
  const ptSessions = ptPack ? await getMyPtSessions(supabase, uid) : [];
  const nextPt = ptSessions.filter((s) => s.status === "booked" && new Date(s.starts_at).getTime() > now.getTime()).pop() ?? null;

  // Assigned coach, if any.
  const { data: coach } = await supabase
    .from("coach_assignments")
    .select("id, coach:profiles!coach_assignments_coach_id_fkey(full_name)")
    .eq("member_id", uid)
    .limit(1)
    .maybeSingle<{ id: string; coach: { full_name: string | null } | null }>();

  // Next upcoming event, for the countdown tile.
  const { data: event } = await supabase
    .from("events")
    .select("id, slug, name, type, event_date")
    .gte("event_date", sgtDate(now))
    .eq("registration_open", true)
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string; slug: string; name: string; type: string; event_date: string }>();

  const daysToEvent = event
    ? Math.max(0, Math.round((sgtMidnight(event.event_date).getTime() - sgtMidnight(sgtDate(now)).getTime()) / 86_400_000))
    : null;
  const eventShortName = event
    ? event.type === "parox"
      ? "PA.ROX"
      : event.type === "kampung_grind"
        ? "Kampung Grind"
        : event.name.split(" ").slice(0, 3).join(" ")
    : null;

  const firstName = profile?.full_name?.split(" ")[0] ?? "Energiser";

  return (
    <div className="flex flex-col gap-5">
      <HomeHero
        firstName={firstName}
        streakWeeks={streakWeeks}
        sessionsThisWeek={trainedThisWeek}
        weeklyTarget={profile?.weekly_target ?? 3}
        view={nextView}
        people={heroPeople}
        attendeeLine={nextView ? attendeeLine(heroAttendees, uid, nextView.bookedCount) : ""}
        checkinOpen={checkinOpen}
      />

      <PulseTiles
        trainedThisWeek={pulse.trainedThisWeek}
        sessionsLeftThisWeek={pulse.sessionsLeftThisWeek}
        daysToEvent={daysToEvent}
        eventShortName={eventShortName}
      />

      <WhoIsTraining rows={rows} weekLabel="This week" />

      {announcement ? (
        <CoachPost
          post={{
            id: announcement.id,
            slug: announcement.slug,
            title: announcement.title,
            body: announcement.body,
            audience: announcement.audience,
            publishedAt: announcement.published_at,
            authorName: announcement.author?.full_name ?? null,
            authorRole: announcement.author?.role ?? null,
          }}
        />
      ) : null}

      {coaches.length > 0 ? (
        <Link href="/app/coaches" className="rule flex items-center gap-3 py-3">
          <AvatarRow people={coaches.map((c) => ({ name: c.full_name ?? "Coach", src: c.avatar_url ?? undefined }))} />
          <span className="flex flex-1 flex-col">
            <span className="display text-[20px] leading-none">The coaches</span>
            <span className="text-xs text-muted">Who runs what, and when they are on next</span>
          </span>
          <span className="text-muted">›</span>
        </Link>
      ) : null}

      {ptPack || coach?.coach?.full_name ? (
        <Link href="/app/pt" className="rule flex items-center gap-3 py-3">
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="eyebrow">Personal training</span>
            <span className="display text-[22px] leading-none">
              {nextPt ? `Next PT ${formatWeekday(nextPt.starts_at)} ${formatTime(nextPt.starts_at)}` : ptPack ? `${ptPack.credits_remaining ?? 0} sessions on your pack` : `Coach: ${coach?.coach?.full_name}`}
            </span>
            <span className="text-xs text-muted">
              {nextPt ? `with ${nextPt.coach_name}` : ptPack ? "Book one into your coach's open hours" : "Ask about a PT pack"}
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>
      ) : (
        <Link href="/app/pt" className="rule flex items-center justify-between py-3 text-sm text-muted">
          <span>Personal training, one to one</span>
          <span className="display text-lg text-brand">See PT packs →</span>
        </Link>
      )}

      {packages.length === 0 ? <MembershipBar packages={packages} trialEligible={trial.eligible} /> : null}

      {allPackages.length > 0 ? (
        <div id="packages">
          <PackagesList packages={allPackages} weeklyTarget={profile?.weekly_target ?? 3} />
        </div>
      ) : null}
    </div>
  );
}
