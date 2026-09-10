"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select } from "@/components/admin/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { adjustCredits } from "@/lib/actions/members";
import type { ActionResult } from "@/lib/actions/bookings";
import type { MemberPackageRow } from "@/lib/queries/packages";

/** Add or take back credits on one held package. The reason is required — it is the audit trail. */
export function AdjustCreditsForm({
  memberId,
  packages,
}: {
  memberId: string;
  packages: MemberPackageRow[];
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(adjustCredits, null);

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, toast, router]);

  if (packages.length === 0) {
    return <p className="text-sm text-muted">Nothing to adjust — this Energiser holds no packages yet.</p>;
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="member_id" value={memberId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Package">
          <Select name="member_package_id" defaultValue={packages[0].id} required>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.package_name} — {p.credits_remaining ?? 0} credits, {p.fe_credits_remaining} FE
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Kind">
          <Select name="kind" defaultValue="credit">
            <option value="credit">Credit</option>
            <option value="fe_credit">Fitness Engine credit</option>
          </Select>
        </Field>

        <Field label="Change" hint="Whole number. Negative takes credits away.">
          <Input type="number" name="delta" step={1} defaultValue={1} required />
        </Field>

        <Field label="Reason" hint="Shown in the adjustment history.">
          <Input name="reason" placeholder="Session cancelled by coach" required />
        </Field>
      </div>

      <Button type="submit" loading={pending} variant="secondary" className="h-10 w-auto self-start px-5 text-base">
        Adjust credits
      </Button>
    </form>
  );
}
