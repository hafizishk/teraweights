import { describe, expect, it } from "vitest";
import { trialEligibility } from "./trial";

const NOW = new Date("2026-09-10T04:00:00Z");

const expiredMembership = { kind: "membership" as const, payment_status: "paid" as const, expires_at: "2026-08-31T15:59:59Z", is_trial: false };
const activeMembership = { kind: "membership" as const, payment_status: "paid" as const, expires_at: "2026-09-28T15:59:59Z", is_trial: false };
const unpaidMembership = { kind: "membership" as const, payment_status: "pending" as const, expires_at: "2026-09-28T15:59:59Z", is_trial: false };
const credits = { kind: "credits" as const, payment_status: "paid" as const, expires_at: "2026-11-15T15:59:59Z", is_trial: false };
const usedTrial = { kind: "membership" as const, payment_status: "paid" as const, expires_at: "2026-07-07T00:00:00Z", is_trial: true };

describe("trialEligibility", () => {
  it("is open to someone with nothing", () => {
    expect(trialEligibility([], NOW)).toEqual({ eligible: true, reason: null });
  });

  it("is open to Priya, whose membership expired", () => {
    expect(trialEligibility([expiredMembership], NOW).eligible).toBe(true);
  });

  it("is open to someone on credits only", () => {
    expect(trialEligibility([credits], NOW).eligible).toBe(true);
  });

  it("is open when a membership exists but is unpaid", () => {
    expect(trialEligibility([unpaidMembership], NOW).eligible).toBe(true);
  });

  it("is closed to Aisyah, who has an active membership", () => {
    expect(trialEligibility([activeMembership, credits], NOW)).toEqual({ eligible: false, reason: "active_membership" });
  });

  it("is closed forever once used, even if it has expired", () => {
    expect(trialEligibility([usedTrial], NOW)).toEqual({ eligible: false, reason: "used" });
  });

  it("reports 'used' ahead of 'active membership'", () => {
    expect(trialEligibility([usedTrial, activeMembership], NOW).reason).toBe("used");
  });
});
