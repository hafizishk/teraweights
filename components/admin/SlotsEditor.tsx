"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { ActionButton } from "@/components/admin/ActionButton";
import { Field, Input } from "@/components/admin/Field";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { useToast } from "@/components/ui/Toaster";
import { deleteSlot, saveSlot } from "@/lib/actions/events";
import { TZ, formatTime } from "@/lib/format";
import type { ActionResult } from "@/lib/actions/bookings";
import type { SlotRow } from "@/lib/queries/events";

/** Waves for an event: the list, plus one form that adds or edits. */
export function SlotsEditor({
  eventId,
  eventDate,
  slots,
}: {
  eventId: string;
  eventDate: string;
  slots: SlotRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveSlot, null);
  const [editing, setEditing] = useState<SlotRow | null>(null);

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) {
      setEditing(null);
      router.refresh();
    }
  }, [state, toast, router]);

  const date = editing ? formatInTimeZone(new Date(editing.starts_at), TZ, "yyyy-MM-dd") : eventDate;
  const time = editing ? formatInTimeZone(new Date(editing.starts_at), TZ, "HH:mm") : "";

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <thead>
          <tr>
            <Th>Wave</Th>
            <Th>Starts</Th>
            <Th>Capacity</Th>
            <Th>Registered</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {slots.length === 0 ? (
            <EmptyRow colSpan={5}>No waves yet. Add the first one below.</EmptyRow>
          ) : (
            slots.map((s) => (
              <Tr key={s.id}>
                <Td>{s.label}</Td>
                <Td className="text-muted">{formatTime(s.starts_at)}</Td>
                <Td>{s.capacity}</Td>
                <Td>
                  {s.registered}
                  {s.waitlisted > 0 ? <span className="text-muted"> · {s.waitlisted} waiting</span> : null}
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="inline-flex h-8 items-center whitespace-nowrap rounded-md border border-ink-3 px-3 text-xs text-paper transition-colors hover:border-muted"
                    >
                      Edit
                    </button>
                    <ActionButton
                      action={() => deleteSlot(s.id)}
                      confirm="Delete wave?"
                      variant="danger"
                    >
                      Delete
                    </ActionButton>
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      <form key={editing?.id ?? "new"} action={action} className="flex flex-col gap-4 rounded-lg border border-ink-3 bg-ink-2 p-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="display text-xl leading-none">{editing ? `Edit ${editing.label}` : "Add a wave"}</h3>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-xs text-muted underline-offset-4 hover:underline"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <input type="hidden" name="event_id" value={eventId} />

        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Label">
            <Input name="label" defaultValue={editing?.label ?? ""} required placeholder="Wave 1" />
          </Field>
          <Field label="Date">
            <Input type="date" name="date" defaultValue={date} required />
          </Field>
          <Field label="Start time" hint="Singapore time">
            <Input type="time" name="time" defaultValue={time} required />
          </Field>
          <Field label="Capacity">
            <Input type="number" name="capacity" min="1" step="1" defaultValue={editing?.capacity ?? 30} required />
          </Field>
        </div>

        <div>
          <button
            type="submit"
            disabled={pending}
            className="display inline-flex h-11 items-center rounded-md bg-brand px-6 text-lg tracking-wide text-paper transition-colors hover:bg-brand-2 disabled:opacity-50"
          >
            {pending ? "Saving…" : editing ? "Save wave" : "Add wave"}
          </button>
        </div>
      </form>
    </div>
  );
}
