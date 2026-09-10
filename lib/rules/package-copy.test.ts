import { describe, expect, it } from "vitest";
import { describePackage } from "./package-copy";

const NOW = new Date("2026-09-10T04:00:00Z");
const base = { tier: "energise" as const, variant: null, credits_remaining: null, is_trial: false };

describe("describePackage", () => {
  it("turns Aisyah's Energise X into sessions", () => {
    const p = { ...base, kind: "credits" as const, credits_remaining: 6, expires_at: "2026-11-15T15:59:59Z" };
    expect(describePackage(p, 2, NOW)).toBe("6 credits, about 3 weeks at 2 a week");
    expect(describePackage(p, 3, NOW)).toBe("6 credits, about 2 weeks at 3 a week");
  });

  it("warns when the credits outlast the expiry at that pace", () => {
    const p = { ...base, kind: "credits" as const, credits_remaining: 10, expires_at: "2026-09-20T15:59:59Z" };
    expect(describePackage(p, 1, NOW)).toBe("10 credits, use by 20 Sep 2026");
  });

  it("describes memberships by what they cover", () => {
    expect(describePackage({ ...base, kind: "membership", variant: "weekday", expires_at: "2026-09-28T15:59:59Z" }, 2, NOW))
      .toBe("Unlimited East and West, Mon–Fri, until 28 Sep 2026");
    expect(describePackage({ ...base, kind: "membership", tier: "pro", expires_at: "2026-09-30T15:59:59Z" }, 2, NOW))
      .toBe("PRIME plus every Energise session, until 30 Sep 2026");
    expect(describePackage({ ...base, kind: "membership", variant: "west", expires_at: "2026-11-29T15:59:59Z" }, 2, NOW))
      .toBe("Unlimited West sessions, until 29 Nov 2026");
  });

  it("describes the trial and drop-in", () => {
    expect(describePackage({ ...base, kind: "membership", is_trial: true, expires_at: "2026-09-17T04:00:00Z" }, 2, NOW))
      .toBe("Any East or West session, until 17 Sep 2026");
    expect(describePackage({ ...base, kind: "dropin", credits_remaining: 1, expires_at: "2026-09-11T04:00:00Z" }, 2, NOW))
      .toBe("One session, valid on the day");
  });
});
