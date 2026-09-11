"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/ui/Wordmark";
import { signOut } from "@/lib/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/types";

const adminNav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/announcements", label: "Community" },
  { href: "/admin/staff", label: "Staff" },
];

const coachNav = [
  { href: "/admin", label: "Today" },
  { href: "/admin/schedule", label: "Schedule" },
];

const eventAssistantNav = [{ href: "/admin/events", label: "Events" }];

const navFor: Record<Role, { href: string; label: string }[]> = {
  admin: adminNav,
  coach: coachNav,
  event_assistant: eventAssistantNav,
  member: [],
};

export function Sidebar({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const nav = navFor[role];

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-ink-3 bg-ink-2 px-4 py-6">
      <Wordmark />
      <p className="mt-1 text-xs uppercase tracking-widest text-muted">{ROLE_LABELS[role]}</p>
      <div className="heartbeat my-5 w-full" />
      <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
        {nav.map(({ href, label }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`display rounded-md px-3 py-2 text-lg tracking-wide ${
                active ? "bg-brand text-paper" : "text-muted hover:bg-ink-3 hover:text-paper"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-2 border-t border-ink-3 pt-4 text-sm">
        <p className="truncate text-paper">{name}</p>
        <Link href="/app" className="text-muted underline-offset-4 hover:underline">
          Member app
        </Link>
        <form action={signOut}>
          <button type="submit" className="text-muted underline-offset-4 hover:underline">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
