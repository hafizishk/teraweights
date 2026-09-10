import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { describePackage } from "@/lib/rules/package-copy";
import type { MemberPackageRow } from "@/lib/queries/packages";

function isActive(p: MemberPackageRow, now: Date): boolean {
  return p.payment_status === "paid" && new Date(p.expires_at).getTime() > now.getTime();
}

export function PackagesList({ packages, weeklyTarget }: { packages: MemberPackageRow[]; weeklyTarget: number }) {
  const now = new Date();
  const active = packages.filter((p) => isActive(p, now));
  const pending = packages.filter((p) => p.payment_status === "pending" && new Date(p.expires_at).getTime() > now.getTime());
  const expired = packages.filter((p) => !isActive(p, now) && p.payment_status !== "pending");

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl">Packages</h2>

      {active.length === 0 && pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-3 px-4 py-6 text-center text-sm text-muted">
          No active package. Contact us to get set up.
        </p>
      ) : null}

      {active.map((p) => (
        <Card key={p.id} className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-widest text-muted">
                {p.is_trial ? "Trial" : p.kind === "membership" ? "Membership" : p.kind === "credits" ? "Credits" : "Drop-in"}
              </span>
              <CardTitle>{p.package_name}</CardTitle>
            </div>
            {p.cashback_eligible ? <Badge className="bg-prime text-ink">Cashback</Badge> : null}
          </div>
          <p className="text-sm">{describePackage(p, weeklyTarget, now)}</p>
          {p.fe_credits_remaining > 0 ? (
            <p className="text-xs text-muted">
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
        </Card>
      ))}

      {pending.map((p) => (
        <Card key={p.id} className="flex flex-col gap-1 border-prime/40">
          <span className="text-xs uppercase tracking-widest text-prime">Payment pending</span>
          <CardTitle>{p.package_name}</CardTitle>
          <p className="text-sm text-muted">Active once we record your payment.</p>
        </Card>
      ))}

      {expired.length > 0 ? (
        <details className="group rounded-lg border border-ink-3">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm text-muted">
            {expired.length} expired {expired.length === 1 ? "package" : "packages"}
            <span className="float-right group-open:rotate-180">⌄</span>
          </summary>
          <ul className="flex flex-col gap-2 border-t border-ink-3 px-4 py-3">
            {expired.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-muted">{p.package_name}</span>
                <span className="shrink-0 text-xs text-muted">ended {formatDate(p.expires_at)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
