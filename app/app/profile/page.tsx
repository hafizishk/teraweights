import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getMemberPackages } from "@/lib/queries/packages";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { AvatarUpload } from "@/components/member/AvatarUpload";
import { ProfileForm } from "@/components/member/ProfileForm";
import { PackagesList } from "@/components/member/PackagesList";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl">You</h1>
        <AvatarUpload compact userId={profile.id} name={profile.full_name ?? "Energiser"} src={profile.avatar_url} email={profile.email} />
      </div>

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

      <ProfileForm profile={profile} />

      <PackagesList packages={packages} weeklyTarget={profile.weekly_target} />

      <InstallPrompt />

      <form action={signOut}>
        <Button type="submit" variant="ghost">
          Log out
        </Button>
      </form>
    </div>
  );
}
