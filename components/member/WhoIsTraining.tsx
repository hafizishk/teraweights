import Link from "next/link";
import { ClassBadge } from "@/components/ui/Badge";
import { AvatarRow, type Person } from "@/components/ui/Avatar";
import { formatDay, formatTime, shortVenue } from "@/lib/format";
import type { SessionView } from "@/lib/view/session-view";

export type TrainingRow = {
  view: SessionView;
  people: Person[];
  /** Matches the member's preferred time of day. */
  usual?: boolean;
};

/**
 * The week's remaining sessions as a timetable: time set large on the left,
 * a hairline between rows, who is going on the right. No thumbnails; a list
 * of identical photos says nothing.
 */
export function WhoIsTraining({ rows, weekLabel }: { rows: TrainingRow[]; weekLabel: string }) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between pb-1">
        <h2 className="text-[22px]">Who&apos;s training</h2>
        <span className="eyebrow">{weekLabel}</span>
      </div>

      {rows.length === 0 ? (
        <p className="rule py-6 text-sm text-muted">Nothing left this week. Next week&apos;s sessions are in Book.</p>
      ) : (
        <ul>
          {rows.map(({ view, people, usual }) => {
            const mine = view.bookingStatus === "booked" || view.bookingStatus === "attended";
            const status = mine
              ? { text: "You're in", tone: "text-paper" }
              : view.full
                ? { text: "Full", tone: "text-brand" }
                : { text: `${view.bookedCount} going`, tone: "text-muted" };

            return (
              <li key={view.id} className="rule">
                <Link href={`/app/book?s=${view.id}`} className="flex items-center gap-3 py-3">
                  <span className="flex w-[84px] shrink-0 flex-col">
                    <span className="eyebrow">{formatDay(view.startsAt).split(" ")[0]}</span>
                    <span className="display tnum text-[22px] leading-none">{formatTime(view.startsAt)}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <ClassBadge slug={view.classSlug} />
                      {usual ? <span className="eyebrow">Your usual</span> : null}
                    </span>
                    <span className="truncate text-[13px] text-muted">
                      {shortVenue(view.venueName).replace(/\s+Road$/, "")}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <AvatarRow people={people} max={3} size={24} />
                    <span className={`text-xs ${status.tone}`}>{status.text}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
