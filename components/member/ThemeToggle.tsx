"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toaster";
import { setTheme } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/bookings";
import type { Theme } from "@/lib/types";

/**
 * Appearance picker on Account. Saves on tap; the member layout re-renders
 * with the new data-theme on refresh, so the whole app changes at once.
 */
export function ThemeToggle({ theme }: { theme: Theme }) {
  const router = useRouter();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(setTheme, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) router.refresh();
    else toast.show(state.error, "error");
  }, [state, toast, router]);

  return (
    <form ref={form} action={action} className="flex flex-col gap-2" aria-busy={pending}>
      <span className="text-sm text-muted">Appearance</span>
      <Segmented
        name="theme"
        value={theme}
        options={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light" },
          { value: "system", label: "Auto" },
        ]}
        onChange={() => form.current?.requestSubmit()}
      />
      <span className="text-xs text-muted">Auto follows your phone&apos;s setting.</span>
    </form>
  );
}
