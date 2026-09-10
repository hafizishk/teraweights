"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { Field, Input, Select, Textarea } from "@/components/admin/Field";
import { updateSession } from "@/lib/actions/schedule";
import type { Option } from "@/components/admin/NewSessionForm";
import type { ActionResult } from "@/lib/actions/bookings";

/** Coach, capacity and notes on an existing session. */
export function SessionSettingsForm({
  sessionId,
  coaches,
  coachId,
  capacity,
  notes,
}: {
  sessionId: string;
  coaches: Option[];
  coachId: string | null;
  capacity: number;
  notes: string | null;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateSession, null);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) router.refresh();
  }, [state, toast, router]);

  return (
    <form action={action} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="session_id" value={sessionId} />
      <Field label="Coach">
        <Select name="coach_id" defaultValue={coachId ?? ""}>
          <option value="">Unassigned</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Capacity">
        <Input name="capacity" type="number" min={1} max={200} defaultValue={capacity} required />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" rows={2} defaultValue={notes ?? ""} placeholder="Meet at the carpark" />
      </Field>
      <Button type="submit" loading={pending} variant="secondary" className="h-10 text-base">
        Save
      </Button>
    </form>
  );
}
