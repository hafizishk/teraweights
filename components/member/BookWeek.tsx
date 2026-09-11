"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ClassBadge } from "@/components/ui/Badge";
import { SessionSheet } from "@/components/member/SessionSheet";
import { formatTime } from "@/lib/format";
import { dayInitial, dayNumber, sgtDate, type Week } from "@/lib/week";
import type { SessionView } from "@/lib/view/session-view";

/**
 * The week as a timetable. Filters are underlined words, days are a strip of
 * numerals, and each session is a ruled row with its time set large. The
 * black page is the surface; nothing sits in a box.
 */
export function BookWeek({
  views,
  week,
  offset,
  filters,
  filterKey,
  openSessionId,
  trialEligible = false,
}: {
  views: SessionView[];
  week: Week;
  offset: number;
  filters: { key: string; label: string }[];
  filterKey: string;
  openSessionId: string | null;
  trialEligible?: boolean;
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
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[34px] leading-none">Book</h1>
        <p className="eyebrow">{week.label}</p>
      </div>

      <nav aria-label="Class type" className="-mx-4 flex gap-5 overflow-x-auto border-b border-ink-3 px-4">
        {filters.map(({ key, label }) => {
          const active = key === filterKey;
          return (
            <Link
              key={key}
              href={href({ f: key })}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={`display -mb-px shrink-0 border-b-2 pb-2 text-lg leading-none tracking-wide ${
                active ? "border-brand text-paper" : "border-transparent text-muted hover:text-paper"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-1">
        <Link
          href={href({ w: String(offset - 1) })}
          scroll={false}
          aria-label="Previous week"
          className="display flex h-9 w-8 items-center justify-center text-xl text-muted hover:text-paper"
        >
          ‹
        </Link>
        <ol className="flex flex-1 justify-between">
          {week.days.map((day) => {
            const count = views.filter((v) => sgtDate(v.startsAt) === day).length;
            const isToday = day === today;
            return (
              <li key={day} className="flex flex-1 flex-col items-center gap-0.5">
                <span className="eyebrow">{dayInitial(day)}</span>
                <span className={`display tnum text-[22px] leading-none ${isToday ? "text-brand" : "text-paper"}`}>
                  {dayNumber(day)}
                </span>
                <span className={`mt-0.5 h-1 w-1 rounded-full ${count ? "bg-paper/70" : "bg-transparent"}`} />
              </li>
            );
          })}
        </ol>
        <Link
          href={href({ w: String(offset + 1) })}
          scroll={false}
          aria-label="Next week"
          className="display flex h-9 w-8 items-center justify-center text-xl text-muted hover:text-paper"
        >
          ›
        </Link>
      </div>

      {views.length === 0 ? (
        <p className="rule py-8 text-sm text-muted">No sessions this week. Try another week or clear the filter.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {byDay
            .filter((d) => d.sessions.length > 0)
            .map(({ day, sessions }) => (
              <section key={day}>
                <h2 className="pb-1 text-base text-muted">
                  {dayInitial(day)} {dayNumber(day)}
                </h2>
                <ul>
                  {sessions.map((v) => {
                    const closed = v.window === "closed" || v.window === "session_cancelled";
                    return (
                      <li key={v.id} className="rule">
                        <button
                          type="button"
                          onClick={() => setOpenId(v.id)}
                          className="flex w-full items-center gap-3 py-3 text-left"
                        >
                          <span className="display tnum w-[80px] shrink-0 text-[24px] leading-none">
                            {formatTime(v.startsAt)}
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex items-center gap-2">
                              <ClassBadge slug={v.classSlug} />
                              {v.bookingStatus === "booked" ? (
                                <span className="eyebrow text-paper">Booked</span>
                              ) : null}
                              {v.bookingStatus === "waitlisted" ? <span className="eyebrow">Waitlisted</span> : null}
                            </span>
                            <span className="truncate text-[13px] text-muted">{v.venueName}</span>
                          </span>
                          <span className={`shrink-0 text-xs ${v.full ? "text-brand" : "text-muted"}`}>
                            {closed ? "Closed" : v.spotsLabel}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}

      {open ? <SessionSheet view={open} onClose={() => setOpenId(null)} trialEligible={trialEligible} /> : null}
    </div>
  );
}
