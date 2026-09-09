import { describe, expect, it } from "vitest";
import { CANCELLATION_CUTOFF_HOURS, cancellationOutcome } from "./cancellation";

const SESSION = { starts_at: "2026-09-19T00:00:00Z" }; // Sat 19 Sep 08:00 SGT
const SEVEN_HOURS_BEFORE = new Date("2026-09-18T17:00:00Z");
const FIVE_HOURS_BEFORE = new Date("2026-09-18T19:00:00Z");

describe("cancellationOutcome", () => {
  it("returns the credit outside the cutoff", () => {
    const r = cancellationOutcome({ status: "booked", credits_used: 1 }, SESSION, SEVEN_HOURS_BEFORE);
    expect(r).toMatchObject({ allowed: true, late: false, creditsRefunded: 1, warning: null });
  });

  it("forfeits the credit inside the cutoff and warns first", () => {
    const r = cancellationOutcome({ status: "booked", credits_used: 1 }, SESSION, FIVE_HOURS_BEFORE);
    expect(r.allowed).toBe(true);
    expect(r.late).toBe(true);
    expect(r.creditsRefunded).toBe(0);
    expect(r.warning).toContain(String(CANCELLATION_CUTOFF_HOURS));
  });

  it("lets a membership booking cancel late with no warning", () => {
    const r = cancellationOutcome({ status: "booked", credits_used: 0 }, SESSION, FIVE_HOURS_BEFORE);
    expect(r).toMatchObject({ allowed: true, late: true, creditsRefunded: 0, warning: null });
  });

  it("costs nothing to leave a waitlist", () => {
    const r = cancellationOutcome({ status: "waitlisted", credits_used: 0 }, SESSION, FIVE_HOURS_BEFORE);
    expect(r).toMatchObject({ allowed: true, late: false, creditsRefunded: 0 });
  });

  it("refuses to cancel a booking that is already done", () => {
    for (const status of ["cancelled", "attended", "no_show"] as const) {
      expect(cancellationOutcome({ status, credits_used: 1 }, SESSION, SEVEN_HOURS_BEFORE).allowed).toBe(false);
    }
  });

  it("treats the cutoff boundary as on time", () => {
    const exactly = new Date(new Date(SESSION.starts_at).getTime() - CANCELLATION_CUTOFF_HOURS * 3_600_000);
    expect(cancellationOutcome({ status: "booked", credits_used: 1 }, SESSION, exactly).late).toBe(false);
  });
});
