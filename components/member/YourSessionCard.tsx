import Link from "next/link";
import { ClassBadge } from "@/components/ui/Badge";
import { SessionMetrics } from "@/components/member/SessionMetrics";
import { formatDay, formatTime } from "@/lib/format";
import type { ZoneSummary } from "@/lib/rules/zones";
import type { ClassSlug } from "@/lib/types";

/**
 * On You, under the hero: the last session the wearable saw. Three numbers,
 * the zone bar, one sentence. Taps through to the session page.
 */
export function YourSessionCard({
  sessionId,
  classSlug,
  startsAt,
  summary,
  kcal,
  line,
}: {
  sessionId: string;
  classSlug: ClassSlug;
  startsAt: string;
  summary: ZoneSummary;
  kcal: number | null;
  line: string;
}) {
  return (
    <Link href={`/app/session/${sessionId}`} className="rule flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="eyebrow">Your session</span>
          <ClassBadge slug={classSlug} />
          <span className="eyebrow">
            {formatDay(startsAt)} · {formatTime(startsAt)}
          </span>
        </span>
        <span className="text-muted">›</span>
      </div>
      <SessionMetrics summary={summary} kcal={kcal} compact />
      <p className="text-sm text-muted">{line}</p>
    </Link>
  );
}
