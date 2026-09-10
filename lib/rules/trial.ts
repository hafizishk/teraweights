/**
 * Free trial week eligibility (scope change, 10 Sep 2026).
 *
 * A member may start one trial, ever, and only while they hold no active paid
 * membership. Credit packs do not block a trial: someone on drop-ins is exactly
 * who a free week is for. The SQL function start_trial() re-checks both rules.
 */

export type TrialCheckPackage = {
  kind: "membership" | "credits" | "dropin";
  payment_status: "pending" | "paid";
  expires_at: string;
  is_trial: boolean;
};

export type TrialEligibility =
  | { eligible: true; reason: null }
  | { eligible: false; reason: "used" | "active_membership" };

export const TRIAL_DAYS = 7;

export function trialEligibility(packages: TrialCheckPackage[], now: Date = new Date()): TrialEligibility {
  if (packages.some((p) => p.is_trial)) return { eligible: false, reason: "used" };

  const activeMembership = packages.some(
    (p) => p.kind === "membership" && p.payment_status === "paid" && new Date(p.expires_at).getTime() > now.getTime(),
  );
  if (activeMembership) return { eligible: false, reason: "active_membership" };

  return { eligible: true, reason: null };
}
