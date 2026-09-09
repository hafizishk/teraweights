import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaff, type Role } from "@/lib/types";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: Role }>();

  redirect(isStaff(profile?.role) ? "/admin" : "/app");
}
