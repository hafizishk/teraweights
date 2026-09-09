"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ClassBadge } from "@/components/ui/Badge";
import { SessionSheet } from "@/components/member/SessionSheet";
import { formatTime } from "@/lib/format";
import { dayInitial, dayNumber, sgtDate, type Week } from "@/lib/week";
import type { SessionView } from "@/lib/view/session-view";

export function BookWeek({
  views,
  week,
  offset,
  filters,
  filterKey,
  openSessionId,
}: {
  views: SessionView[];
  week: Week;
  offset: number;
  filters: { key: string; label: string }[];
  filterKey: string;
  openSessionId: string | null;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(openSessionId);

  const today = sgtDate(new Date());
  const open = views.find((v) => v.id === openId) ?? null;

  function href(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) p.set(k, v);
    p.delete("s");
    return `${pathname}?${p.toString()}`;
  }

  const byDay = week.days.map((day) => ({
    day,
    sessions: views.filter((v) => sgtDate(v.startsAt) === day),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl">Book</h1>
        <p className="text-sm text-muted">{week.label}</p>
      </div>

      <nav aria-label="Class type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {filters.map(({ key, label }) => (
          <Link
            key={key}
            href={href({ f: key })}
            scroll={false}
            aria-current={key === filterKey ? "true" : undefined}
            className={`display shrink-0 rounded-full border px-3 py-1.5 text-base leading-none tracking-wide ${
              key === filterKey
                ? "border-brand bg-brand text-paper"
                : "border-ink-3 text-muted hover:text-paper"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2">
        <Link
          href={href({ w: String(offset - 1) })}
          scroll={false}
          aria-label="Previous week"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-3 text-muted hover:text-paper"
        >
          ‹
        </Link>
        <ol className="flex flex-1 justify-between gap-1">
          {week.days.map((day) => {
            const count = views.filter((v) => sgtDate(v.startsAt) === day).length;
            return (
              <li key={day} className="flex flex-1 flex-col items-center gap-0.5">
                <span className="text-[11px] uppercase tracking-wide text-muted">{dayInitial(day)}</span>
                <span
                  className={`display flex h-8 w-8 items-center justify-center rounded-full text-lg ${
                    day === today ? "bg-paper text-ink" : "text-paper"
                  }`}
                >
                  {dayNumber(day)}
                </span>
                <span className={`h-1 w-1 rounded-full ${count ? "bg-brand" : "bg-transparent"}`} />
              </li>
            );
          })}
        </ol>
        <Link
          href={href({ w: String(offset + 1) })}
          scroll={false}
          aria-label="Next week"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-ink-3 text-muted hover:text-paper"
        >
          ›
        </Link>
      </div>

      {views.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-3 px-4 py-8 text-center text-sm text-muted">
          No sessions this week. Try another week or clear the filter.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {byDay
            .filter((d) => d.sessions.length > 0)
            .map(({ day, sessions }) => (
              <section key={day} className="flex flex-col gap-2">
                <h2 className="text-base text-muted">
                  {dayInitial(day)} {dayNumber(day)}
                </h2>
                <ul className="flex flex-col gap-2">
                  {sessions.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(v.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-ink-3 bg-ink-2 px-3 py-3 text-left hover:border-muted"
                      >
                        <span className="display w-16 shrink-0 text-lg leading-none">
                          {formatTime(v.startsAt)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-center gap-2">
                            <ClassBadge slug={v.classSlug} />
                            {v.bookingStatus === "booked" ? (
                              <span className="text-xs text-paper">Booked</span>
                            ) : null}
                            {v.bookingStatus === "waitlisted" ? (
                              <span className="text-xs text-muted">Waitlisted</span>
                            ) : null}
                          </span>
                          <span className="truncate text-xs text-muted">{v.venueName}</span>
                        </span>
                        <span
                          className={`shrink-0 text-xs ${v.full ? "text-brand" : "text-muted"}`}
                        >
                          {v.window === "closed" || v.window === "session_cancelled"
                            ? "Closed"
                            : v.spotsLabel}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      {open ? <SessionSheet view={open} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}
