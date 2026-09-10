import { notFound } from "next/navigation";
import { Wordmark } from "@/components/ui/Wordmark";
import { Avatar } from "@/components/ui/Avatar";
import { createAdminClient } from "@/lib/supabase/admin";
import { devSignInAs } from "@/lib/actions/dev-login";
import { devLoginEnabled } from "@/lib/dev-login";
import type { Role } from "@/lib/types";

export const metadata = { title: "Dev sign-in" };
export const dynamic = "force-dynamic";

type Row = { email: string | null; full_name: string | null; role: Role; avatar_url: string | null };

const ORDER: Record<Role, number> = { member: 0, coach: 1, admin: 2 };

export default async function DevLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!devLoginEnabled()) notFound();
  const { error } = await searchParams;

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email, full_name, role, avatar_url")
    .not("email", "is", null)
    .order("full_name");
  const rows = ((data ?? []) as Row[]).sort((a, b) => ORDER[a.role] - ORDER[b.role]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Wordmark className="text-4xl" />
        <div className="heartbeat w-40" />
        <p className="text-sm text-muted">Dev sign-in. Pick an account; no email is sent.</p>
      </div>

      {error ? <p className="text-sm text-brand">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink-3 px-4 py-6 text-center text-sm text-muted">
          No accounts. Run supabase/seed.sql first.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.email!}>
              <form action={devSignInAs}>
                <input type="hidden" name="email" value={r.email!} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-md border border-ink-3 bg-ink-2 px-4 py-3 text-left hover:border-muted"
                >
                  <Avatar name={r.full_name ?? "?"} src={r.avatar_url} size={36} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="display text-lg leading-none">{r.full_name ?? r.email}</span>
                    <span className="truncate text-xs text-muted">{r.email}</span>
                  </span>
                  <span className="display text-xs uppercase tracking-widest text-muted">{r.role}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
