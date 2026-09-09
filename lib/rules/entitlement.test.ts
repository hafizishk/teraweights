import { describe, expect, it } from "vitest";
import {
  BLOCKED_MESSAGE,
  isoWeekdaySgt,
  resolveEntitlement,
  variantCoversSession,
  type MemberPackage,
} from "./entitlement";

/** Demo anchor: Wed 9 Sep 2026, 12:00 Singapore. */
const NOW = new Date("2026-09-09T04:00:00Z");

// Sessions from the seeded September schedule (times in UTC, 8h behind SGT).
const TUE_EAST_8PM = { class_slug: "energise_east", starts_at: "2026-09-15T12:00:00Z" } as const;
const SAT_EAST_730AM = { class_slug: "energise_east", starts_at: "2026-09-18T23:30:00Z" } as const;
const WED_WEST_8PM = { class_slug: "energise_west", starts_at: "2026-09-16T12:00:00Z" } as const;
const MON_PRIME_6PM = { class_slug: "prime", starts_at: "2026-09-14T10:00:00Z" } as const;
const WED_FE_730PM = { class_slug: "fitness_engine", starts_at: "2026-09-16T11:30:00Z" } as const;

function pkg(over: Partial<MemberPackage> = {}): MemberPackage {
  return {
    id: "p1",
    package_name: "Energise Weekday 4-month",
    kind: "membership",
    tier: "energise",
    variant: "weekday",
    allowed_class_types: ["energise_east", "energise_west"],
    credits_remaining: null,
    fe_credits_remaining: 0,
    payment_status: "paid",
    expires_at: "2026-09-28T15:59:59Z",
    ...over,
  };
}

const AISYAH_MEMBERSHIP = pkg();
const AISYAH_CREDITS = pkg({
  id: "p2",
  package_name: "Energise X",
  kind: "credits",
  variant: null,
  credits_remaining: 6,
  expires_at: "2026-11-15T15:59:59Z",
});
const MARCUS_PRO = pkg({
  id: "p3",
  package_name: "Energise PRO 1-month",
  tier: "pro",
  variant: null,
  allowed_class_types: ["prime", "energise_east", "energise_west"],
  expires_at: "2026-09-30T15:59:59Z",
});

describe("isoWeekdaySgt", () => {
  it("uses Singapore time, not UTC", () => {
    // 23:30 UTC Friday is 07:30 Saturday in Singapore.
    expect(isoWeekdaySgt(SAT_EAST_730AM.starts_at)).toBe(6);
    expect(isoWeekdaySgt(TUE_EAST_8PM.starts_at)).toBe(2);
  });
});

describe("variantCoversSession", () => {
  it("weekday covers Mon–Fri only", () => {
    expect(variantCoversSession(AISYAH_MEMBERSHIP, TUE_EAST_8PM)).toBe(true);
    expect(variantCoversSession(AISYAH_MEMBERSHIP, SAT_EAST_730AM)).toBe(false);
  });
  it("weekend covers Sat/Sun only", () => {
    const weekend = pkg({ variant: "weekend" });
    expect(variantCoversSession(weekend, SAT_EAST_730AM)).toBe(true);
    expect(variantCoversSession(weekend, TUE_EAST_8PM)).toBe(false);
  });
  it("west covers West sessions on any day", () => {
    const west = pkg({ variant: "west", allowed_class_types: ["energise_west"] });
    expect(variantCoversSession(west, WED_WEST_8PM)).toBe(true);
    expect(variantCoversSession(west, TUE_EAST_8PM)).toBe(false);
  });
  it("PRO covers anything", () => {
    expect(variantCoversSession(MARCUS_PRO, SAT_EAST_730AM)).toBe(true);
    expect(variantCoversSession(MARCUS_PRO, MON_PRIME_6PM)).toBe(true);
  });
});

describe("resolveEntitlement — the demo script (section 13, step 2)", () => {
  const aisyah = [AISYAH_MEMBERSHIP, AISYAH_CREDITS];

  it("weekday session is included in the membership", () => {
    const r = resolveEntitlement(TUE_EAST_8PM, aisyah, NOW);
    expect(r.kind).toBe("membership");
    expect(r.creditsUsed).toBe(0);
    expect(r.label).toBe("Book — included");
    expect(r.memberPackageId).toBe("p1");
  });

  it("weekend session falls through to a credit", () => {
    const r = resolveEntitlement(SAT_EAST_730AM, aisyah, NOW);
    expect(r.kind).toBe("credit");
    expect(r.creditsUsed).toBe(1);
    expect(r.label).toBe("Book (1 credit)");
    expect(r.memberPackageId).toBe("p2");
  });

  it("blocks PRIME for a member without the PRO tier", () => {
    const r = resolveEntitlement(MON_PRIME_6PM, aisyah, NOW);
    expect(r.kind).toBe("blocked");
    expect(r.label).toBe("No active package");
  });

  it("unlocks PRIME once PRO is assigned (section 13, step 6)", () => {
    const r = resolveEntitlement(MON_PRIME_6PM, [...aisyah, MARCUS_PRO], NOW);
    expect(r.kind).toBe("membership");
    expect(r.packageName).toBe("Energise PRO 1-month");
  });
});

describe("resolveEntitlement — blocked states", () => {
  it("blocks a member with no packages", () => {
    const r = resolveEntitlement(TUE_EAST_8PM, [], NOW);
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.message).toBe(BLOCKED_MESSAGE);
  });

  it("blocks Priya, whose membership expired on 31 Aug", () => {
    const expired = pkg({ expires_at: "2026-08-31T15:59:59Z" });
    expect(resolveEntitlement(TUE_EAST_8PM, [expired], NOW).kind).toBe("blocked");
  });

  it("ignores packages that are not paid", () => {
    const unpaid = pkg({ payment_status: "pending" });
    expect(resolveEntitlement(TUE_EAST_8PM, [unpaid], NOW).kind).toBe("blocked");
  });

  it("ignores a credit pack with no credits left", () => {
    const empty = pkg({ kind: "credits", variant: null, credits_remaining: 0 });
    expect(resolveEntitlement(SAT_EAST_730AM, [empty], NOW).kind).toBe("blocked");
  });
});

describe("resolveEntitlement — Fitness Engine", () => {
  it("uses a Fitness Engine pass ahead of credits", () => {
    const withFe = pkg({ id: "p4", package_name: "Energise Weekday 8-month", fe_credits_remaining: 1 });
    const r = resolveEntitlement(WED_FE_730PM, [withFe, AISYAH_CREDITS], NOW);
    expect(r.kind).toBe("fe_credit");
    expect(r.memberPackageId).toBe("p4");
    expect(r.label).toBe("Book (1 FE pass)");
  });

  it("blocks Fitness Engine when only Energise X credits are held", () => {
    // Energise X allows East and West only (brief section 11).
    expect(resolveEntitlement(WED_FE_730PM, [AISYAH_CREDITS], NOW).kind).toBe("blocked");
  });

  it("a membership alone does not cover Fitness Engine", () => {
    expect(resolveEntitlement(WED_FE_730PM, [AISYAH_MEMBERSHIP], NOW).kind).toBe("blocked");
  });
});

describe("resolveEntitlement — ordering", () => {
  it("prefers a membership over credits even when credits are listed first", () => {
    const r = resolveEntitlement(TUE_EAST_8PM, [AISYAH_CREDITS, AISYAH_MEMBERSHIP], NOW);
    expect(r.kind).toBe("membership");
  });

  it("spends the soonest-expiring credit pack first", () => {
    const later = pkg({ id: "late", kind: "credits", variant: null, credits_remaining: 5, expires_at: "2026-12-01T00:00:00Z" });
    const sooner = pkg({ id: "soon", kind: "credits", variant: null, credits_remaining: 5, expires_at: "2026-10-01T00:00:00Z" });
    const r = resolveEntitlement(SAT_EAST_730AM, [later, sooner], NOW);
    expect(r.memberPackageId).toBe("soon");
  });
});
