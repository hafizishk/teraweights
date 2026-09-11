"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { Field, Input, Select, Textarea } from "@/components/admin/Field";
import { addOpenHours, savePtNote } from "@/lib/actions/pt";
import type { ActionResult } from "@/lib/actions/bookings";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function useActionToast(state: ActionResult | null) {
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) router.refresh();
  }, [state, toast, router]);
}

export type Option = { id: string; name: string };

/** Add a window of open hours. Admin picks the coach; a coach adds their own. */
export function OpenHoursForm({ coaches, venues, fixedCoachId }: { coaches: Option[]; venues: Option[]; fixedCoachId?: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addOpenHours, null);
  useActionToast(state);

  return (
    <form action={action} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {fixedCoachId ? (
        <input type="hidden" name="coach_id" value={fixedCoachId} />
      ) : (
        <Field label="Coach">
          <Select name="coach_id" defaultValue={coaches[0]?.id ?? ""}>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Day">
        <Select name="weekday" defaultValue="2">
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i + 1}>
              {d}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="From">
        <Input name="start_time" type="time" defaultValue="06:00" required />
      </Field>
      <Field label="To">
        <Input name="end_time" type="time" defaultValue="09:00" required />
      </Field>
      <Field label="Slot">
        <Select name="slot_minutes" defaultValue="60">
          <option value="30">30 min</option>
          <option value="45">45 min</option>
          <option value="60">60 min</option>
          <option value="90">90 min</option>
        </Select>
      </Field>
      <Field label="Venue">
        <Select name="venue_id" defaultValue="">
          <option value="">Agree on the day</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className={fixedCoachId ? "" : "lg:col-span-6"}>
        <Button type="submit" loading={pending} variant="secondary" className="h-10 text-base">
          Add hours
        </Button>
      </div>
    </form>
  );
}

/** Title, note and attendance for one PT session. */
export function PtNoteForm({
  id,
  title,
  note,
  status,
}: {
  id: string;
  title: string | null;
  note: string | null;
  status: "booked" | "attended" | "no_show" | "cancelled";
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(savePtNote, null);
  useActionToast(state);

  return (
    <form action={action} className="flex w-full max-w-lg flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Input name="title" defaultValue={title ?? ""} placeholder="Sled + trap bar" aria-label="Session title" className="h-8 text-xs" />
        <Select name="status" defaultValue={status === "cancelled" ? "booked" : status} aria-label="Attendance" className="h-8 w-32 text-xs">
          <option value="booked">Booked</option>
          <option value="attended">Attended</option>
          <option value="no_show">No-show</option>
        </Select>
      </div>
      <Textarea
        name="coach_note"
        defaultValue={note ?? ""}
        rows={2}
        placeholder="What you did, what moved. The member reads this."
        aria-label="Coach note"
        className="min-h-0 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-8 w-fit items-center rounded-md border border-ink-3 px-3 text-xs hover:border-muted disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
