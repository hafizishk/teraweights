import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";
import { dayInitial, type Week } from "@/lib/week";

export type WeekDay = {
  date: string;
  /** Teraweights sessions attended that day. */
  sessions: number;
  /** Own workouts from the health store. */
  workouts: number;
  kcal: number;
};

export function buildWeekDays(
  week: Week,
  attended: { starts_at: string; kcal: number | null }[],
  workouts: { started_at: string; kcal: number | null }[],
): WeekDay[] {
  const days: WeekDay[] = week.days.map((date) => ({ date, sessions: 0, workouts: 0, kcal: 0 }));
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const a of attended) {
    const d = byDate.get(formatInTimeZone(new Date(a.starts_at), TZ, "yyyy-MM-dd"));
    if (d) {
      d.sessions += 1;
      d.kcal += a.kcal ?? 0;
    }
  }
  for (const w of workouts) {
    const d = byDate.get(formatInTimeZone(new Date(w.started_at), TZ, "yyyy-MM-dd"));
    if (d) {
      d.workouts += 1;
      d.kcal += w.kcal ?? 0;
    }
  }
  return days;
}

/**
 * This week on You: a bar a day, red for Teraweights sessions, blue for the
 * member's own workouts, then three numbers and one sentence. Own workouts
 * count toward the week, never the streak (lib/rules/streak.ts is unchanged).
 */
export function WeekActivity({ days, label, nextBookedDay }: { days: WeekDay[]; label: string; nextBookedDay: string | null }) {
  const maxKcal = Math.max(1, ...days.map((d) => d.kcal));
  const sessions = days.reduce((n, d) => n + d.sessions, 0);
  const workouts = days.reduce((n, d) => n + d.workouts, 0);
  const kcal = days.reduce((n, d) => n + d.kcal, 0);

  const line =
    workouts > 0 && sessions > 0
      ? `Your own ${workouts === 1 ? "workout counts" : "workouts count"} toward your week, not your streak.${nextBookedDay ? ` ${nextBookedDay} makes it ${sessions + 1}.` : ""}`
      : workouts > 0
        ? `${workouts === 1 ? "A workout of your own" : `${workouts} workouts of your own`} this week, no session yet.${nextBookedDay ? ` ${nextBookedDay} is booked.` : " Book one to keep the streak."}`
        : sessions > 0
          ? `${sessions} ${sessions === 1 ? "session" : "sessions"} so far.${nextBookedDay ? ` ${nextBookedDay} makes it ${sessions + 1}.` : ""}`
          : nextBookedDay
            ? `Nothing yet. ${nextBookedDay} is booked.`
            : "Nothing yet. Book a session to start the week.";

  return (
    <section className="rule flex flex-col gap-3 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl">This week</h2>
        <span className="text-xs text-muted">{label}</span>
      </div>
      <div className="grid h-16 grid-cols-7 items-end gap-1" role="img" aria-label={`${sessions} sessions and ${workouts} own workouts this week`}>
        {days.map((d) => {
          const height = d.kcal > 0 ? Math.max(12, Math.round((d.kcal / maxKcal) * 100)) : 6;
          const tone = d.sessions > 0 ? "bg-brand" : d.workouts > 0 ? "bg-west" : "bg-ink-3";
          return <span key={d.date} className={`block rounded-t-sm ${tone}`} style={{ height: `${height}%` }} />;
        })}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
        {days.map((d) => (
          <span key={d.date}>{dayInitial(d.date)}</span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat value={sessions} label={sessions === 1 ? "session" : "sessions"} />
        <Stat value={workouts} label={workouts === 1 ? "own workout" : "own workouts"} />
        <Stat value={kcal.toLocaleString("en-SG")} label="active kcal" />
      </div>
      <p className="text-sm text-muted">{line}</p>
    </section>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="display tnum text-[30px] leading-none">{value}</span>
      <span className="eyebrow">{label}</span>
    </div>
  );
}
