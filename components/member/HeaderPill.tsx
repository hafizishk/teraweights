import Link from "next/link";
import type { MemberPackageRow } from "@/lib/queries/packages";

/** Credits pill in the member header (scope change): "6 credits", "Weekday", "Free week". */
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

export function HeaderPill({ packages }: { packages: MemberPackageRow[] }) {
  const label = headerPillLabel(packages);
  const empty = label === "No package";
  return (
    <Link
      href="/app/profile"
      className={`display rounded-full border px-2.5 py-1 text-sm leading-none tracking-wider ${
        empty ? "border-brand/50 text-brand" : "border-ink-3 text-paper"
      }`}
    >
      {label}
    </Link>
  );
}
