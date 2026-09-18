import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";
import { dayInitial, type Week } from "@/lib/week";

export type WeekDay = {
  date: string;
  /** Teraweights classes attended that day. */
  classes: number;
  /** PT sessions attended that day. */
  pt: number;
  /** Own workouts from the health store. */
  workouts: number;
  kcal: number;
};

type Dated = { at: string; kcal: number | null };

export function buildWeekDays(week: Week, classes: Dated[], pt: Dated[], workouts: Dated[]): WeekDay[] {
  const days: WeekDay[] = week.days.map((date) => ({ date, classes: 0, pt: 0, workouts: 0, kcal: 0 }));
  const byDate = new Map(days.map((d) => [d.date, d]));
  const add = (items: Dated[], key: "classes" | "pt" | "workouts") => {
    for (const it of items) {
      const d = byDate.get(formatInTimeZone(new Date(it.at), TZ, "yyyy-MM-dd"));
      if (!d) continue;
      d[key] += 1;
      d.kcal += it.kcal ?? 0;
    }
  };
  add(classes, "classes");
  add(pt, "pt");
  add(workouts, "workouts");
  return days;
}

/**
 * This week on You: a bar a day, red for classes, PRIME yellow for PT, blue
 * for the member's own workouts, then three numbers and one sentence. Own
 * workouts count toward the week, never the streak.
 */
export function WeekActivity({ days, label, nextBookedDay }: { days: WeekDay[]; label: string; nextBookedDay: string | null }) {
  const maxKcal = Math.max(1, ...days.map((d) => d.kcal));
  const classes = days.reduce((n, d) => n + d.classes, 0);
  const pt = days.reduce((n, d) => n + d.pt, 0);
  const sessions = classes + pt;
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
      <div className="grid h-16 grid-cols-7 items-end gap-1" role="img" aria-label={`${classes} classes, ${pt} PT and ${workouts} own workouts this week`}>
        {days.map((d) => {
          const height = d.kcal > 0 ? Math.max(12, Math.round((d.kcal / maxKcal) * 100)) : 6;
          const tone = d.classes > 0 ? "bg-brand" : d.pt > 0 ? "bg-prime" : d.workouts > 0 ? "bg-west" : "bg-ink-3";
          return <span key={d.date} className={`block rounded-t-sm ${tone}`} style={{ height: `${height}%` }} />;
        })}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
        {days.map((d) => (
          <span key={d.date}>{dayInitial(d.date)}</span>
        ))}
      </div>
      {pt > 0 || workouts > 0 ? (
        <div className="flex gap-3 text-[10px] text-muted">
          <Key tone="bg-brand" label="Class" />
          {pt > 0 ? <Key tone="bg-prime" label="PT" /> : null}
          {workouts > 0 ? <Key tone="bg-west" label="Own workout" /> : null}
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-3">
        <Stat value={sessions} label={sessions === 1 ? "session" : "sessions"} />
        <Stat value={workouts} label={workouts === 1 ? "own workout" : "own workouts"} />
        <Stat value={kcal.toLocaleString("en-SG")} label="active kcal" />
      </div>
      <p className="text-sm text-muted">{line}</p>
    </section>
  );
}

function Key({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-sm ${tone}`} />
      {label}
    </span>
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
