"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";

const left = [
  { href: "/app/book", label: "Book" },
  { href: "/app/packs", label: "Packs" },
] as const;

const right = [
  { href: "/app/community", label: "Feed" },
  { href: "/app/events", label: "Events" },
] as const;

/** You is the landing screen; Account, My PA.ROX, Coaches and PT hang off it, so they light it up too. */
const YOU_ROUTES = ["/app/account", "/app/parox", "/app/coaches", "/app/pt", "/app/profile"];

function isActive(href: string, pathname: string): boolean {
  return pathname.startsWith(href);
}

/**
 * Five tabs, You in the middle as a raised circle carrying the member's own
 * photo or initials. Words in the display face for the other four; no icons,
 * the condensed caps are the brand.
 */
export function BottomTabs({ name, avatarUrl }: { name: string | null; avatarUrl: string | null }) {
  const pathname = usePathname();
  const youActive = pathname === "/app" || YOU_ROUTES.some((r) => pathname.startsWith(r));

  const tab = ({ href, label }: { href: string; label: string }) => {
    const active = isActive(href, pathname);
    return (
      <li key={href}>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`display -mt-px flex h-14 items-center justify-center border-t-2 text-[15px] tracking-wide ${
            active ? "border-brand text-paper" : "border-transparent text-muted hover:text-paper"
          }`}
        >
          {label}
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[480px] border-t border-ink-3 bg-ink/95 pb-1.5 backdrop-blur"
    >
      <ul className="grid grid-cols-5 items-end">
        {left.map(tab)}
        <li className="relative flex justify-center">
          <Link
            href="/app"
            aria-current={youActive ? "page" : undefined}
            aria-label="You"
            className="-mt-7 flex flex-col items-center gap-1"
          >
            <span
              className={`flex h-[60px] w-[60px] items-center justify-center rounded-full border-[3px] bg-ink shadow-[0_6px_18px_rgba(0,0,0,0.6)] ${
                youActive ? "border-brand" : "border-ink-3"
              }`}
            >
              <Avatar name={name} src={avatarUrl} size={50} ring={false} />
            </span>
            <span className={`display text-[13px] leading-none tracking-wide ${youActive ? "text-paper" : "text-muted"}`}>You</span>
          </Link>
        </li>
        {right.map(tab)}
      </ul>
    </nav>
  );
}
