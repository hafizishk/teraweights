"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StartTrialButton } from "@/components/member/StartTrialButton";
import { ClassBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import { bookSession, cancelBooking, joinWaitlist } from "@/lib/actions/bookings";
import { formatDay, formatTime } from "@/lib/format";
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isCancel = view.action === "cancel" || view.action === "leave_waitlist";
  const disabled = view.action === "blocked" || view.action === "closed" || view.action === "attended";

  function run(fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.show(result.message);
        onClose();
        router.refresh();
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
      run(() => cancelBooking(view.bookingId!));
      return;
    }
    if (view.action === "waitlist") {
      run(() => joinWaitlist(view.id));
      return;
    }
    run(() => bookSession(view.id));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
      />
      <div className="safe-bottom relative w-full max-w-[480px] rounded-t-2xl border-t border-ink-3 bg-ink-2 p-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-3" />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <ClassBadge slug={view.classSlug} className="self-start" />
            <h2 className="text-2xl leading-tight">{view.className}</h2>
            <p className="text-sm text-muted">
              {formatDay(view.startsAt)} · {formatTime(view.startsAt)}–{formatTime(view.endsAt)}
            </p>
          </div>

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
            <p className="rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
              {view.entitlementNote}
            </p>
          ) : null}

          {confirmingCancel && view.cancelWarning ? (
            <p role="alert" className="rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
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
