import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assertOnboarded } from "@/lib/onboarding";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ThemeToggle } from "@/components/member/ThemeToggle";
import { version } from "@/package.json";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Account" };

type Row = { href: string; title: string; sub?: string };

function Rows({ rows }: { rows: Row[] }) {
  return (
    <nav className="flex flex-col">
      {rows.map((r) => (
        <Link key={r.href} href={r.href} className="rule flex items-center justify-between gap-4 py-3">
          <span className="flex flex-col">
            <span className="display text-[20px] leading-none">{r.title}</span>
            {r.sub ? <span className="text-xs text-muted">{r.sub}</span> : null}
          </span>
          <span className="text-muted">›</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Account is a hub, the way a settings screen is: who you are at the top,
 * then rows. The editable form lives one tap in, under Your details.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle<Profile>();
  assertOnboarded(profile);
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl">Account</h1>

      <Link href="/app/account/details" className="rule flex items-center gap-4 py-4">
        <Avatar name={profile.full_name} src={profile.avatar_url} size={56} ring={false} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="display truncate text-[22px] leading-none">{profile.full_name ?? "Energiser"}</span>
          <span className="truncate text-xs text-muted">{profile.email}</span>
        </span>
        <span className="text-muted">›</span>
      </Link>

      <Rows
        rows={[
          { href: "/app/account/details", title: "Your details", sub: "Name, phone, photo, zone, usual time" },
          { href: "/app#packages", title: "Packages", sub: "What you're on and what's left" },
          { href: "/app/pt", title: "Personal training", sub: "Your pack and your coach" },
          {
            href: "/app/account/health",
            title: "Connected health",
            sub: profile.health_source
              ? `${profile.health_source === "apple_health" ? "Apple Health" : "Health Connect"}${profile.health_device ? ` · ${profile.health_device}` : ""}`
              : "Not connected",
          },
        ]}
      />

      <div className="rule pt-4">
        <ThemeToggle theme={profile.theme ?? "dark"} />
      </div>

      <Rows
        rows={[
          { href: "/app/account/support", title: "Support", sub: "Get help with bookings or your account" },
          { href: "/app/account/legal", title: "Legal", sub: "House rules and your data" },
        ]}
      />

      <InstallPrompt />

      <div className="flex flex-col items-center gap-3 pt-2">
        <p className="text-center text-xs text-muted">
          Teraweights {version}
          <br />
          Built in Singapore by Stackform Studios
        </p>
        <form action={signOut} className="w-full">
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
