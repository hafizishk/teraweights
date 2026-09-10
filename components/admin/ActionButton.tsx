"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import type { ActionResult } from "@/lib/actions/bookings";

/**
 * Runs a server action from a table row and reports the outcome. `confirm`
 * turns the first click into an "are you sure" the second click completes.
 */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "quiet",
  className = "",
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  confirm?: string;
  variant?: "quiet" | "danger" | "primary";
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const styles = {
    quiet: "border-ink-3 text-paper hover:border-muted",
    danger: "border-brand/50 text-brand hover:bg-brand/10",
    primary: "border-brand bg-brand text-paper hover:bg-brand-2",
  }[variant];

  function run() {
    if (confirm && !confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await action();
      toast.show(result.ok ? result.message : result.error, result.ok ? "ok" : "error");
      setConfirming(false);
      if (result.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={`inline-flex h-8 items-center whitespace-nowrap rounded-md border px-3 text-xs transition-colors disabled:opacity-50 ${styles} ${className}`}
    >
      {pending ? "Working…" : confirming ? (confirm ?? children) : children}
    </button>
  );
}
