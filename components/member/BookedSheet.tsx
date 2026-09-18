"use client";

import { useEffect, useState } from "react";
import { ClassBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { googleCalendarUrl, prefersIcs, type CalendarEvent } from "@/lib/rules/calendar";
import type { ClassSlug } from "@/lib/types";

export type BookedDetails = {
  /** "You're all set", "You're on the waitlist", "You're registered". */
  heading: string;
  sub: string;
  eyebrow: string;
  title: string;
  when: string;
  where: string | null;
  classSlug?: ClassSlug;
  /**
   * Where the .ics comes from, and the same event described inline for the
   * Google Calendar link. Null when there is nothing to add, for a waitlist.
   */
  calendar: { kind: "session" | "pt" | "event"; id: string; slot?: string | null; event: CalendarEvent } | null;
};

/**
 * The moment after a booking lands. A tick, what was booked, and a way to
 * put it in the phone's calendar. Apple devices get the .ics from
 * /api/calendar, which iOS opens straight into Calendar; everything else
 * gets a Google Calendar link, which works in any browser and in the
 * Android shell.
 */
export function BookedSheet({ details, onDone, doneLabel = "Done" }: { details: BookedDetails; onDone: () => void; doneLabel?: string }) {
  const [apple, setApple] = useState(false);
  useEffect(() => setApple(prefersIcs(navigator.userAgent)), []);

  const cal = details.calendar;
  const calendarHref = cal
    ? apple
      ? `/api/calendar?kind=${cal.kind}&id=${encodeURIComponent(cal.id)}${cal.slot ? `&slot=${encodeURIComponent(cal.slot)}` : ""}`
      : googleCalendarUrl(cal.event)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={details.heading}>
      <button type="button" aria-label="Close" onClick={onDone} className="absolute inset-0 bg-ink/70 backdrop-blur-sm" />
      <div className="safe-bottom relative w-full max-w-[480px] rounded-t-2xl border-t border-ink-3 bg-ink-2 p-5">
        <div className="flex flex-col items-center gap-3 pb-5 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--color-brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h2 className="text-[30px] leading-none">{details.heading}</h2>
          <p className="max-w-[320px] text-sm text-muted">{details.sub}</p>
        </div>

        <div className="rule flex flex-col gap-1.5 py-4">
          <div className="flex items-center gap-2">
            {details.classSlug ? <ClassBadge slug={details.classSlug} /> : null}
            <span className="eyebrow">{details.eyebrow}</span>
          </div>
          <span className="display text-[26px] leading-none">{details.title}</span>
          <span className="text-sm">{details.when}</span>
          {details.where ? <span className="text-sm text-muted">{details.where}</span> : null}
        </div>

        <div className="flex flex-col gap-2 pt-4">
          {calendarHref ? (
            <a
              href={calendarHref}
              target={apple ? undefined : "_blank"}
              rel={apple ? undefined : "noreferrer"}
              className="display inline-flex h-12 w-full items-center justify-center rounded-md bg-paper px-5 text-lg tracking-wide text-ink hover:bg-paper-2"
            >
              Add to calendar
            </a>
          ) : null}
          <Button type="button" variant={calendarHref ? "ghost" : "primary"} onClick={onDone}>
            {doneLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
