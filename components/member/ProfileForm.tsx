"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { updateProfile } from "@/lib/actions/profile";
import type { ActionResult } from "@/lib/actions/bookings";
import type { Profile } from "@/lib/types";

const inputClass =
  "h-12 w-full rounded-md border border-ink-3 bg-ink px-4 text-base text-paper placeholder:text-muted focus:border-brand focus:outline-none";

function Segmented({ name, value, options }: { name: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <div className="grid gap-1 rounded-md border border-ink-3 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="radio" name={name} value={o.value} defaultChecked={value === o.value} className="peer sr-only" />
          <span className="display block rounded px-2 py-2 text-center text-base leading-none tracking-wide text-muted peer-checked:bg-brand peer-checked:text-paper">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfile, null);

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) router.refresh();
  }, [state, toast, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Name</span>
        <input name="full_name" defaultValue={profile.full_name ?? ""} required className={inputClass} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Phone</span>
        <input name="phone" type="tel" defaultValue={profile.phone ?? ""} placeholder="+65 9123 4567" className={inputClass} />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Email</span>
        <span className="flex h-12 items-center rounded-md border border-ink-3 px-4 text-base text-muted">{profile.email}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Zone</span>
        <Segmented name="zone_pref" value={profile.zone_pref ?? ""} options={[{ value: "east", label: "East" }, { value: "west", label: "West" }]} />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Sessions a week</span>
        <Segmented
          name="weekly_target"
          value={String(profile.weekly_target)}
          options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: n === 4 ? "4+" : String(n) }))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">Usual time</span>
        <Segmented
          name="preferred_time"
          value={profile.preferred_time ?? "either"}
          options={[{ value: "morning", label: "Mornings" }, { value: "evening", label: "Evenings" }, { value: "either", label: "Either" }]}
        />
      </div>

      <label className="flex items-center justify-between gap-4 rounded-md border border-ink-3 px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-sm">Show me on session rosters</span>
          <span className="text-xs text-muted">Other Energisers see your name and photo on sessions you&apos;re booked into.</span>
        </span>
        <input type="checkbox" name="share_attendance" defaultChecked={profile.share_attendance} className="h-5 w-5 accent-[#b11226]" />
      </label>

      <Button type="submit" loading={pending} variant="secondary">
        Save
      </Button>
    </form>
  );
}
