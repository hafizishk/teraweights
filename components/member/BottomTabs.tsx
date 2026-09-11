"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/app", label: "Home" },
  { href: "/app/book", label: "Book" },
  { href: "/app/community", label: "Feed" },
  { href: "/app/events", label: "Events" },
  { href: "/app/parox", label: "PA.ROX" },
  { href: "/app/profile", label: "You" },
] as const;

/**
 * Six words in the display face. No icons: the condensed caps are the
 * brand, and a row of generic line icons is not. "Feed" is the community
 * page, the thing the Telegram channel used to be.
 */
export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[480px] border-t border-ink-3 bg-ink/95 backdrop-blur"
    >
      <ul className="grid grid-cols-6">
        {tabs.map(({ href, label }) => {
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`display -mt-px flex h-12 items-center justify-center border-t-2 text-[14px] tracking-wide ${
                  active ? "border-brand text-paper" : "border-transparent text-muted hover:text-paper"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
