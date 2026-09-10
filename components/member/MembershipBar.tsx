import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { MemberPackageRow } from "@/lib/queries/packages";

function daysLeft(expiresAt: string, now = new Date()): number {
  return Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000);
}

/** One slim line for the member's packages; the full breakdown lives in Profile. */
export function MembershipBar({ packages }: { packages: MemberPackageRow[] }) {
  const membership = packages.find((p) => p.kind === "membership");
  const credits = packages
    .filter((p) => p.kind === "credits" || p.kind === "dropin")
    .reduce((n, p) => n + (p.credits_remaining ?? 0), 0);

  if (!membership && credits === 0) {
    return (
      <Link
        href="/app/profile"
        className="flex items-center justify-between rounded-lg border border-brand/40 bg-brand/10 px-4 py-3"
      >
        <span className="flex flex-col gap-0.5">
          <span className="display text-base leading-tight">No active package</span>
          <span className="text-xs text-muted">Contact us to get set up</span>
        </span>
        <span className="text-xs text-muted underline underline-offset-4">Details</span>
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

  return (
    <Link
      href="/app/profile"
      className="flex items-center justify-between rounded-lg border border-ink-3 px-4 py-3 hover:border-muted"
    >
      <span className="flex flex-col gap-0.5">
        <span className="display text-base leading-tight">
          {membership ? membership.package_name.replace(/\s\d+-month$/, "") : "Credits"}
        </span>
        <span className="text-xs text-muted">{parts.join(" · ")}</span>
      </span>
      <span className="text-xs text-muted underline underline-offset-4">Details</span>
    </Link>
  );
}
