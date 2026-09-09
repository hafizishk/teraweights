import { describe, expect, it } from "vitest";
import { dayInitial, dayNumber, sgtDate, sgtMidnight, weekOf } from "./week";

describe("Singapore calendar helpers", () => {
  it("rolls over to the next SGT day late in UTC", () => {
    // 2026-09-09 17:00 UTC is 2026-09-10 01:00 in Singapore.
    expect(sgtDate("2026-09-09T17:00:00Z")).toBe("2026-09-10");
    expect(sgtDate("2026-09-09T04:00:00Z")).toBe("2026-09-09");
  });

  it("maps SGT midnight to the right UTC instant", () => {
    expect(sgtMidnight("2026-09-14").toISOString()).toBe("2026-09-13T16:00:00.000Z");
  });
});

describe("weekOf", () => {
  const wed9Sep = new Date("2026-09-09T04:00:00Z"); // Wed 9 Sep, noon SGT

  it("starts the week on Monday", () => {
    const w = weekOf(wed9Sep);
    expect(w.days[0]).toBe("2026-09-07");
    expect(w.days[6]).toBe("2026-09-13");
    expect(w.startIso).toBe("2026-09-06T16:00:00.000Z");
    expect(w.endIso).toBe("2026-09-13T16:00:00.000Z");
  });

  it("shifts by whole weeks", () => {
    expect(weekOf(wed9Sep, 1).days[0]).toBe("2026-09-14");
    expect(weekOf(wed9Sep, -1).days[0]).toBe("2026-08-31");
  });

  it("labels the range", () => {
    expect(weekOf(wed9Sep).label).toBe("7–13 Sep");
    expect(weekOf(wed9Sep, 3).label).toBe("28 Sep – 4 Oct");
  });

  it("treats Sunday as the last day of its week", () => {
    const sun13 = new Date("2026-09-13T02:00:00Z"); // Sun 13 Sep, 10am SGT
    expect(weekOf(sun13).days[0]).toBe("2026-09-07");
  });

  it("renders the week strip", () => {
    const w = weekOf(wed9Sep);
    expect(dayInitial(w.days[0])).toBe("Mon");
    expect(dayNumber(w.days[0])).toBe("7");
  });
});
