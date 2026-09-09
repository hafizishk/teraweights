import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomTabs } from "@/components/member/BottomTabs";
import { Wordmark } from "@/components/ui/Wordmark";
import { Toaster } from "@/components/ui/Toaster";
import type { Profile } from "@/lib/types";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-ink">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-ink-3 bg-ink/95 px-4 py-3 backdrop-blur">
        <Wordmark className="text-xl" />
        {profile?.role !== "member" ? (
          <a href="/admin" className="text-xs text-muted underline-offset-4 hover:underline">
            Admin
          </a>
        ) : null}
      </header>
      <Toaster>
        <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
      </Toaster>
      <BottomTabs />
    </div>
  );
}
