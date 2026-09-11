"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { cancelEventRegistration, registerForEvent, registerGuest } from "@/lib/actions/events";
import type { ActionResult } from "@/lib/actions/bookings";
import { formatTime } from "@/lib/format";
import type { MyRegistration, SlotRow } from "@/lib/queries/events";

const inputClass =
  "h-12 w-full rounded-md border border-ink-3 bg-ink px-4 text-base text-paper placeholder:text-muted focus:border-brand focus:outline-none";

function SlotPicker({
  slots,
  value,
  onChange,
  name,
}: {
  slots: SlotRow[];
  value: string | null;
  onChange: (id: string) => void;
  name?: string;
}) {
  if (slots.length === 0) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="eyebrow mb-1">Pick a wave</legend>
      {slots.map((s) => {
        const left = Math.max(0, s.capacity - s.registered);
        const full = left === 0;
        const selected = value === s.id;
        return (
          <label
            key={s.id}
            className={`rule flex cursor-pointer items-center gap-3 py-3 ${
              selected ? "border-l-2 border-l-brand pl-3" : ""
            }`}
          >
            <input
              type="radio"
              name={name ?? "slot"}
              value={s.id}
              checked={selected}
              onChange={() => onChange(s.id)}
              className="h-4 w-4 accent-[#b11226]"
            />
            <span className="flex flex-1 flex-col">
              <span className="display text-[20px] leading-none">{s.label}</span>
              <span className="text-xs text-muted">Starts {formatTime(s.starts_at)}</span>
            </span>
            <span className={`text-xs ${full ? "text-brand" : "text-muted"}`}>
              {full ? `Full · ${s.waitlisted} waiting` : `${left} left`}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function RegisterForm({
  eventId,
  slug,
  slots,
  mode,
  registration,
  registrationOpen,
  requiresAccount,
  priceLabel,
}: {
  eventId: string;
  slug: string;
  slots: SlotRow[];
  mode: "member" | "guest";
  registration: MyRegistration | null;
  registrationOpen: boolean;
  requiresAccount: boolean;
  priceLabel: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [slotId, setSlotId] = useState<string | null>(slots.length === 1 ? slots[0].id : null);
  const [pending, startTransition] = useTransition();
  const [guestState, guestAction, guestPending] = useActionState<ActionResult | null, FormData>(registerGuest, null);

  if (!registrationOpen) {
    return <p className="text-sm text-muted">Registration is closed for this event.</p>;
  }

  // Already in: show the state and a way out.
  if (mode === "member" && registration) {
    const slot = slots.find((s) => s.id === registration.slot_id);
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-ink-3 bg-ink-2 p-4">
        <div className="flex flex-col gap-1">
          <span className="display text-xl leading-tight">
            {registration.status === "waitlisted" ? "You're on the waitlist" : "You're registered"}
          </span>
          <span className="text-sm text-muted">
            {slot ? `${slot.label} · ` : ""}
            {registration.payment_status === "pending"
              ? "Payment pending. We'll confirm details with you."
              : registration.payment_status === "paid"
                ? "Paid"
                : "Free"}
          </span>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await cancelEventRegistration(registration.id, slug);
              toast.show(r.ok ? r.message : r.error, r.ok ? "ok" : "error");
              router.refresh();
            })
          }
          className="self-start text-sm text-muted underline underline-offset-4 disabled:opacity-50"
        >
          {pending ? "Cancelling…" : "Cancel registration"}
        </button>
      </div>
    );
  }

  if (mode === "guest" && requiresAccount) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-ink-3 bg-ink-2 p-4">
        <span className="display text-xl leading-tight">This one needs an account</span>
        <p className="text-sm text-muted">
          PA.ROX results follow you edition to edition, so sign in first. It takes an email and a code.
        </p>
        <Link href={`/login?next=/app/events/${slug}`} className="display text-lg text-brand">
          Sign in to register →
        </Link>
      </div>
    );
  }

  const needsSlot = slots.length > 0 && !slotId;

  if (mode === "member") {
    return (
      <div className="flex flex-col gap-4">
        <SlotPicker slots={slots} value={slotId} onChange={setSlotId} />
        <Button
          loading={pending}
          disabled={needsSlot}
          onClick={() =>
            startTransition(async () => {
              const r = await registerForEvent(eventId, slug, slotId);
              toast.show(r.ok ? r.message : r.error, r.ok ? "ok" : "error");
              router.refresh();
            })
          }
        >
          {priceLabel === "Free" ? "Register — free" : `Register · ${priceLabel}`}
        </Button>
      </div>
    );
  }

  // Guest path.
  return (
    <form action={guestAction} className="flex flex-col gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="slotId" value={slotId ?? ""} />
      <SlotPicker slots={slots} value={slotId} onChange={setSlotId} name="slotRadio" />
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Name</span>
        <input name="name" autoComplete="name" required className={inputClass} placeholder="Your name" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Email</span>
        <input name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@example.com" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Phone</span>
        <input name="phone" type="tel" autoComplete="tel" required className={inputClass} placeholder="+65 9123 4567" />
      </label>
      {guestState && !guestState.ok ? (
        <p role="alert" className="text-sm text-brand">
          {guestState.error}
        </p>
      ) : null}
      {guestState?.ok ? (
        <p role="status" className="rounded-md border border-ink-3 bg-ink-2 px-3 py-2 text-sm">
          {guestState.message} Sign up later with the same email and this stays on your record.
        </p>
      ) : (
        <Button type="submit" loading={guestPending} disabled={needsSlot}>
          {priceLabel === "Free" ? "Register — free" : `Register · ${priceLabel}`}
        </Button>
      )}
    </form>
  );
}
