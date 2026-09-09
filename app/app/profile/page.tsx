import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Placeholder } from "@/components/ui/Placeholder";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle<Profile>();

  return (
    <div className="flex flex-col gap-6">
      <Placeholder title="Profile" session={4} items={["Zone preference", "Packages: active and expired"]} />
      <Card className="flex flex-col gap-1 text-sm">
        <p className="text-lg text-paper">{profile?.full_name ?? "—"}</p>
        <p className="text-muted">{profile?.email}</p>
        <p className="text-muted">{profile?.phone ?? "No phone"}</p>
        <p className="text-muted">
          Role: {profile?.role} · Zone: {profile?.zone_pref ?? "—"}
        </p>
      </Card>
      <form action={signOut}>
        <Button type="submit" variant="secondary">
          Log out
        </Button>
      </form>
    </div>
  );
}
