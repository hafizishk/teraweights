import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import type { MemberPackageRow } from "@/lib/queries/packages";

/** Days left, rounded down; "expires in N days" is shown under 14 (section 7). */
function daysLeft(expiresAt: string, now = new Date()): number {
  return Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 86_400_000);
}

export function PackageCards({ packages }: { packages: MemberPackageRow[] }) {
  const memberships = packages.filter((p) => p.kind === "membership");
  const credits = packages.filter((p) => p.kind === "credits" || p.kind === "dropin");

  if (packages.length === 0) {
    return (
      <Card className="flex flex-col gap-2">
        <CardTitle>No active package</CardTitle>
        <p className="text-sm text-muted">
          You need a membership or credits to book. Contact us to get set up.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {memberships.map((p) => {
        const left = daysLeft(p.expires_at);
        return (
          <Card key={p.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-widest text-muted">Membership</p>
                <CardTitle>{p.package_name}</CardTitle>
              </div>
              {p.cashback_eligible ? <Badge className="bg-prime text-ink">Cashback</Badge> : null}
            </div>
            <p className="text-sm text-muted">
              Expires {formatDate(p.expires_at)}
              {left < 14 ? ` · ${left <= 0 ? "today" : `in ${left} days`}` : ""}
            </p>
            {p.fe_credits_remaining > 0 ? (
              <p className="text-sm text-muted">
                {p.fe_credits_remaining} Fitness Engine{" "}
                {p.fe_credits_remaining === 1 ? "pass" : "passes"} included
              </p>
            ) : null}
          </Card>
        );
      })}

      {credits.map((p) => (
        <Card key={p.id} className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-widest text-muted">Credits</p>
          <CardTitle>
            {p.credits_remaining} {p.credits_remaining === 1 ? "credit" : "credits"}
          </CardTitle>
          <p className="text-sm text-muted">
            {p.package_name} · expires {formatDate(p.expires_at)}
          </p>
        </Card>
      ))}

      <Link href="/app/profile" className="text-sm text-muted underline underline-offset-4">
        Top up — contact us
      </Link>
    </div>
  );
}
