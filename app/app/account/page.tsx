import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { AvatarUpload } from "@/components/member/AvatarUpload";
import { ProfileForm } from "@/components/member/ProfileForm";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Account" };

/**
 * Who you are: photo, name, contact, preferences, log out. Reached from the
 * avatar in the header. What you train on lives under the You tab.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await requireOnboarded(supabase, user!.id);
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle<Profile>();
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl">Account</h1>
        <AvatarUpload userId={profile.id} name={profile.full_name ?? "Energiser"} src={profile.avatar_url} />
      </div>

      <ProfileForm profile={profile} />

      <InstallPrompt />

      <form action={signOut}>
        <Button type="submit" variant="ghost">
          Log out
        </Button>
      </form>
    </div>
  );
}
