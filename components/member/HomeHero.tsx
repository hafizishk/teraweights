"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClassBadge } from "@/components/ui/Badge";
import { AvatarRow, type Person } from "@/components/ui/Avatar";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { StreakRing } from "@/components/member/StreakRing";
import { useToast } from "@/components/ui/Toaster";
import { cancelBooking } from "@/lib/actions/bookings";
import { firstName as first, formatTime, formatWeekday, shortVenue } from "@/lib/format";
import { photoForClass } from "@/lib/photos";
import type { SessionView } from "@/lib/view/session-view";

const quietAction = "display text-base tracking-wide text-muted hover:text-paper disabled:opacity-50";

export function HomeHero({
  firstName,
  streakWeeks,
  sessionsThisWeek,
  weeklyTarget,
  view,
  people,
  attendeeLine,
  checkinOpen,
  canBook = true,
}: {
  firstName: string;
  streakWeeks: number;
  sessionsThisWeek: number;
  weeklyTarget: number;
  view: SessionView | null;
  people: Person[];
  attendeeLine: string;
  /** Within 30 minutes of the next session's start (rule: lib/rules/checkin.ts). */
  checkinOpen: boolean;
  /** False when there is no live class package: the open week points at Packs, not Book. */
  canBook?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onCancel() {
    if (!view?.bookingId) return;
    if (view.cancelWarning && !confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await cancelBooking(view.bookingId!);
      if (result.ok) {
        toast.show(result.message);
        router.refresh();
      } else {
        toast.show(result.error, "error");
      }
      setConfirming(false);
    });
  }

  const top = (
    <div className="flex flex-col gap-3">
      <span className="text-sm text-paper/80">Hey {firstName}</span>
      <StreakRing streakWeeks={streakWeeks} sessionsThisWeek={sessionsThisWeek} weeklyTarget={weeklyTarget} />
    </div>
  );

  if (!view) {
    return (
      <section className="-mx-4 -mt-4">
        <DuotonePhoto src={photoForClass("energise_east")} className="h-[340px]" priority>
          <div className="flex h-full flex-col justify-between p-4">
            {top}
            <div className="flex flex-col gap-2">
              <h1 className="text-[48px] leading-[0.9]">
                {canBook ? (
                  <>
                    Your week
                    <br />
                    is open
                  </>
                ) : (
                  <>
                    Ready when
                    <br />
                    you are
                  </>
                )}
              </h1>
              <Link href={canBook ? "/app/book" : "/app/packs"} className="display mt-1 text-lg tracking-wide text-brand">
                {canBook ? "Book a session →" : "See packs →"}
              </Link>
            </div>
          </div>
        </DuotonePhoto>
      </section>
    );
  }

  const coach = view.coachName ? ` · ${first(view.coachName)} coaching` : "";
  const attended = view.bookingStatus === "attended";

  return (
    <section className="-mx-4 -mt-4 flex flex-col">
      <DuotonePhoto src={photoForClass(view.classSlug)} className="h-[380px]" priority>
        <div className="flex h-full flex-col justify-between p-4">
          {top}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ClassBadge slug={view.classSlug} />
              <span className="eyebrow text-paper/80">Your next session</span>
            </div>
            <h1 className="tnum text-[52px] leading-[0.88]">
              {formatWeekday(view.startsAt)}
              <br />
              {formatTime(view.startsAt)}
            </h1>
            <p className="text-sm text-paper/85">
              {shortVenue(view.venueName)}
              {coach}
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <AvatarRow people={people} size={24} />
              <span className="text-[13px] text-paper/85">{attendeeLine}</span>
            </div>
          </div>
        </div>
      </DuotonePhoto>

      {confirming && view.cancelWarning ? (
        <p role="alert" className="mx-4 mt-3 border-l-2 border-brand pl-3 text-sm">
          {view.cancelWarning} Tap again to confirm.
        </p>
      ) : null}

      {attended ? (
        <p className="mx-4 mt-3 border-l-2 border-paper/60 pl-3 text-sm text-paper/85">You&apos;re checked in.</p>
      ) : checkinOpen ? (
        <div className="mx-4 mt-3">
          <Link
            href="/app/checkin/scan"
            className="display flex h-12 w-full items-center justify-center rounded-md bg-brand text-lg tracking-wide text-paper hover:bg-brand-2"
          >
            Check in
          </Link>
        </div>
      ) : null}

      <div className="flex items-center gap-4 px-4 pt-3">
        {!attended ? (
          <button type="button" onClick={onCancel} disabled={pending} className={quietAction}>
            {pending ? "Cancelling…" : confirming ? "Cancel anyway" : "Cancel booking"}
          </button>
        ) : null}
        <Link href="/app/events" className={quietAction}>
          Invite a friend
        </Link>
      </div>
    </section>
  );
}
