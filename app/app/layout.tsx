import Link from "next/link";
import { redirect } from "next/navigation";
import type { Viewport } from "next";
import { Avatar } from "@/components/ui/Avatar";
import { getActivePackages } from "@/lib/queries/packages";
import { getMyProfile, getMyUser } from "@/lib/queries/profile";
import { BottomTabs } from "@/components/member/BottomTabs";
import { HeaderPill } from "@/components/member/HeaderPill";
import { Wordmark } from "@/components/ui/Wordmark";
import { Toaster } from "@/components/ui/Toaster";

const LIGHT = "#f4f1ec";
const DARK = "#0b0b0b";

/** Status bar colour follows the member's appearance choice. */
export async function generateViewport(): Promise<Viewport> {
  const profile = await getMyProfile();
  const theme = profile?.theme ?? "dark";
  return {
    themeColor:
      theme === "light"
        ? LIGHT
        : theme === "system"
          ? [
              { media: "(prefers-color-scheme: light)", color: LIGHT },
              { media: "(prefers-color-scheme: dark)", color: DARK },
            ]
          : DARK,
  };
}

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getMyUser();
  if (!user) redirect("/login?next=/app");

  const [profile, packages] = await Promise.all([getMyProfile(), getActivePackages(supabase, user.id)]);

  return (
    <div data-theme={profile?.theme ?? "dark"} className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-ink text-paper">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-ink-3 bg-ink/95 px-4 py-3 backdrop-blur">
        <Wordmark className="text-xl" />
        <div className="flex items-center gap-3">
          {profile?.role !== "member" ? (
            <a href="/admin" className="text-xs text-muted underline-offset-4 hover:underline">
              Admin
            </a>
          ) : null}
          <HeaderPill packages={packages} />
          <Link href="/app/account" aria-label="Account" className="rounded-full">
            <Avatar name={profile?.full_name} src={profile?.avatar_url} size={30} ring={false} />
          </Link>
        </div>
      </header>
      <Toaster>
        <main className="flex-1 px-4 pb-28 pt-4">{children}</main>
      </Toaster>
      <BottomTabs name={profile?.full_name ?? null} avatarUrl={profile?.avatar_url ?? null} />
    </div>
  );
}
