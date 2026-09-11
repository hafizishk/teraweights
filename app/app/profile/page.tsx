import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getMemberPackages } from "@/lib/queries/packages";
import { PackagesList } from "@/components/member/PackagesList";
import type { Profile } from "@/lib/types";

export const metadata = { title: "You" };

/**
 * The You tab: what you train on. Packages and credits first, then the
 * places that are yours. Name, photo and settings live under Account,
 * reached from the avatar in the header.
 */
export default async function YouPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);
  const [{ data: profile }, packages] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle<Profile>(),
    getMemberPackages(supabase, user!.id),
  ]);
  if (!profile) return null;

  const firstName = (profile.full_name ?? "").split(/\s+/)[0] || "Energiser";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">You</h1>
        <p className="text-sm text-muted">Your packages, results and coaches, {firstName}.</p>
      </div>

      <PackagesList packages={packages} weeklyTarget={profile.weekly_target} />

      <nav aria-label="Yours" className="flex flex-col">
        {[
          { href: "/app/parox", title: "My PA.ROX", sub: "Results, personal best, splits" },
          { href: "/app/pt", title: "Personal training", sub: "Your pack, your coach, your next session" },
          { href: "/app/coaches", title: "Coaches", sub: "Who runs what, and when" },
        ].map((r) => (
          <Link key={r.href} href={r.href} className="rule flex items-center justify-between py-3">
            <span className="flex flex-col">
              <span className="display text-[22px] leading-none">{r.title}</span>
              <span className="text-xs text-muted">{r.sub}</span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        ))}
      </nav>

      <Link href="/app/account" className="rule flex items-center justify-between py-3 text-sm text-muted">
        <span>Name, photo and settings are under Account</span>
        <span>›</span>
      </Link>
    </div>
  );
}
