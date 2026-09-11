import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getMyResults } from "@/lib/queries/results";
import { formatDelta, withDeltas } from "@/lib/rules/results";
import { formatEventDate, formatMmSs } from "@/lib/format";
import { SplitsBars } from "@/components/member/SplitsBars";

export const metadata = { title: "Station splits" };

export default async function ParoxResultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);

  const results = await getMyResults(supabase, user!.id);
  const rows = withDeltas(results);
  const row = rows.find((r) => r.eventSlug === slug);
  if (!row) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link href="/app/parox" className="eyebrow hover:text-paper">
        ← My PA.ROX
      </Link>

      <div className="flex flex-col gap-1">
        <span className="eyebrow">
          {formatEventDate(row.eventDate)} · {row.division}
          {row.rank ? ` · rank ${row.rank}` : ""}
        </span>
        <h1 className="text-[34px] leading-[0.92]">{row.eventName}</h1>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="display tnum text-[64px] leading-[0.88]">{formatMmSs(row.totalSeconds)}</span>
          {row.isPersonalBest ? <span className="display text-lg text-prime">PB</span> : null}
          {row.deltaSeconds !== null ? (
            <span className="text-sm text-muted">{formatDelta(row.deltaSeconds)} vs previous</span>
          ) : null}
        </div>
      </div>

      {row.splits && row.splits.length > 0 ? (
        <section>
          <h2 className="pb-1 text-xl">Station splits</h2>
          <SplitsBars splits={row.splits} />
        </section>
      ) : (
        <p className="rule py-6 text-sm text-muted">No station splits were recorded for this edition.</p>
      )}

      <Link href={`/app/events/${row.eventSlug}/results`} className="display text-lg tracking-wide text-brand">
        Full leaderboard →
      </Link>
    </div>
  );
}
