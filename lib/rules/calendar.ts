/**
 * "Add to calendar" for a booked session, PT slot or event registration.
 * Two outputs from one description: an .ics file (Apple Calendar, Outlook)
 * and a Google Calendar link. Pure; the API route and the sheet call these.
 */

export type CalendarEvent = {
  /** Stable per booking so re-adding updates rather than duplicates. */
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  /** ISO timestamps. For an all-day event, start is a YYYY-MM-DD date and end is ignored. */
  start: string;
  end?: string | null;
  allDay?: boolean;
  url?: string | null;
};

const PRODID = "-//Teraweights//Member app//EN";

/** 20260917T120000Z */
export function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** 20260917 for an all-day date, plus n days. */
export function icsDate(date: string, plusDays = 0): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + plusDays);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 folds lines longer than 75 octets; keep it simple and fold at 73 characters. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = " " + rest.slice(73);
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(ev: CalendarEvent, now: Date = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:${PRODID}`, "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT"];
  lines.push(`UID:${ev.uid}`);
  lines.push(`DTSTAMP:${icsStamp(now.toISOString())}`);
  if (ev.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${icsDate(ev.start)}`);
    lines.push(`DTEND;VALUE=DATE:${icsDate(ev.start, 1)}`);
  } else {
    lines.push(`DTSTART:${icsStamp(ev.start)}`);
    lines.push(`DTEND:${icsStamp(ev.end ?? ev.start)}`);
  }
  lines.push(`SUMMARY:${escapeText(ev.title)}`);
  if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
  if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
  if (ev.url) lines.push(`URL:${ev.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(ev: CalendarEvent): string {
  const dates = ev.allDay ? `${icsDate(ev.start)}/${icsDate(ev.start, 1)}` : `${icsStamp(ev.start)}/${icsStamp(ev.end ?? ev.start)}`;
  const p = new URLSearchParams({ action: "TEMPLATE", text: ev.title, dates });
  if (ev.description) p.set("details", ev.description);
  if (ev.location) p.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Apple devices open .ics files natively; everything else gets the Google link. */
export function prefersIcs(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Macintosh/i.test(userAgent);
}
