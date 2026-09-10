import Link from "next/link";
import { ClassBadge } from "@/components/ui/Badge";
import { AvatarRow } from "@/components/ui/Avatar";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { formatDay, formatTime, shortVenue } from "@/lib/format";
import { photoForClass } from "@/lib/photos";
import type { SessionView } from "@/lib/view/session-view";

export type TrainingRow = {
  view: SessionView;
  attendeeNames: string[];
};

export function WhoIsTraining({ rows, weekLabel }: { rows: TrainingRow[]; weekLabel: string }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px]">Who&apos;s training</h2>
        <span className="text-xs text-muted">{weekLabel}</span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-3 px-4 py-6 text-center text-sm text-muted">
          Nothing left this week. Next week&apos;s sessions are in Book.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ view, attendeeNames }) => {
            const mine = view.bookingStatus === "booked" || view.bookingStatus === "attended";
            const status = mine
              ? { text: "You're in", tone: "text-paper" }
              : view.full
                ? { text: "Full · waitlist", tone: "text-brand" }
                : { text: `${view.bookedCount} going`, tone: "text-muted" };

            return (
              <li key={view.id}>
                <Link
                  href={`/app/book?s=${view.id}`}
                  className="flex items-center gap-3 rounded-lg border border-ink-3 bg-ink-2 p-2.5 hover:border-muted"
                >
                  <DuotonePhoto
                    src={photoForClass(view.classSlug)}
                    fadeTo="none"
                    sizes="64px"
                    className="h-16 w-16 shrink-0 rounded-md"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="display text-lg leading-none">
                      {formatDay(view.startsAt).split(" ")[0]} {formatTime(view.startsAt)}
                    </span>
                    <span className="flex items-center gap-2">
                      <ClassBadge slug={view.classSlug} />
                      <span className="truncate text-xs text-muted">{shortVenue(view.venueName).replace(/\s+Road$/, "")}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <AvatarRow names={attendeeNames} max={3} />
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
