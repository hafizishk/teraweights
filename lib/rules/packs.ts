/**
 * The Packs tab: how the catalogue is grouped and what the member is nudged
 * towards at each stage. Pure; the catalogue itself is the `packages` table.
 */
import { formatDate } from "@/lib/format";

export type CataloguePackage = {
  id: string;
  name: string;
  kind: "membership" | "credits" | "dropin" | "pt";
  tier: "energise" | "pro" | null;
  variant: "weekday" | "weekend" | "west" | null;
  term_months: number | null;
  validity_days: number;
  credits: number | null;
  price_sgd: number;
  price_per_month: number | null;
  fe_credits_included: number;
  cashback_eligible: boolean;
  perks: string[];
  is_active: boolean;
  is_trial: boolean;
};

/** One membership plan with its terms, e.g. Energise Weekday at 1, 4, 8, 12 months. */
export type Plan = {
  key: string;
  title: string;
  blurb: string;
  terms: CataloguePackage[];
};

export type Catalogue = {
  trial: CataloguePackage | null;
  plans: Plan[];
  packs: CataloguePackage[];
  pt: CataloguePackage[];
};

const PLAN_ORDER = ["energise-weekday", "energise-weekend", "energise-west", "pro"];

export function planKey(p: Pick<CataloguePackage, "tier" | "variant">): string {
  return p.tier === "pro" ? "pro" : `energise-${p.variant ?? "any"}`;
}

export function planTitle(p: CataloguePackage): string {
  if (p.tier === "pro") return "Energise PRO";
  switch (p.variant) {
    case "weekday":
      return "Energise Weekday";
    case "weekend":
      return "Energise Weekend";
    case "west":
      return "Energise West";
    default:
      return "Energise";
  }
}

/** What a plan gets you, without a date. Mirrors package-copy for owned packages. */
export function planBlurb(p: CataloguePackage): string {
  if (p.tier === "pro") return "PRIME strength sessions plus every Energise East and West session";
  switch (p.variant) {
    case "weekday":
      return "Unlimited East and West, Monday to Friday";
    case "weekend":
      return "Unlimited East and West, Saturday and Sunday";
    case "west":
      return "Unlimited West sessions, any day";
    default:
      return "Unlimited Energise sessions";
  }
}

export function packBlurb(p: CataloguePackage, weeklyTarget = 2): string {
  if (p.kind === "pt") {
    const n = p.credits ?? 0;
    return `${n} one-to-one ${n === 1 ? "session" : "sessions"} with a coach, valid ${p.validity_days} days`;
  }
  if (p.kind === "dropin") return "One session, valid on the day";
  const n = p.credits ?? 0;
  const target = Math.max(1, weeklyTarget);
  const weeks = Math.ceil(n / target);
  return `${n} credits, about ${weeks} ${weeks === 1 ? "week" : "weeks"} at ${target} a week, valid ${p.validity_days} days`;
}

/**
 * "1 month free" when the validity runs past the paid term (8 months paid,
 * 270 days valid); otherwise the saving against paying month by month.
 */
export function termSaving(term: CataloguePackage, plan: Plan): string | null {
  if (!term.term_months || term.term_months === 1) return null;
  const freeMonths = Math.round(term.validity_days / 30) - term.term_months;
  if (freeMonths >= 1) return `${freeMonths} ${freeMonths === 1 ? "month" : "months"} free`;
  const monthly = plan.terms.find((t) => t.term_months === 1);
  if (!monthly) return null;
  const saved = monthly.price_sgd * term.term_months - term.price_sgd;
  return saved > 0 ? `Save S$${Math.round(saved)}` : null;
}

export function buildCatalogue(defs: CataloguePackage[]): Catalogue {
  const active = defs.filter((d) => d.is_active);
  const trial = active.find((d) => d.is_trial) ?? null;

  const byPlan = new Map<string, Plan>();
  for (const p of active) {
    if (p.kind !== "membership" || p.is_trial) continue;
    const key = planKey(p);
    const plan = byPlan.get(key) ?? { key, title: planTitle(p), blurb: planBlurb(p), terms: [] };
    plan.terms.push(p);
    byPlan.set(key, plan);
  }
  const plans = Array.from(byPlan.values())
    .map((plan) => ({ ...plan, terms: plan.terms.sort((a, b) => (a.term_months ?? 0) - (b.term_months ?? 0)) }))
    .sort((a, b) => {
      const ai = PLAN_ORDER.indexOf(a.key);
      const bi = PLAN_ORDER.indexOf(b.key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const packs = active.filter((d) => d.kind === "credits" || d.kind === "dropin").sort((a, b) => b.price_sgd - a.price_sgd);
  const pt = active.filter((d) => d.kind === "pt").sort((a, b) => a.price_sgd - b.price_sgd);

  return { trial, plans, packs, pt };
}

// ---------------------------------------------------------------------------
// Stage: what to push, and where.
// ---------------------------------------------------------------------------

export type StagePackage = {
  kind: "membership" | "credits" | "dropin" | "pt";
  tier: "energise" | "pro" | null;
  payment_status: "pending" | "paid";
  expires_at: string;
  credits_remaining: number | null;
  is_trial: boolean;
};

export type Stage =
  | { kind: "new" }
  | { kind: "lapsed"; endedAt: string }
  | { kind: "trial"; daysLeft: number }
  | { kind: "low"; what: "credits" | "membership"; detail: string }
  | { kind: "fine" };

export const LOW_CREDITS = 2;
export const RENEW_WINDOW_DAYS = 14;

function isLive(p: StagePackage, now: Date): boolean {
  return p.payment_status === "paid" && new Date(p.expires_at).getTime() > now.getTime();
}

/** Class packages only; PT packs never decide the stage. */
export function memberStage(packages: StagePackage[], now: Date = new Date()): Stage {
  const classPkgs = packages.filter((p) => p.kind !== "pt");
  const live = classPkgs.filter((p) => isLive(p, now));

  if (live.length === 0) {
    const past = classPkgs
      .filter((p) => p.payment_status === "paid")
      .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];
    return past ? { kind: "lapsed", endedAt: past.expires_at } : { kind: "new" };
  }

  const trial = live.find((p) => p.is_trial);
  const membership = live.find((p) => p.kind === "membership" && !p.is_trial);
  const credits = live.filter((p) => p.kind === "credits" || p.kind === "dropin").reduce((n, p) => n + (p.credits_remaining ?? 0), 0);

  if (trial && !membership) {
    const daysLeft = Math.max(0, Math.ceil((new Date(trial.expires_at).getTime() - now.getTime()) / 86_400_000));
    return { kind: "trial", daysLeft };
  }

  if (membership) {
    const daysLeft = Math.floor((new Date(membership.expires_at).getTime() - now.getTime()) / 86_400_000);
    if (daysLeft < RENEW_WINDOW_DAYS) {
      return {
        kind: "low",
        what: "membership",
        detail: daysLeft <= 0 ? "Your membership ends today" : `Your membership ends ${formatDate(membership.expires_at)}`,
      };
    }
    return { kind: "fine" };
  }

  if (credits <= LOW_CREDITS) {
    return { kind: "low", what: "credits", detail: credits === 0 ? "No credits left" : `${credits} ${credits === 1 ? "credit" : "credits"} left` };
  }
  return { kind: "fine" };
}

/** The one line under the hero, or null when there is nothing to push. */
export function stageNudge(stage: Stage, trialEligible: boolean): { title: string; sub: string; cta: string; trial: boolean } | null {
  switch (stage.kind) {
    case "new":
      return trialEligible
        ? { title: "A week on us", sub: "Seven days of Energise East and West, any session.", cta: "See packs", trial: true }
        : { title: "Pick a pack", sub: "Memberships from S$56 a month, or 10 credits to use as you like.", cta: "See packs", trial: false };
    case "lapsed":
      return {
        title: "Pick up where you left off",
        sub: `Your last pack ended ${formatDate(stage.endedAt)}.`,
        cta: trialEligible ? "See packs" : "Renew",
        trial: trialEligible,
      };
    case "trial":
      if (stage.daysLeft > 3) return null;
      return {
        title: stage.daysLeft === 0 ? "Your free week ends today" : `Free week ends in ${stage.daysLeft} ${stage.daysLeft === 1 ? "day" : "days"}`,
        sub: "Keep the streak going with a membership or a 10-pack.",
        cta: "Pick a pack",
        trial: false,
      };
    case "low":
      return {
        title: stage.what === "credits" ? "Running low" : "Time to renew",
        sub: stage.detail + ".",
        cta: stage.what === "credits" ? "Top up" : "Renew",
        trial: false,
      };
    default:
      return null;
  }
}
