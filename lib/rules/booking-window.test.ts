import { describe, expect, it } from "vitest";
import { bookingWindow, isBookable } from "./booking-window";

const SESSION = { starts_at: "2026-09-15T12:00:00Z", status: "scheduled" } as const;

describe("bookingWindow", () => {
  it("is open well before the session", () => {
    expect(bookingWindow(SESSION, new Date("2026-09-14T12:00:00Z"))).toBe("open");
  });

  it("closes exactly one hour before the start", () => {
    expect(bookingWindow(SESSION, new Date("2026-09-15T10:59:00Z"))).toBe("closing_soon");
    expect(bookingWindow(SESSION, new Date("2026-09-15T11:00:00Z"))).toBe("closed");
    expect(bookingWindow(SESSION, new Date("2026-09-15T12:30:00Z"))).toBe("closed");
  });

  it("reports a cancelled session", () => {
    expect(bookingWindow({ ...SESSION, status: "cancelled" }, new Date("2026-09-14T12:00:00Z"))).toBe(
      "session_cancelled",
    );
  });

  it("is bookable only while the window is open", () => {
    expect(isBookable(SESSION, new Date("2026-09-14T12:00:00Z"))).toBe(true);
    expect(isBookable(SESSION, new Date("2026-09-15T11:30:00Z"))).toBe(false);
    expect(isBookable({ ...SESSION, status: "completed" }, new Date("2026-09-14T12:00:00Z"))).toBe(false);
  });
});
