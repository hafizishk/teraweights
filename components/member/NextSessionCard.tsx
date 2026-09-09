"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { ClassBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import { cancelBooking } from "@/lib/actions/bookings";
import { formatDay, formatTime } from "@/lib/format";
import type { SessionView } from "@/lib/view/session-view";

export function NextSessionCard({ view }: { view: SessionView }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onCancel() {
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

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-muted">Next session</p>
          <ClassBadge slug={view.classSlug} className="self-start" />
          <CardTitle>
            {formatDay(view.startsAt)} · {formatTime(view.startsAt)}
          </CardTitle>
          <p className="text-sm text-muted">{view.venueName}</p>
        </div>
      </div>

      {confirming && view.cancelWarning ? (
        <p role="alert" className="rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
          {view.cancelWarning} Tap again to confirm.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="self-start text-sm text-muted underline underline-offset-4 disabled:opacity-50"
      >
        {pending ? "Cancelling…" : confirming ? "Cancel anyway" : "Cancel"}
      </button>
    </Card>
  );
}
