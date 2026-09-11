import Link from "next/link";
import { StartTrialButton } from "@/components/member/StartTrialButton";
import { formatDate } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/rules/trial";
import type { MemberPackageRow } from "@/lib/queries/packages";

function daysLeft(expiresAt: string, now = new Date()): number {
  return Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000);
}

/** One ruled line for the member's packages; the full breakdown lives in Profile. */
export function MembershipBar({
  packages,
  trialEligible = false,
}: {
  packages: MemberPackageRow[];
  trialEligible?: boolean;
}) {
  const membership = packages.find((p) => p.kind === "membership");
  const credits = packages
    .filter((p) => p.kind === "credits" || p.kind === "dropin")
    .reduce((n, p) => n + (p.credits_remaining ?? 0), 0);

  if (!membership && credits === 0) {
    if (trialEligible) {
      return (
        <div className="rule flex flex-col gap-3 pt-4">
          <div className="flex flex-col gap-1 border-l-2 border-brand pl-3">
            <span className="display text-[26px] leading-none">A week on us</span>
            <span className="text-sm text-muted">
              {TRIAL_DAYS} days of Energise East and West, any session.
            </span>
          </div>
          <StartTrialButton />
        </div>
      );
    }
    return (
      <Link href="/app/profile" className="rule flex items-center justify-between py-3">
        <span className="flex flex-col gap-0.5">
          <span className="display text-lg leading-none text-brand">No active package</span>
          <span className="eyebrow">Contact us to get set up</span>
        </span>
        <span className="display text-base text-muted">Details →</span>
      </Link>
    );
  }

  const parts: string[] = [];
  if (membership) {
    const left = daysLeft(membership.expires_at);
    parts.push(
      left < 14 ? `expires ${left <= 0 ? "today" : `in ${left} days`}` : `expires ${formatDate(membership.expires_at)}`,
    );
  }
  if (credits > 0) parts.push(`${credits} ${credits === 1 ? "credit" : "credits"}`);

  const title = membership
    ? membership.is_trial
      ? "Free week"
      : membership.package_name.replace(/\s\d+-month$/, "")
    : "Credits";

  return (
    <Link href="/app/profile" className="rule flex items-center justify-between py-3">
      <span className="flex flex-col gap-0.5">
        <span className="display text-lg leading-none">{title}</span>
        <span className="eyebrow">{parts.join(" · ")}</span>
      </span>
      <span className="display text-base text-muted">Details →</span>
    </Link>
  );
}
