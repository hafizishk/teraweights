"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, Textarea } from "@/components/admin/Field";
import { useToast } from "@/components/ui/Toaster";
import { saveEvent } from "@/lib/actions/events";
import type { ActionResult } from "@/lib/actions/bookings";
import type { EventRow } from "@/lib/queries/events";

export type VenueOption = { id: string; name: string };

const TYPES: { value: EventRow["type"]; label: string }[] = [
  { value: "parox", label: "PA.ROX" },
  { value: "kampung_grind", label: "Kampung Grind" },
  { value: "community", label: "Community" },
];

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-ink-3 px-3 py-2.5">
      <span className="flex flex-col gap-0.5">
        <span className="text-sm text-paper">{label}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-5 w-5 accent-[#b11226]"
      />
    </label>
  );
}

/**
 * Create or edit an event. The same form serves both: with no `event` the slug
 * is derived from the name by the action.
 */
export function EventForm({
  venues,
  event,
  venueId,
}: {
  venues: VenueOption[];
  event?: EventRow;
  venueId?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveEvent, null);
  const [isFree, setIsFree] = useState(event ? event.is_free : true);

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) router.refresh();
  }, [state, toast, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={event?.id ?? ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={event?.name ?? ""} required placeholder="PA.ROX @ Bedok Reservoir" />
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue={event?.type ?? "parox"}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" name="event_date" defaultValue={event?.event_date ?? ""} required />
        </Field>
        <Field label="Venue">
          <Select name="venue_id" defaultValue={venueId ?? ""}>
            <option value="">No venue yet</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Description">
        <Textarea name="description" defaultValue={event?.description ?? ""} placeholder="What the day looks like." />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Cover image URL" hint="Optional. Used as the event header.">
          <Input name="cover_url" defaultValue={event?.cover_url ?? ""} placeholder="https://…" />
        </Field>
        <Field label="Partner line" hint="Optional. Shown under the title.">
          <Input name="partner_line" defaultValue={event?.partner_line ?? ""} placeholder="With PAssion Wave" />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Toggle name="is_free" label="Free event" defaultChecked={event ? event.is_free : true} onChange={setIsFree} />
        <Field label="Price" hint={isFree ? "Not charged while the event is free." : "SGD, per registration."}>
          <Input
            type="number"
            name="price_sgd"
            min="0"
            step="1"
            disabled={isFree}
            defaultValue={event?.price_sgd ?? ""}
            placeholder="35"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Toggle name="is_public" label="Public" hint="Listed on the public page." defaultChecked={event ? event.is_public : true} />
        <Toggle
          name="requires_account"
          label="Account required"
          hint="Off means guests can register."
          defaultChecked={event ? event.requires_account : false}
        />
        <Toggle
          name="registration_open"
          label="Registration open"
          hint="Off closes sign-ups."
          defaultChecked={event ? event.registration_open : true}
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="display inline-flex h-11 items-center rounded-md bg-brand px-6 text-lg tracking-wide text-paper transition-colors hover:bg-brand-2 disabled:opacity-50"
        >
          {pending ? "Saving…" : event ? "Save event" : "Create event"}
        </button>
      </div>
    </form>
  );
}
