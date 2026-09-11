"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { cancelPtSession } from "@/lib/actions/pt";

/** Two taps when inside the cutoff, one when outside. */
export function PtCancelButton({ id, late }: { id: string; late: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function onClick() {
    if (late && !confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await cancelPtSession(id);
      toast.show(result.ok ? result.message : result.error, result.ok ? "ok" : "error");
      setConfirming(false);
      if (result.ok) router.refresh();
    });
  }

  return (
    <button type="button" onClick={onClick} disabled={pending} className="display text-lg text-muted disabled:opacity-50">
      {pending ? "Cancelling…" : confirming ? "Lose the session?" : "Cancel"}
    </button>
  );
}
