import { createClient } from "@/lib/supabase/server";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle<{ full_name: string | null }>();

  const firstName = profile?.full_name?.split(" ")[0] ?? "Energiser";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">Hey {firstName}</p>
      <Placeholder
        title="Home"
        session={2}
        items={["Next session", "Membership and credits", "Latest announcement", "My Coach", "Next event"]}
      />
    </div>
  );
}
