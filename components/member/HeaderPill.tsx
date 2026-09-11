import Link from "next/link";
import type { MemberPackageRow } from "@/lib/queries/packages";

/** Credits in the member header (scope change): "6 credits", "Weekday", "Free week". */
export function headerPillLabel(packages: MemberPackageRow[]): string {
  const membership = packages.find((p) => p.kind === "membership");
  const credits = packages
    .filter((p) => p.kind === "credits" || p.kind === "dropin")
    .reduce((n, p) => n + (p.credits_remaining ?? 0), 0);

  if (membership?.is_trial) return "Free week";
  if (membership) {
    if (membership.tier === "pro") return "PRO";
    const variant = membership.variant;
    return variant ? variant[0].toUpperCase() + variant.slice(1) : "Member";
  }
  if (credits > 0) return `${credits} ${credits === 1 ? "credit" : "credits"}`;
  return "No package";
}

/** Set as a word in the display face, not a pill. Red only when there is nothing. */
export function HeaderPill({ packages }: { packages: MemberPackageRow[] }) {
  const label = headerPillLabel(packages);
  const empty = label === "No package";
  return (
    <Link
      href="/app#packages"
      className={`display tnum text-base leading-none tracking-wide ${empty ? "text-brand" : "text-paper"}`}
    >
      {label}
    </Link>
  );
}
