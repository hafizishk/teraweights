"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { Field, Input, Select } from "@/components/admin/Field";
import { inviteStaff, setStaffProfile } from "@/lib/actions/staff";
import { ROLE_LABELS, STAFF_ROLES } from "@/lib/types";
import type { ActionResult } from "@/lib/actions/bookings";

function useActionToast(state: ActionResult | null) {
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) router.refresh();
  }, [state, toast, router]);
}

/** Add someone to the staff by email, before or after they have an account. */
export function InviteStaffForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(inviteStaff, null);
  useActionToast(state);

  return (
    <form action={action} className="grid items-end gap-4 sm:grid-cols-3">
      <Field label="Email" hint="They get the role the first time they sign in.">
        <Input name="email" type="email" required placeholder="name@example.com" />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="coach">
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" loading={pending} variant="secondary" className="h-10 text-base">
        Add to staff
      </Button>
    </form>
  );
}

/**
 * Job title and bio. The title sits beside their name across the portal; the
 * bio is what members read on the coaches page. Neither affects permissions.
 */
export function StaffProfileForm({ id, title, bio }: { id: string; title: string | null; bio: string | null }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(setStaffProfile, null);
  useActionToast(state);

  return (
    <form action={action} className="flex w-full max-w-md flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="staff_title"
        defaultValue={title ?? ""}
        placeholder="Head coach"
        aria-label="Job title"
        className="h-8 w-full rounded-md border border-ink-3 bg-ink px-2 text-xs text-paper placeholder:text-muted focus:border-brand focus:outline-none"
      />
      <textarea
        name="bio"
        defaultValue={bio ?? ""}
        rows={3}
        placeholder="Two or three lines members will read on the coaches page."
        aria-label="Bio"
        className="w-full rounded-md border border-ink-3 bg-ink px-2 py-1.5 text-xs text-paper placeholder:text-muted focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-8 w-fit items-center rounded-md border border-ink-3 px-3 text-xs hover:border-muted disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
