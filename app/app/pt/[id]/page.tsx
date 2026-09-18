import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getMyUser } from "@/lib/queries/profile";
import { assertOnboarded } from "@/lib/onboarding";
import { getMyPtSessions } from "@/lib/queries/pt";
import { getMetricsForPtSession, getMyPtMetrics } from "@/lib/queries/health";
import { compareLine, maxHeartRate, summariseSamples } from "@/lib/rules/zones";
import { formatDay, formatDayTime, formatTime, shortVenue } from "@/lib/format";
import { SessionMetrics } from "@/components/member/SessionMetrics";
import { HeartRateTrace } from "@/components/member/HeartRateTrace";

export const metadata = { title: "Your PT session" };

const SOURCE_LABEL = { apple_health: "Apple Health", health_connect: "Health Connect" } as const;

/**
 * A PT session the member attended. The coach's note comes first, because
 * for PT that is the point; then what the wearable saw, compared against the
 * member's previous PT, never against a class.
 */
export default async function PtSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getMyUser();
  const supabase = await createClient();
  const [profile, sessions, metrics, history] = await Promise.all([
    getMyProfile(),
    getMyPtSessions(supabase, user!.id),
    getMetricsForPtSession(supabase, user!.id, id),
    getMyPtMetrics(supabase, user!.id, 40),
  ]);
  assertOnboarded(profile);
  const session = sessions.find((s) => s.id === id);
  if (!session) notFound();

  const maxHr = maxHeartRate(profile?.max_hr);
  const summary = metrics ? summariseSamples(metrics.samples, maxHr) : null;
  const previous = history
    .filter((m) => new Date(m.starts_at) < new Date(session.starts_at))
    .map((m) => ({ m, s: summariseSamples(m.samples, maxHr) }))
    .find((x) => x.s);
  const comparison =
    summary && metrics && previous?.s
      ? compareLine({ avgBpm: summary.avgBpm, hardMinutes: summary.hardMinutes, kcal: metrics.kcal }, { avgBpm: previous.s.avgBpm, hardMinutes: previous.s.hardMinutes, kcal: previous.m.kcal })
      : null;
  const coachFirst = session.coach_name?.split(" ")[0] ?? "Coach";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href="/app/pt" className="display text-base tracking-wide text-muted">
          ‹ PT
        </Link>
        <span className="eyebrow">
          Personal training · {formatDay(session.starts_at)} · {formatTime(session.starts_at)}
          {session.venue_name ? ` · ${shortVenue(session.venue_name)}` : ""}
        </span>
        <h1 className="text-3xl">{session.title ?? (session.status === "no_show" ? "Missed" : "PT session")}</h1>
        <p className="text-sm text-muted">
          {session.coach_name ?? "Coach"} · 60 min · {session.credits_used} PT {session.credits_used === 1 ? "session" : "sessions"}
        </p>
      </div>

      {session.coach_note ? (
        <div className="flex flex-col gap-1.5 border-l-2 border-brand pl-3">
          <p className="text-[16px] leading-relaxed">{session.coach_note}</p>
          <span className="eyebrow">{coachFirst}&apos;s note</span>
        </div>
      ) : (
        <p className="text-sm text-muted">{coachFirst} hasn&apos;t written this one up yet.</p>
      )}

      {metrics && summary ? (
        <>
          <section className="rule flex flex-col gap-2 pt-4">
            <span className="eyebrow">Heart rate</span>
            <HeartRateTrace samples={metrics.samples} maxHr={maxHr} />
          </section>
          <section className="rule pt-4">
            <SessionMetrics summary={summary} kcal={metrics.kcal} />
          </section>
          <section className="rule flex flex-col gap-1 pt-4">
            <span className="eyebrow">{previous ? `Against your last PT, ${formatDayTime(previous.m.starts_at)}` : "First PT with heart rate"}</span>
            <p className="text-sm">{comparison ?? "Strength work reads low with short peaks. That is the shape it should have."}</p>
          </section>
          <p className="pt-2 text-xs text-muted">
            From {SOURCE_LABEL[metrics.source]}
            {metrics.device ? ` · ${metrics.device}` : ""} · max heart rate {maxHr}
            {profile?.max_hr ? "" : " (default)"}
          </p>
        </>
      ) : (
        <section className="rule flex flex-col gap-3 pt-4">
          <p className="text-sm text-muted">No heart-rate data for this session.</p>
          <Link href="/app/account/health" className="display text-lg tracking-wide text-brand">
            {profile?.health_source ? "About connected health →" : "Connect Apple Health or Health Connect →"}
          </Link>
        </section>
      )}
    </div>
  );
}
