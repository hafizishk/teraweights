import { describe, expect, it } from "vitest";
import { buildCatalogue, memberStage, packBlurb, stageNudge, termSaving, type CataloguePackage, type StagePackage } from "./packs";

function def(over: Partial<CataloguePackage>): CataloguePackage {
  return {
    id: over.name ?? "x",
    name: "x",
    kind: "membership",
    tier: "energise",
    variant: "weekday",
    term_months: 1,
    validity_days: 30,
    credits: null,
    price_sgd: 65,
    price_per_month: 65,
    fe_credits_included: 0,
    cashback_eligible: false,
    perks: [],
    is_active: true,
    is_trial: false,
    ...over,
  };
}

const NOW = new Date("2026-09-11T04:00:00Z");

function pkg(over: Partial<StagePackage>): StagePackage {
  return { kind: "membership", tier: "energise", payment_status: "paid", expires_at: "2026-12-01T00:00:00Z", credits_remaining: null, is_trial: false, ...over };
}

describe("buildCatalogue", () => {
  const defs = [
    def({ name: "Energise Weekday 4-month", term_months: 4, price_sgd: 260 }),
    def({ name: "Energise Weekday 1-month" }),
    def({ name: "Energise West 1-month", variant: "west" }),
    def({ name: "Energise PRO 1-month", tier: "pro", variant: null, price_sgd: 90 }),
    def({ name: "Energise X", kind: "credits", variant: null, term_months: null, validity_days: 90, credits: 10, price_sgd: 180 }),
    def({ name: "Drop-in", kind: "dropin", variant: null, term_months: null, validity_days: 1, credits: 1, price_sgd: 20 }),
    def({ name: "Trial Week", term_months: null, validity_days: 7, price_sgd: 0, is_trial: true, variant: null }),
    def({ name: "PT 8", kind: "pt", tier: null, variant: null, term_months: null, validity_days: 90, credits: 8, price_sgd: 640 }),
    def({ name: "PT 4", kind: "pt", tier: null, variant: null, term_months: null, validity_days: 60, credits: 4, price_sgd: 340 }),
    def({ name: "Old", is_active: false }),
  ];
  const cat = buildCatalogue(defs);

  it("groups memberships into plans with terms in order", () => {
    expect(cat.plans.map((p) => p.key)).toEqual(["energise-weekday", "energise-west", "pro"]);
    expect(cat.plans[0].terms.map((t) => t.term_months)).toEqual([1, 4]);
    expect(cat.plans[0].title).toBe("Energise Weekday");
  });

  it("keeps the trial out of the plans and skips inactive packages", () => {
    expect(cat.trial?.name).toBe("Trial Week");
    expect(cat.plans.flatMap((p) => p.terms).some((t) => t.is_trial || t.name === "Old")).toBe(false);
  });

  it("orders packs dearest first and PT cheapest first", () => {
    expect(cat.packs.map((p) => p.name)).toEqual(["Energise X", "Drop-in"]);
    expect(cat.pt.map((p) => p.name)).toEqual(["PT 4", "PT 8"]);
  });
});

describe("termSaving", () => {
  const plan = {
    key: "energise-weekday",
    title: "Energise Weekday",
    blurb: "",
    terms: [
      def({ term_months: 1, price_sgd: 65, validity_days: 30 }),
      def({ term_months: 4, price_sgd: 260, validity_days: 120 }),
      def({ term_months: 8, price_sgd: 464, validity_days: 270 }),
      def({ term_months: 12, price_sgd: 672, validity_days: 420 }),
    ],
  };
  it("labels free months from validity beyond the paid term", () => {
    expect(termSaving(plan.terms[0], plan)).toBeNull();
    expect(termSaving(plan.terms[1], plan)).toBeNull();
    expect(termSaving(plan.terms[2], plan)).toBe("1 month free");
    expect(termSaving(plan.terms[3], plan)).toBe("2 months free");
  });
});

describe("packBlurb", () => {
  it("says what credits get you at the member's pace", () => {
    expect(packBlurb(def({ kind: "credits", credits: 10, validity_days: 90 }), 2)).toBe("10 credits, about 5 weeks at 2 a week, valid 90 days");
    expect(packBlurb(def({ kind: "pt", credits: 4, validity_days: 60 }))).toBe("4 one-to-one sessions with a coach, valid 60 days");
  });
});

describe("memberStage", () => {
  it("is new with nothing, lapsed with only expired packages", () => {
    expect(memberStage([], NOW)).toEqual({ kind: "new" });
    expect(memberStage([pkg({ expires_at: "2026-09-01T00:00:00Z" })], NOW)).toEqual({ kind: "lapsed", endedAt: "2026-09-01T00:00:00Z" });
  });

  it("ignores PT packs when deciding", () => {
    expect(memberStage([pkg({ kind: "pt", tier: null, credits_remaining: 5 })], NOW)).toEqual({ kind: "new" });
  });

  it("counts down a trial", () => {
    const s = memberStage([pkg({ is_trial: true, expires_at: "2026-09-13T04:00:00Z" })], NOW);
    expect(s).toEqual({ kind: "trial", daysLeft: 2 });
  });

  it("flags a membership inside the renew window and low credits", () => {
    expect(memberStage([pkg({ expires_at: "2026-09-20T00:00:00Z" })], NOW)).toMatchObject({ kind: "low", what: "membership" });
    expect(memberStage([pkg({ kind: "credits", credits_remaining: 2, expires_at: "2026-11-01T00:00:00Z" })], NOW)).toMatchObject({ kind: "low", what: "credits", detail: "2 credits left" });
    expect(memberStage([pkg({ kind: "credits", credits_remaining: 6, expires_at: "2026-11-01T00:00:00Z" })], NOW)).toEqual({ kind: "fine" });
    expect(memberStage([pkg({})], NOW)).toEqual({ kind: "fine" });
  });
});

describe("stageNudge", () => {
  it("offers the trial to new members who can take it", () => {
    expect(stageNudge({ kind: "new" }, true)).toMatchObject({ title: "A week on us", trial: true });
    expect(stageNudge({ kind: "new" }, false)).toMatchObject({ title: "Pick a pack", trial: false });
  });
  it("stays quiet mid-trial and while everything is fine", () => {
    expect(stageNudge({ kind: "trial", daysLeft: 5 }, false)).toBeNull();
    expect(stageNudge({ kind: "fine" }, false)).toBeNull();
    expect(stageNudge({ kind: "trial", daysLeft: 1 }, false)?.title).toBe("Free week ends in 1 day");
  });
  it("says renew or top up when low", () => {
    expect(stageNudge({ kind: "low", what: "credits", detail: "1 credit left" }, false)?.cta).toBe("Top up");
    expect(stageNudge({ kind: "low", what: "membership", detail: "x" }, false)?.cta).toBe("Renew");
  });
});
