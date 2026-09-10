import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Onboarding } from "@/components/member/Onboarding";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle<Profile>();

  if (profile?.onboarded_at) redirect("/app");

  return <Onboarding firstName={profile?.full_name?.split(" ")[0] ?? "Energiser"} />;
}
