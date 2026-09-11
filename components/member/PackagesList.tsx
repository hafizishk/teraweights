import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { describePackage } from "@/lib/rules/package-copy";
import type { MemberPackageRow } from "@/lib/queries/packages";

function isActive(p: MemberPackageRow, now: Date): boolean {
  return p.payment_status === "paid" && new Date(p.expires_at).getTime() > now.getTime();
}

function kindLabel(p: MemberPackageRow): string {
  if (p.is_trial) return "Trial";
  if (p.kind === "membership") return "Membership";
  if (p.kind === "credits") return "Credits";
  if (p.kind === "pt") return "Personal training";
  return "Drop-in";
}

/** The member's packages as a ruled list. What each one gets you, in sessions. */
export function PackagesList({ packages, weeklyTarget }: { packages: MemberPackageRow[]; weeklyTarget: number }) {
  const now = new Date();
  const active = packages.filter((p) => isActive(p, now));
  const pending = packages.filter((p) => p.payment_status === "pending" && new Date(p.expires_at).getTime() > now.getTime());
  const expired = packages.filter((p) => !isActive(p, now) && p.payment_status !== "pending");

  return (
    <section>
      <h2 className="pb-1 text-xl">Packages</h2>

      {active.length === 0 && pending.length === 0 ? (
        <Link href="/app/packs" className="rule flex items-center justify-between py-4 text-sm text-muted">
          <span>No active package.</span>
          <span className="display text-lg text-brand">See packs →</span>
        </Link>
      ) : null}

      {active.map((p) => (
        <div key={p.id} className="rule flex flex-col gap-1 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="eyebrow">{kindLabel(p)}</span>
            {p.cashback_eligible ? <Badge className="border-prime/60 text-prime">Cashback</Badge> : null}
          </div>
          <span className="display text-[22px] leading-none">{p.package_name}</span>
          <p className="text-sm">{describePackage(p, weeklyTarget, now)}</p>
          {p.fe_credits_remaining > 0 ? (
            <p className="eyebrow">
              {p.fe_credits_remaining} Fitness Engine {p.fe_credits_remaining === 1 ? "pass" : "passes"} included
            </p>
          ) : null}
          {p.perks.length > 0 ? (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {p.perks.map((perk) => (
                <li key={perk}>
                  <Badge>{perk}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      {pending.map((p) => (
        <div key={p.id} className="rule flex flex-col gap-1 py-3">
          <span className="eyebrow text-prime">Payment pending</span>
          <span className="display text-[22px] leading-none">{p.package_name}</span>
          <p className="text-sm text-muted">Active once we record your payment.</p>
        </div>
      ))}

      {expired.length > 0 ? (
        <details className="group rule">
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm text-muted">
            {expired.length} expired {expired.length === 1 ? "package" : "packages"}
            <span className="display text-base group-open:hidden">Show</span>
            <span className="display hidden text-base group-open:inline">Hide</span>
          </summary>
          <ul className="flex flex-col gap-2 pb-3">
            {expired.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">{p.package_name}</span>
                <span className="eyebrow shrink-0">ended {formatDate(p.expires_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
