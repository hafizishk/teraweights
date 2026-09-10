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

const linkClass = "text-sm text-muted underline underline-offset-4 disabled:opacity-50";

export function HomeHero({
  firstName,
  streakWeeks,
  sessionsThisWeek,
  weeklyTarget,
  view,
  people,
  attendeeLine,
  checkinOpen,
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
      <span className="text-sm text-paper/85">Hey {firstName}</span>
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
              <h1 className="text-[40px] leading-[0.92]">
                Your week
                <br />
                is open
              </h1>
              <p className="text-sm text-paper/85">Pick a session and lock it in.</p>
              <Link href="/app/book" className="display mt-1 text-lg text-brand">
                Book a session →
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
    <section className="-mx-4 -mt-4 flex flex-col gap-3">
      <DuotonePhoto src={photoForClass(view.classSlug)} className="h-[380px]" priority>
        <div className="flex h-full flex-col justify-between p-4">
          {top}
          <div className="flex flex-col gap-2">
            <ClassBadge slug={view.classSlug} className="self-start" />
            <h1 className="text-[44px] leading-[0.92]">
              {formatWeekday(view.startsAt)}
              <br />
              {formatTime(view.startsAt)}
            </h1>
            <p className="text-sm text-paper/85">
              {shortVenue(view.venueName)}
              {coach}
            </p>
            <div className="mt-1 flex items-center gap-2.5">
              <AvatarRow people={people} />
              <span className="text-[13px]">{attendeeLine}</span>
            </div>
          </div>
        </div>
      </DuotonePhoto>

      {confirming && view.cancelWarning ? (
        <p role="alert" className="mx-4 rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
          {view.cancelWarning} Tap again to confirm.
        </p>
      ) : null}

      {attended ? (
        <p className="mx-4 rounded-md border border-ink-3 bg-ink-2 px-3 py-2 text-sm">You&apos;re checked in.</p>
      ) : checkinOpen ? (
        <div className="mx-4">
          <Link
            href="/app/checkin/scan"
            className="display flex h-12 w-full items-center justify-center rounded-md bg-brand text-lg tracking-wide text-paper hover:bg-brand-2"
          >
            Check in
          </Link>
        </div>
      ) : null}

      <div className="flex gap-4 px-4">
        {!attended ? (
          <button type="button" onClick={onCancel} disabled={pending} className={linkClass}>
            {pending ? "Cancelling…" : confirming ? "Cancel anyway" : "Cancel"}
          </button>
        ) : null}
        <Link href="/app/events" className={linkClass}>
          Invite a friend
        </Link>
      </div>
    </section>
  );
}
