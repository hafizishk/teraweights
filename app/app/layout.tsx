import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActivePackages } from "@/lib/queries/packages";
import { BottomTabs } from "@/components/member/BottomTabs";
import { HeaderPill } from "@/components/member/HeaderPill";
import { Wordmark } from "@/components/ui/Wordmark";
import { Toaster } from "@/components/ui/Toaster";
import type { Profile } from "@/lib/types";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app");

  const [{ data: profile }, packages] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    getActivePackages(supabase, user.id),
  ]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-ink">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-ink-3 bg-ink/95 px-4 py-3 backdrop-blur">
        <Wordmark className="text-xl" />
        <div className="flex items-center gap-3">
          {profile?.role !== "member" ? (
            <a href="/admin" className="text-xs text-muted underline-offset-4 hover:underline">
              Admin
            </a>
          ) : null}
          <HeaderPill packages={packages} />
        </div>
      </header>
      <Toaster>
        <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      </Toaster>
      <BottomTabs />
    </div>
  );
}
