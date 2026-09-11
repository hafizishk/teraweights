import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/admin/Sidebar";
import { Toaster } from "@/components/ui/Toaster";
import { isStaff, type Profile } from "@/lib/types";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (!profile || !isStaff(profile.role)) redirect("/app");

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar role={profile.role} name={profile.full_name ?? profile.email ?? ""} />
      <Toaster>
        <main className="min-w-0 flex-1 px-8 py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </Toaster>
    </div>
  );
}
