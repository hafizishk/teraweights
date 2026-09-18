import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assertOnboarded } from "@/lib/onboarding";
import { getActivePackages, getMemberPackages } from "@/lib/queries/packages";
import { trialEligibility } from "@/lib/rules/trial";
import { getMyBookings, getSession, getSessionCounts, getSessionsBetween } from "@/lib/queries/sessions";
import { attendeeLine, attendeePeople, getAttendees, getCommunityPulse } from "@/lib/queries/community";
import { checkinState } from "@/lib/rules/checkin";
import { formatInTimeZone } from "date-fns-tz";
import { TZ, formatMmSs, formatTime, formatWeekday } from "@/lib/format";
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
import { StageNudge } from "@/components/member/StageNudge";
import { PackagesList } from "@/components/member/PackagesList";
import { memberStage } from "@/lib/rules/packs";
import { getMyResults } from "@/lib/queries/results";
import { personalBest } from "@/lib/rules/results";
import { getMyMetrics, getMyPtMetrics, getMyWorkoutsBetween } from "@/lib/queries/health";
import { maxHeartRate, sessionLine, summariseSamples } from "@/lib/rules/zones";
import { YourSessionCard } from "@/components/member/YourSessionCard";
import { WeekActivity, buildWeekDays } from "@/components/member/WeekActivity";
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
  const now = new Date();
  const week = weekOf(now);

  // Round trip one: everything that depends only on who is signed in.
  const [{ data: profile }, packages, allPackages, pulse, weekSessions, weekCounts, { data: bookingRows }, metrics, workouts, ptSessions, ptMetrics] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle<Profile>(),
      getActivePackages(supabase, uid),
      getMemberPackages(supabase, uid),
      getCommunityPulse(supabase),
      getSessionsBetween(supabase, week.startIso, week.endIso),
      getSessionCounts(supabase, week.startIso, week.endIso),
      supabase
        .from("bookings")
        .select("id, status, credits_used, session_id, sessions(starts_at)")
        .eq("member_id", uid)
        .in("status", ["booked", "attended"]),
      getMyMetrics(supabase, uid, 12),
      getMyWorkoutsBetween(supabase, uid, week.startIso, week.endIso),
      getMyPtSessions(supabase, uid),
      getMyPtMetrics(supabase, uid, 12),
    ]);
  assertOnboarded(profile);

  const hasPro = packages.some((p) => p.tier === "pro");
  const trial = trialEligibility(allPackages, now);
  const stage = memberStage(allPackages, now);
  const canBook = packages.some((p) => p.kind !== "pt");

  // The member's live bookings: the next one is the hero, attended ones feed the streak.
  const bookings = ((bookingRows ?? []) as unknown as BookingJoin[]).filter((b) => b.sessions);
  const upcoming = bookings
    .filter((b) => b.status === "booked" && new Date(b.sessions!.starts_at) > now)
    .sort((a, b) => new Date(a.sessions!.starts_at).getTime() - new Date(b.sessions!.starts_at).getTime())[0];

  const ptAttended = ptSessions.filter((s) => s.status === "attended");
  const attendedAt = [...bookings.filter((b) => b.status === "attended").map((b) => b.sessions!.starts_at), ...ptAttended.map((s) => s.starts_at)];
  const streakWeeks = attendanceStreakWeeks(attendedAt, now);
  const trainedThisWeek = sessionsThisWeek(attendedAt, now);

  // Sessions still to come this week, the next booked one included. The next
  // session's id and start are already known from the booking row, so every
  // remaining query can go out at once.
  const remaining = weekSessions.filter((s) => new Date(s.starts_at) > now && s.status === "scheduled");
  const listIds = remaining.map((s) => s.id);
  const attendeeIds = upcoming ? Array.from(new Set([upcoming.session_id, ...listIds])) : listIds;
  const nextOutsideWeek = upcoming && !weekCounts.has(upcoming.session_id) ? upcoming.sessions!.starts_at : null;
  const audiences = ["all", ...(profile?.zone_pref ? [profile.zone_pref] : []), ...(hasPro ? ["prime"] : [])];
  const ptPack = activePtPack(allPackages, now);

  // Round trip two.
  const [nextSession, nextCounts, attendees, myWeekBookings, { data: announcement }, coaches, results, { data: coach }, { data: event }] =
    await Promise.all([
      upcoming ? getSession(supabase, upcoming.session_id) : Promise.resolve(null),
      nextOutsideWeek
        ? getSessionCounts(supabase, nextOutsideWeek, new Date(new Date(nextOutsideWeek).getTime() + 1).toISOString())
        : Promise.resolve(weekCounts),
      getAttendees(supabase, attendeeIds),
      getMyBookings(supabase, uid, listIds),
      supabase
        .from("announcements")
        .select("id, slug, title, body, audience, published_at, author:profiles!announcements_created_by_fkey(full_name, role)")
        .in("audience", audiences)
        .is("archived_at", null)
        .not("published_at", "is", null)
        .lte("published_at", now.toISOString())
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle<AnnouncementJoin>(),
      getCoaches(supabase, now),
      getMyResults(supabase, uid),
      supabase
        .from("coach_assignments")
        .select("id, coach:profiles!coach_assignments_coach_id_fkey(full_name)")
        .eq("member_id", uid)
        .limit(1)
        .maybeSingle<{ id: string; coach: { full_name: string | null } | null }>(),
      supabase
        .from("events")
        .select("id, slug, name, type, event_date")
        .gte("event_date", sgtDate(now))
        .eq("registration_open", true)
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle<{ id: string; slug: string; name: string; type: string; event_date: string }>(),
    ]);

  const nextView =
    nextSession && upcoming
      ? buildSessionView(
          nextSession,
          nextCounts.get(nextSession.id),
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

  const pb = personalBest(results);
  const nextPt = ptSessions.filter((s) => s.status === "booked" && new Date(s.starts_at).getTime() > now.getTime()).pop() ?? null;

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

  // Connected health: the last session the wearable saw, and this week's bars.
  const maxHr = maxHeartRate(profile?.max_hr);
  const summaries = metrics.map((m) => ({ m, s: summariseSamples(m.samples, maxHr) }));
  const last = summaries.find((x) => x.s);
  const monthKey = (iso: string) => formatInTimeZone(new Date(iso), TZ, "yyyy-MM");
  const hardestThisMonth = last
    ? summaries
        .filter((x) => x.s && x.m.class_slug === last.m.class_slug && monthKey(x.m.starts_at) === monthKey(last.m.starts_at))
        .every((x) => x.s!.hardMinutes <= last.s!.hardMinutes)
    : false;
  const kcalBySession = new Map(metrics.map((m) => [m.session_id, m.kcal]));
  const inWeek = (iso: string) => iso >= week.startIso && iso < week.endIso;
  const classesThisWeek = bookings
    .filter((b) => b.status === "attended" && inWeek(b.sessions!.starts_at))
    .map((b) => ({ at: b.sessions!.starts_at, kcal: kcalBySession.get(b.session_id) ?? null }));
  const ptKcal = new Map(ptMetrics.map((m) => [m.pt_session_id, m.kcal]));
  const ptThisWeek = ptAttended.filter((s) => inWeek(s.starts_at)).map((s) => ({ at: s.starts_at, kcal: ptKcal.get(s.id) ?? null }));
  const weekDays = buildWeekDays(
    week,
    classesThisWeek,
    ptThisWeek,
    workouts.map((w) => ({ at: w.started_at, kcal: w.kcal })),
  );
  const nextBookedDay = upcoming && upcoming.sessions!.starts_at < week.endIso ? formatWeekday(upcoming.sessions!.starts_at) : null;

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
        canBook={canBook}
      />

      {last?.s ? (
        <YourSessionCard
          sessionId={last.m.session_id}
          classSlug={last.m.class_slug}
          startsAt={last.m.starts_at}
          summary={last.s}
          kcal={last.m.kcal}
          line={sessionLine(last.s, hardestThisMonth)}
        />
      ) : null}

      <StageNudge stage={stage} trialEligible={trial.eligible} />

      <PulseTiles
        trainedThisWeek={pulse.trainedThisWeek}
        sessionsLeftThisWeek={pulse.sessionsLeftThisWeek}
        daysToEvent={daysToEvent}
        eventShortName={eventShortName}
      />

      {profile?.health_source ? <WeekActivity days={weekDays} label={week.label} nextBookedDay={nextBookedDay} /> : null}

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

      <Link href="/app/parox" className="rule flex items-center justify-between gap-3 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="eyebrow">My PA.ROX</span>
          <span className="display text-[22px] leading-none">
            {pb ? `Personal best ${formatMmSs(pb.totalSeconds)}` : results.length > 0 ? `${results.length} events completed` : "No results yet"}
          </span>
          <span className="text-xs text-muted">
            {pb ? `${pb.eventName} · ${results.length} ${results.length === 1 ? "event" : "events"}` : "Results, splits and your streak"}
          </span>
        </span>
        <span className="text-muted">›</span>
      </Link>

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

      <div id="packages">
        <PackagesList packages={allPackages} weeklyTarget={profile?.weekly_target ?? 3} />
      </div>
    </div>
  );
}
