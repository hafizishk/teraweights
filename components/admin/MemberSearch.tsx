"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { controlClass } from "@/components/admin/Field";

/**
 * Search box for the members table. Submitting pushes `?q=` so the result is a
 * plain URL an admin can bookmark or share.
 */
export function MemberSearch({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  function go(term: string) {
    const q = term.trim();
    startTransition(() => {
      router.push(q ? `/admin/members?q=${encodeURIComponent(q)}` : "/admin/members");
    });
  }

  return (
    <form
      role="search"
      className="mb-4 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
    >
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Name, email or phone"
        aria-label="Search members"
        className={`${controlClass} max-w-sm`}
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center whitespace-nowrap rounded-md border border-brand bg-brand px-4 text-xs text-paper transition-colors hover:bg-brand-2 disabled:opacity-50"
      >
        {pending ? "Searching…" : "Search"}
      </button>
      {initial ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setValue("");
            go("");
          }}
          className="inline-flex h-10 items-center whitespace-nowrap rounded-md border border-ink-3 px-4 text-xs text-muted transition-colors hover:border-muted hover:text-paper disabled:opacity-50"
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
