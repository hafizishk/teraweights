import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl, icsDate, icsStamp, prefersIcs } from "./calendar";

const NOW = new Date("2026-09-18T06:00:00Z");

describe("calendar", () => {
  it("formats stamps and dates the way iCalendar wants", () => {
    expect(icsStamp("2026-09-17T12:00:00.000Z")).toBe("20260917T120000Z");
    expect(icsDate("2026-09-12")).toBe("20260912");
    expect(icsDate("2026-09-12", 1)).toBe("20260913");
  });

  it("builds a timed event with escaped text and CRLF endings", () => {
    const ics = buildIcs(
      {
        uid: "session-1@teraweights",
        title: "Energise East, Teraweights",
        description: "Coach: Faizal\nBring water",
        location: "Bedok Reservoir Road (East); gate 2",
        start: "2026-09-17T12:00:00Z",
        end: "2026-09-17T13:00:00Z",
      },
      NOW,
    );
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20260917T120000Z");
    expect(ics).toContain("DTEND:20260917T130000Z");
    expect(ics).toContain("SUMMARY:Energise East\\, Teraweights");
    expect(ics).toContain("DESCRIPTION:Coach: Faizal\\nBring water");
    expect(ics).toContain("LOCATION:Bedok Reservoir Road (East)\\; gate 2");
    expect(ics).toContain("DTSTAMP:20260918T060000Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("builds an all-day event from a date", () => {
    const ics = buildIcs({ uid: "u", title: "PA.ROX", start: "2026-09-12", allDay: true }, NOW);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260912");
    expect(ics).toContain("DTEND;VALUE=DATE:20260913");
  });

  it("folds long lines", () => {
    const ics = buildIcs({ uid: "u", title: "x".repeat(200), start: "2026-09-17T12:00:00Z", end: "2026-09-17T13:00:00Z" }, NOW);
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(74);
  });

  it("makes a Google Calendar link", () => {
    const url = googleCalendarUrl({
      uid: "u",
      title: "Energise East",
      location: "Bedok",
      start: "2026-09-17T12:00:00Z",
      end: "2026-09-17T13:00:00Z",
    });
    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    expect(url).toContain("dates=20260917T120000Z%2F20260917T130000Z");
    expect(url).toContain("text=Energise+East");
    expect(url).toContain("location=Bedok");
  });

  it("sends Apple devices to the .ics and everyone else to Google", () => {
    expect(prefersIcs("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(prefersIcs("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe(false);
  });
});
