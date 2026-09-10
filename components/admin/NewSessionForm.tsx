"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { Field, Input, Select, Textarea } from "@/components/admin/Field";
import { bulkCreateSessions, createSession } from "@/lib/actions/schedule";
import { describeWeekdays, planSessions } from "@/lib/rules/schedule";
import type { ActionResult } from "@/lib/actions/bookings";

export type Option = { id: string; name: string };

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

function useActionToast(state: ActionResult | null) {
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) router.refresh();
  }, [state, toast, router]);
}

function Shared({ classTypes, venues, coaches }: { classTypes: Option[]; venues: Option[]; coaches: Option[] }) {
  return (
    <>
      <Field label="Class type">
        <Select name="class_type_id" required defaultValue={classTypes[0]?.id ?? ""}>
          {classTypes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Venue">
        <Select name="venue_id" required defaultValue={venues[0]?.id ?? ""}>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Coach">
        <Select name="coach_id" defaultValue="">
          <option value="">Unassigned</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

/** "New session" — one session at a time (brief section 9). */
export function NewSessionForm({ classTypes, venues, coaches }: { classTypes: Option[]; venues: Option[]; coaches: Option[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createSession, null);
  useActionToast(state);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Shared classTypes={classTypes} venues={venues} coaches={coaches} />
      <Field label="Date">
        <Input name="date" type="date" required />
      </Field>
      <Field label="Start time" hint="24-hour, Singapore time">
        <Input name="time" type="time" required defaultValue="20:00" />
      </Field>
      <Field label="Duration" hint="minutes">
        <Input name="duration" type="number" min={15} max={240} step={5} defaultValue={60} required />
      </Field>
      <Field label="Capacity">
        <Input name="capacity" type="number" min={1} max={200} defaultValue={20} required />
      </Field>
      <Field label="Notes">
        <Textarea name="notes" rows={2} placeholder="Bring a towel" />
      </Field>
      <div className="flex items-end">
        <Button type="submit" loading={pending} variant="secondary" className="h-10 text-base">
          Create session
        </Button>
      </div>
    </form>
  );
}

/** "Bulk create" — a recurrence, previewed before it is written. */
export function BulkCreateForm({ classTypes, venues, coaches }: { classTypes: Option[]; venues: Option[]; coaches: Option[] }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(bulkCreateSessions, null);
  useActionToast(state);

  const [weekdays, setWeekdays] = useState<number[]>([2, 4]);
  const [time, setTime] = useState("20:00");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const planned = from && to ? planSessions({ weekdays, time, durationMinutes: 60, from, to }) : [];

  function toggle(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Shared classTypes={classTypes} venues={venues} coaches={coaches} />
        <Field label="From">
          <Input name="from" type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input name="to" type="date" required value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Start time">
          <Input name="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Duration" hint="minutes">
          <Input name="duration" type="number" min={15} max={240} step={5} defaultValue={60} required />
        </Field>
        <Field label="Capacity">
          <Input name="capacity" type="number" min={1} max={200} defaultValue={20} required />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-widest text-muted">Weekdays</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const on = weekdays.includes(d.value);
            return (
              <label key={d.value} className="cursor-pointer">
                <input
                  type="checkbox"
                  name="weekdays"
                  value={d.value}
                  checked={on}
                  onChange={() => toggle(d.value)}
                  className="peer sr-only"
                />
                <span
                  className={`display inline-flex h-9 w-14 items-center justify-center rounded-md border text-base tracking-wide ${
                    on ? "border-brand bg-brand text-paper" : "border-ink-3 text-muted"
                  }`}
                >
                  {d.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        {/* Button is w-full by design; an inline-block wrapper shrinks it to its label. */}
        <span className="inline-block">
          <Button type="submit" loading={pending} variant="secondary" className="h-10 px-6 text-base">
            Create {planned.length > 0 ? `${planned.length} sessions` : "sessions"}
          </Button>
        </span>
        <p className="text-sm text-muted">
          {planned.length > 0
            ? `${describeWeekdays(weekdays)} at ${time}, ${planned.length} sessions.`
            : "Pick a date range and weekdays to see how many this creates."}
        </p>
      </div>
    </form>
  );
}
