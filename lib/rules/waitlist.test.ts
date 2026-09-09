import { describe, expect, it } from "vitest";
import { isFull, nextToPromote, spotsLabel, spotsLeft } from "./waitlist";

describe("capacity", () => {
  it("counts spots left", () => {
    expect(spotsLeft({ capacity: 20, bookedCount: 17 })).toBe(3);
    expect(spotsLeft({ capacity: 6, bookedCount: 6 })).toBe(0);
    expect(spotsLeft({ capacity: 6, bookedCount: 8 })).toBe(0);
  });

  it("labels spots per section 8", () => {
    expect(spotsLabel({ capacity: 20, bookedCount: 17 })).toBe("3 left");
    expect(spotsLabel({ capacity: 20, bookedCount: 19 })).toBe("1 left");
    expect(spotsLabel({ capacity: 6, bookedCount: 6 })).toBe("Full — waitlist");
  });

  it("is full at capacity", () => {
    expect(isFull({ capacity: 6, bookedCount: 6 })).toBe(true);
    expect(isFull({ capacity: 6, bookedCount: 5 })).toBe(false);
  });
});

describe("nextToPromote", () => {
  it("promotes the earliest joiner", () => {
    const rows = [
      { id: "b", created_at: "2026-09-07T02:00:00Z" },
      { id: "a", created_at: "2026-09-06T02:00:00Z" },
      { id: "c", created_at: "2026-09-08T02:00:00Z" },
    ];
    expect(nextToPromote(rows)?.id).toBe("a");
  });

  it("returns null with an empty waitlist", () => {
    expect(nextToPromote([])).toBeNull();
  });
});
