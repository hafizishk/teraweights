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
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl">Profile</h1>
        <AvatarUpload userId={profile.id} name={profile.full_name ?? "Energiser"} src={profile.avatar_url} />
      </div>

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
