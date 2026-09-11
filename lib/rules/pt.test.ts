import { describe, expect, it } from "vitest";
import { daysToRenew, describeHours, ptSlots, slotsByDay, type OpenHours } from "./pt";

// Wed 9 Sep 2026, noon Singapore.
const NOW = new Date("2026-09-09T04:00:00Z");

const hours: OpenHours[] = [
  { weekday: 2, start_time: "06:00:00", end_time: "09:00:00", slot_minutes: 60, venue_id: "v1" },
  { weekday: 4, start_time: "06:00:00", end_time: "08:00:00", slot_minutes: 60, venue_id: "v1" },
];

describe("ptSlots", () => {
  it("lays out one slot per hour inside each window", () => {
    const slots = ptSlots(hours, [], NOW, 7);
    // Thu 10 Sep: 6, 7. Tue 15 Sep: 6, 7, 8.
    expect(slots.map((s) => s.startsAt.toISOString())).toEqual([
      "2026-09-09T22:00:00.000Z",
      "2026-09-09T23:00:00.000Z",
      "2026-09-14T22:00:00.000Z",
      "2026-09-14T23:00:00.000Z",
      "2026-09-15T00:00:00.000Z",
    ]);
  });

  it("flags a slot taken when it overlaps a class or another PT", () => {
    const slots = ptSlots(hours, [{ starts_at: "2026-09-14T22:30:00Z", ends_at: "2026-09-14T23:30:00Z" }], NOW, 7);
    const taken = slots.filter((s) => s.taken).map((s) => s.startsAt.toISOString());
    expect(taken).toEqual(["2026-09-14T22:00:00.000Z", "2026-09-14T23:00:00.000Z"]);
  });

  it("drops slots inside the notice period", () => {
    // 6:30pm Wed: Thu 6am is 11.5 hours away, under the 12-hour notice; 7am clears it.
    const evening = new Date("2026-09-09T10:30:00Z");
    const slots = ptSlots(hours, [], evening, 2);
    expect(slots.map((s) => s.startsAt.toISOString())).toEqual(["2026-09-09T23:00:00.000Z"]);
  });

  it("returns nothing when the coach has no hours", () => {
    expect(ptSlots([], [], NOW)).toEqual([]);
  });
});

describe("slotsByDay", () => {
  it("groups by Singapore calendar day", () => {
    const grouped = slotsByDay(ptSlots(hours, [], NOW, 7));
    expect([...grouped.keys()]).toEqual(["2026-09-10", "2026-09-15"]);
    expect(grouped.get("2026-09-15")).toHaveLength(3);
  });
});

describe("describeHours", () => {
  it("names the days", () => {
    expect(describeHours(hours)).toBe("Tue and Thu");
    expect(describeHours([])).toBe("No PT hours set");
  });
});

describe("daysToRenew", () => {
  it("counts whole days and floors at zero", () => {
    expect(daysToRenew("2026-09-21T15:59:59Z", NOW)).toBe(13);
    expect(daysToRenew("2026-09-01T00:00:00Z", NOW)).toBe(0);
  });
});
