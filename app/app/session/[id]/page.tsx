import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getMyUser } from "@/lib/queries/profile";
import { assertOnboarded } from "@/lib/onboarding";
import { getSession } from "@/lib/queries/sessions";
import { getMetricsForSession, getMyMetrics } from "@/lib/queries/health";
import { compareLine, maxHeartRate, summariseSamples } from "@/lib/rules/zones";
import { formatDay, formatTime, shortVenue } from "@/lib/format";
import { ClassBadge } from "@/components/ui/Badge";
import { SessionMetrics } from "@/components/member/SessionMetrics";
import { HeartRateTrace } from "@/components/member/HeartRateTrace";

export const metadata = { title: "Your session" };

const SOURCE_LABEL = { apple_health: "Apple Health", health_connect: "Health Connect" } as const;

/**
 * A session the member attended, with what the wearable saw. Reached from
 * the Your session card on You. No ratings, no comments: the numbers and
 * how they compare to the last session of the same class.
 */
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getMyUser();
  const supabase = await createClient();
  const [profile, session, metrics, history] = await Promise.all([
    getMyProfile(),
    getSession(supabase, id),
    getMetricsForSession(supabase, user!.id, id),
    getMyMetrics(supabase, user!.id, 40),
  ]);
  assertOnboarded(profile);
  if (!session) notFound();

  const maxHr = maxHeartRate(profile?.max_hr);
  const summary = metrics ? summariseSamples(metrics.samples, maxHr) : null;
  const previous = history
    .filter((m) => m.class_slug === session.class_slug && new Date(m.starts_at) < new Date(session.starts_at))
    .map((m) => ({ m, s: summariseSamples(m.samples, maxHr) }))
    .find((x) => x.s);
  const comparison =
    summary && metrics && previous?.s
      ? compareLine({ avgBpm: summary.avgBpm, hardMinutes: summary.hardMinutes, kcal: metrics.kcal }, { avgBpm: previous.s.avgBpm, hardMinutes: previous.s.hardMinutes, kcal: previous.m.kcal })
      : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Link href="/app" className="display text-base tracking-wide text-muted">
          ‹ You
        </Link>
        <div className="flex items-center gap-2">
          <ClassBadge slug={session.class_slug} />
          <span className="eyebrow">
            {formatDay(session.starts_at)} · {formatTime(session.starts_at)} · {shortVenue(session.venue_name)}
          </span>
        </div>
        <h1 className="text-3xl">{session.class_name}</h1>
        <p className="text-sm text-muted">
          {session.coach_name ? `Coach ${session.coach_name.split(" ")[0]}` : "Teraweights"}
          {metrics?.checked_in_at ? ` · checked in ${formatTime(metrics.checked_in_at)}` : ""}
        </p>
      </div>

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
            <span className="eyebrow">{previous ? `Against your last ${session.class_name}` : "First one with heart rate"}</span>
            <p className="text-sm">{comparison ?? `${summary.hardMinutes} minutes above 80% of your max.`}</p>
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
