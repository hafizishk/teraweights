import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assertOnboarded } from "@/lib/onboarding";
import { AvatarUpload } from "@/components/member/AvatarUpload";
import { ProfileForm } from "@/components/member/ProfileForm";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Your details" };

export default async function DetailsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle<Profile>();
  assertOnboarded(profile);
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/account" className="display text-base tracking-wide text-muted">
          ‹ Account
        </Link>
        <h1 className="text-3xl">Your details</h1>
      </div>
      <AvatarUpload userId={profile.id} name={profile.full_name ?? "Energiser"} src={profile.avatar_url} />
      <ProfileForm profile={profile} />
    </div>
  );
}
