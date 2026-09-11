import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getMyResults } from "@/lib/queries/results";
import { attendanceStreakWeeks, sessionsThisMonth } from "@/lib/rules/streak";
import { formatDelta, personalBest, withDeltas } from "@/lib/rules/results";
import { formatEventDate, formatMmSs } from "@/lib/format";
import { sgtDate } from "@/lib/week";
import { Scoreboard } from "@/components/ui/Scoreboard";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { EVENT_PHOTO } from "@/lib/photos";

export const metadata = { title: "My PA.ROX" };

export default async function ParoxPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  await requireOnboarded(supabase, uid);
  const now = new Date();

  const [results, { data: attended }, { data: nextParox }] = await Promise.all([
    getMyResults(supabase, uid),
    supabase
      .from("bookings")
      .select("sessions(starts_at)")
      .eq("member_id", uid)
      .eq("status", "attended"),
    supabase
      .from("events")
      .select("slug, name, event_date")
      .eq("type", "parox")
      .eq("registration_open", true)
      .gte("event_date", sgtDate(now))
      .order("event_date", { ascending: true })
      .limit(1)
      .maybeSingle<{ slug: string; name: string; event_date: string }>(),
  ]);

  const attendedAt = ((attended ?? []) as unknown as { sessions: { starts_at: string } | null }[])
    .filter((b) => b.sessions)
    .map((b) => b.sessions!.starts_at);

  const streak = attendanceStreakWeeks(attendedAt, now);
  const thisMonth = sessionsThisMonth(attendedAt, now);
  const pb = personalBest(results);
  const history = withDeltas(results).reverse(); // newest first

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[34px] leading-none">My PA.ROX</h1>

      <Scoreboard
        items={[
          { value: streak, label: "week streak" },
          { value: thisMonth, label: "sessions this month" },
          { value: results.length, label: results.length === 1 ? "event completed" : "events completed" },
        ]}
      />

      {pb ? (
        <section className="-mx-4">
          <DuotonePhoto src={EVENT_PHOTO} className="h-[200px]">
            <div className="flex flex-col gap-1 p-4">
              <span className="eyebrow text-prime">Personal best</span>
              <span className="display tnum text-[64px] leading-[0.88]">{formatMmSs(pb.totalSeconds)}</span>
              <span className="text-sm text-paper/85">
                {pb.eventName} · {formatEventDate(pb.eventDate)}
                {pb.rank ? ` · ${ordinal(pb.rank)} in ${pb.division}` : ""}
              </span>
            </div>
          </DuotonePhoto>
        </section>
      ) : null}

      {history.length === 0 ? (
        <div className="rule flex flex-col gap-2 pt-4">
          <span className="display text-[22px] leading-none">No results yet</span>
          {nextParox ? (
            <>
              <p className="text-sm text-muted">
                Your first PA.ROX is on {formatEventDate(nextParox.event_date)}.
              </p>
              <Link href={`/app/events/${nextParox.slug}`} className="display text-lg tracking-wide text-brand">
                Register →
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted">The next PA.ROX will show up in Events.</p>
          )}
        </div>
      ) : (
        <section>
          <h2 className="pb-1 text-xl">History</h2>
          <ul>
            {history.map((r) => (
              <li key={r.eventId} className="rule">
                <Link href={`/app/parox/${r.eventSlug}`} className="flex items-center gap-3 py-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="display truncate text-[18px] leading-none">{r.eventName}</span>
                    <span className="text-xs text-muted">
                      {formatEventDate(r.eventDate)} · {r.division}
                      {r.rank ? ` · ${ordinal(r.rank)}` : ""}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="display tnum text-[26px] leading-none">
                      {formatMmSs(r.totalSeconds)}
                      {r.isPersonalBest ? <span className="ml-1.5 text-xs text-prime">PB</span> : null}
                    </span>
                    {r.deltaSeconds !== null ? (
                      <span className={`text-xs ${r.deltaSeconds < 0 ? "text-paper" : "text-muted"}`}>
                        {formatDelta(r.deltaSeconds)} vs previous
                      </span>
                    ) : (
                      <span className="text-xs text-muted">first edition</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
