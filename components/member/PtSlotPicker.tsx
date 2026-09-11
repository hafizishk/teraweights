"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { bookPtSession } from "@/lib/actions/pt";
import { formatDay, formatTime, shortVenue } from "@/lib/format";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/rules/cancellation";
import { dayInitial, dayNumber, sgtDate } from "@/lib/week";

export type PickerSlot = { startsAt: string; endsAt: string; taken: boolean; venueName: string | null; slotMinutes: number };
export type PickerCoach = {
  id: string;
  name: string;
  title: string | null;
  avatarUrl: string | null;
  hoursLabel: string;
  slots: PickerSlot[];
};

/**
 * Pick a coach, a day, a slot; confirm. Slots come precomputed from
 * lib/rules/pt.ts on the server; the database re-checks on booking.
 */
export function PtSlotPicker({ coaches, sessionsLeft }: { coaches: PickerCoach[]; sessionsLeft: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const coach = coaches.find((c) => c.id === coachId) ?? coaches[0];

  const days = useMemo(() => {
    const map = new Map<string, PickerSlot[]>();
    for (const s of coach?.slots ?? []) {
      const d = sgtDate(s.startsAt);
      map.set(d, [...(map.get(d) ?? []), s]);
    }
    return [...map.entries()];
  }, [coach]);

  const firstOpenDay = days.find(([, slots]) => slots.some((s) => !s.taken))?.[0] ?? days[0]?.[0] ?? "";
  const [day, setDay] = useState(firstOpenDay);
  const activeDay = days.some(([d]) => d === day) ? day : firstOpenDay;
  const [picked, setPicked] = useState<string | null>(null);
  const slots = days.find(([d]) => d === activeDay)?.[1] ?? [];
  const chosen = slots.find((s) => s.startsAt === picked) ?? null;

  function confirm() {
    if (!coach || !chosen) return;
    startTransition(async () => {
      const result = await bookPtSession(coach.id, chosen.startsAt, chosen.slotMinutes);
      toast.show(result.ok ? result.message : result.error, result.ok ? "ok" : "error");
      if (result.ok) router.push("/app/pt");
    });
  }

  if (coaches.length === 0) {
    return <p className="rule py-8 text-center text-sm text-muted">No coach has opened PT hours yet.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {coaches.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {coaches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCoachId(c.id);
                setPicked(null);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 ${
                c.id === coach?.id ? "border-brand bg-brand/10" : "border-ink-3"
              }`}
            >
              <Avatar name={c.name} src={c.avatarUrl} size={24} />
              <span className="display text-lg leading-none">{c.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Avatar name={coach.name} src={coach.avatarUrl} size={40} />
          <div className="flex flex-col">
            <span className="display text-[20px] leading-none">{coach.name}</span>
            <span className="eyebrow">{coach.title ?? "Coach"} · {coach.hoursLabel}</span>
          </div>
        </div>
      )}

      {days.length === 0 ? (
        <p className="rule py-8 text-center text-sm text-muted">Nothing open in the next two weeks. Try another coach.</p>
      ) : (
        <>
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4">
            {days.map(([d, list]) => {
              const open = list.some((s) => !s.taken);
              const active = d === activeDay;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDay(d);
                    setPicked(null);
                  }}
                  className={`flex w-[52px] shrink-0 flex-col items-center gap-0.5 border-b-2 pb-1.5 pt-1 ${
                    active ? "border-brand" : "border-transparent"
                  }`}
                >
                  <span className="eyebrow">{dayInitial(d)}</span>
                  <span className={`display tnum text-[22px] leading-none ${open ? "" : "text-muted"}`}>{dayNumber(d)}</span>
                  <span className={`h-1 w-1 rounded-full ${open ? "bg-paper" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <p className="eyebrow">
              {formatDay(slots[0]?.startsAt ?? activeDay)}
              {slots[0]?.venueName ? ` · ${shortVenue(slots[0].venueName)}` : ""}
            </p>
            {slots.map((s) => {
              const on = s.startsAt === picked;
              return (
                <button
                  key={s.startsAt}
                  type="button"
                  disabled={s.taken}
                  onClick={() => setPicked(s.startsAt)}
                  className={`flex h-[52px] items-center justify-between rounded-md border px-4 text-left ${
                    s.taken ? "border-ink-3 opacity-40" : on ? "border-brand bg-brand/10" : "border-ink-3"
                  }`}
                >
                  <span className="display tnum text-[22px] leading-none">{formatTime(s.startsAt)}</span>
                  <span className={`text-xs ${on ? "display text-brand" : "text-muted"}`}>
                    {s.taken ? "Taken" : on ? "Selected" : `${s.slotMinutes} min`}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {chosen ? (
        <div className="rule flex flex-col gap-1.5 pt-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Coach</span><span>{coach.name}</span></div>
          <div className="flex justify-between"><span className="text-muted">Uses</span><span>1 of {sessionsLeft} PT sessions</span></div>
          <div className="flex justify-between">
            <span className="text-muted">Cancel free until</span>
            <span>{formatTime(new Date(new Date(chosen.startsAt).getTime() - CANCELLATION_CUTOFF_HOURS * 3_600_000))}, {formatDay(new Date(new Date(chosen.startsAt).getTime() - CANCELLATION_CUTOFF_HOURS * 3_600_000))}</span>
          </div>
        </div>
      ) : null}

      <Button onClick={confirm} loading={pending} disabled={!chosen}>
        {chosen ? "Book — 1 PT session" : "Pick a time"}
      </Button>
      <p className="-mt-2 text-center text-xs text-muted">Confirmed the moment you tap. Your coach gets it in their diary.</p>
    </div>
  );
}
