"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { startTrial } from "@/lib/actions/packages";

export function StartTrialButton({
  variant = "primary",
  onDone,
}: {
  variant?: "primary" | "secondary";
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await startTrial();
      if (result.ok) {
        toast.show(result.message);
        onDone?.();
        router.refresh();
      } else {
        toast.show(result.error, "error");
      }
    });
  }

  return (
    <Button onClick={onClick} loading={pending} variant={variant}>
      Start your free week
    </Button>
  );
}
