/**
 * Entitlement resolution — brief section 7.
 *
 * Pure functions, no Supabase. Server actions call these and then hand the
 * chosen package to the SQL functions in 0002_booking_functions.sql, which
 * enforce integrity but do not repeat these decisions.
 *
 * Order: membership → Fitness Engine pass → credit → blocked.
 */
import { formatInTimeZone } from "date-fns-tz";
import { TZ } from "@/lib/format";
import type { ClassSlug } from "@/lib/types";

export type PackageKind = "membership" | "credits" | "dropin";
export type PackageTier = "energise" | "pro" | null;
export type PackageVariant = "weekday" | "weekend" | "west" | null;

/** A member_packages row joined to its packages row. */
export type MemberPackage = {
  id: string;
  package_name: string;
  kind: PackageKind;
  tier: PackageTier;
  variant: PackageVariant;
  allowed_class_types: string[];
  credits_remaining: number | null;
  fe_credits_remaining: number;
  payment_status: "pending" | "paid";
  expires_at: string;
};

export type SessionForBooking = {
  class_slug: ClassSlug;
  starts_at: string;
};

export type EntitlementKind = "membership" | "credit" | "fe_credit";

export type Entitlement =
  | {
      kind: EntitlementKind;
      memberPackageId: string;
      packageName: string;
      creditsUsed: number;
      /** Button label, brief section 8. */
      label: string;
    }
  | {
      kind: "blocked";
      memberPackageId: null;
      packageName: null;
      creditsUsed: 0;
      label: string;
      message: string;
    };

export const BLOCKED_MESSAGE = "No active membership or credits. Contact us.";

/** Paid and not yet expired. */
export function isPackageActive(pkg: MemberPackage, now: Date): boolean {
  return pkg.payment_status === "paid" && new Date(pkg.expires_at).getTime() > now.getTime();
}

/** ISO weekday (1 = Monday … 7 = Sunday) in Singapore time. */
export function isoWeekdaySgt(when: string | Date): number {
  return Number(formatInTimeZone(new Date(when), TZ, "i"));
}

/**
 * Does a membership's variant cover this session?
 * weekday → Mon–Fri · weekend → Sat/Sun · west → West sessions · PRO → anything.
 */
export function variantCoversSession(pkg: MemberPackage, session: SessionForBooking): boolean {
  if (pkg.tier === "pro") return true;
  switch (pkg.variant) {
    case "weekday":
      return isoWeekdaySgt(session.starts_at) <= 5;
    case "weekend":
      return isoWeekdaySgt(session.starts_at) >= 6;
    case "west":
      return session.class_slug === "energise_west";
    default:
      return true;
  }
}

function allowsClass(pkg: MemberPackage, session: SessionForBooking): boolean {
  return pkg.allowed_class_types.includes(session.class_slug);
}

/** Soonest-expiring first, so the package closest to lapsing is used up first. */
function byExpiry(a: MemberPackage, b: MemberPackage): number {
  return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
}

export function resolveEntitlement(
  session: SessionForBooking,
  packages: MemberPackage[],
  now: Date = new Date(),
): Entitlement {
  const active = packages.filter((p) => isPackageActive(p, now)).sort(byExpiry);

  // 1. Membership covering this class type and this day.
  const membership = active.find(
    (p) => p.kind === "membership" && allowsClass(p, session) && variantCoversSession(p, session),
  );
  if (membership) {
    return {
      kind: "membership",
      memberPackageId: membership.id,
      packageName: membership.package_name,
      creditsUsed: 0,
      label: "Book — included",
    };
  }

  // 2. Fitness Engine sessions: a Fitness Engine pass from any package.
  if (session.class_slug === "fitness_engine") {
    const fe = active.find((p) => p.fe_credits_remaining > 0);
    if (fe) {
      return {
        kind: "fe_credit",
        memberPackageId: fe.id,
        packageName: fe.package_name,
        creditsUsed: 1,
        label: "Book (1 FE pass)",
      };
    }
  }

  // 3. A credit pack or drop-in that allows this class type.
  const credit = active.find(
    (p) =>
      (p.kind === "credits" || p.kind === "dropin") &&
      (p.credits_remaining ?? 0) > 0 &&
      allowsClass(p, session),
  );
  if (credit) {
    return {
      kind: "credit",
      memberPackageId: credit.id,
      packageName: credit.package_name,
      creditsUsed: 1,
      label: "Book (1 credit)",
    };
  }

  // 4. Blocked.
  return {
    kind: "blocked",
    memberPackageId: null,
    packageName: null,
    creditsUsed: 0,
    label: "No active package",
    message: BLOCKED_MESSAGE,
  };
}
