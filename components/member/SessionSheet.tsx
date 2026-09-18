"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StartTrialButton } from "@/components/member/StartTrialButton";
import { BookedSheet, type BookedDetails } from "@/components/member/BookedSheet";
import { ClassBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import { bookSession, cancelBooking, joinWaitlist } from "@/lib/actions/bookings";
import { formatDay, formatTime } from "@/lib/format";
import { DuotonePhoto } from "@/components/member/DuotonePhoto";
import { CLASS_INFO } from "@/lib/class-info";
import { photoForClass } from "@/lib/photos";
import type { SessionView } from "@/lib/view/session-view";

export function SessionSheet({
  view,
  onClose,
  trialEligible = false,
}: {
  view: SessionView;
  onClose: () => void;
  trialEligible?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [booked, setBooked] = useState<BookedDetails | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isCancel = view.action === "cancel" || view.action === "leave_waitlist";
  const disabled = view.action === "blocked" || view.action === "closed" || view.action === "attended";

  function bookedDetails(kind: "book" | "waitlist"): BookedDetails {
    const waitlist = kind === "waitlist";
    return {
      heading: waitlist ? "You're on the waitlist" : "You're all set",
      sub: waitlist
        ? "If a spot opens you are moved in automatically and it shows as booked on You."
        : "Come ready to work. Arrive ten minutes early and check in with the QR code.",
      eyebrow: "Session",
      title: view.className,
      when: `${formatDay(view.startsAt)} · ${formatTime(view.startsAt)}–${formatTime(view.endsAt)}`,
      where: [view.venueName, view.coachName ? `${view.coachName} coaching` : null].filter(Boolean).join(" · "),
      classSlug: view.classSlug,
      calendar: waitlist
        ? null
        : {
            kind: "session",
            id: view.id,
            event: {
              uid: `session-${view.id}@teraweights`,
              title: `${view.className} · Teraweights`,
              description: view.coachName ? `Coach: ${view.coachName}` : null,
              location: view.venueName,
              start: view.startsAt,
              end: view.endsAt,
            },
          },
    };
  }

  function run(fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>, kind: "book" | "waitlist" | "cancel") {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        router.refresh();
        if (kind === "cancel") {
          toast.show(result.message);
          onClose();
        } else {
          setBooked(bookedDetails(kind));
        }
      } else {
        toast.show(result.error, "error");
        setConfirmingCancel(false);
      }
    });
  }

  function onPrimary() {
    if (isCancel) {
      if (view.cancelWarning && !confirmingCancel) {
        setConfirmingCancel(true);
        return;
      }
      run(() => cancelBooking(view.bookingId!), "cancel");
      return;
    }
    if (view.action === "waitlist") {
      run(() => joinWaitlist(view.id), "waitlist");
      return;
    }
    run(() => bookSession(view.id), "book");
  }

  if (booked) return <BookedSheet details={booked} onDone={onClose} />;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
      />
      <div className="safe-bottom relative w-full max-w-[480px] overflow-hidden rounded-t-2xl border-t border-ink-3 bg-ink-2">
        <DuotonePhoto src={photoForClass(view.classSlug)} fadeTo="card" sizes="480px" className="h-[150px]">
          <div className="flex flex-col gap-2 p-5 pb-2">
            <ClassBadge slug={view.classSlug} className="self-start" />
            <h2 className="text-[30px] leading-none">{view.className}</h2>
            <p className="text-sm text-paper/85">
              {formatDay(view.startsAt)} · {formatTime(view.startsAt)}–{formatTime(view.endsAt)}
            </p>
          </div>
        </DuotonePhoto>

        <div className="flex flex-col gap-4 p-5 pt-3">
          <p className="text-sm leading-relaxed text-muted">
            {CLASS_INFO[view.classSlug].line1} {CLASS_INFO[view.classSlug].line2}
          </p>

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Venue</dt>
              <dd className="text-right">
                {view.venueMapUrl ? (
                  <a
                    href={view.venueMapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4"
                  >
                    {view.venueName}
                  </a>
                ) : (
                  view.venueName
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Coach</dt>
              <dd>{view.coachName ?? "TBC"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Spots</dt>
              <dd className={view.full ? "text-brand" : undefined}>
                {view.spotsLabel}
                {view.waitlistedCount > 0 ? ` · ${view.waitlistedCount} waiting` : ""}
              </dd>
            </div>
            {view.notes ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Note</dt>
                <dd className="text-right">{view.notes}</dd>
              </div>
            ) : null}
          </dl>

          {view.action === "book" && view.entitlementNote ? (
            <p className="text-xs text-muted">{view.entitlementNote}</p>
          ) : null}

          {view.action === "blocked" ? (
            <p className="border-l-2 border-brand pl-3 text-sm">
              {view.entitlementNote}{" "}
              <Link href="/app/packs" className="display text-base tracking-wide text-brand">
                See packs →
              </Link>
            </p>
          ) : null}

          {confirmingCancel && view.cancelWarning ? (
            <p role="alert" className="border-l-2 border-brand pl-3 text-sm">
              {view.cancelWarning} Press again to confirm.
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            {view.action === "blocked" && trialEligible ? <StartTrialButton onDone={onClose} /> : null}
            <Button
              onClick={onPrimary}
              loading={pending}
              disabled={disabled}
              variant={isCancel ? "secondary" : "primary"}
            >
              {confirmingCancel ? "Cancel anyway" : view.actionLabel}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 text-center text-sm text-muted underline-offset-4 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
