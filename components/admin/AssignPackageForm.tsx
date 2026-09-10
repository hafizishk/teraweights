"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select } from "@/components/admin/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { assignPackage } from "@/lib/actions/members";
import type { ActionResult } from "@/lib/actions/bookings";
import type { PackageDefinition } from "@/lib/queries/admin";
import { formatSgd } from "@/lib/format";

/** Assign a package: pick one, set the payment status, optionally back-date it. */
export function AssignPackageForm({
  memberId,
  packages,
}: {
  memberId: string;
  packages: PackageDefinition[];
}) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(assignPackage, null);

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, toast, router]);

  if (packages.length === 0) {
    return <p className="text-sm text-muted">No active packages to assign. Add one under Packages first.</p>;
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="member_id" value={memberId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Package">
          <Select name="package_id" defaultValue={packages[0].id} required>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatSgd(p.price_sgd)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Payment">
          <Select name="payment_status" defaultValue="paid">
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </Select>
        </Field>

        <Field label="Payment reference" hint="Optional — PayNow reference or receipt number.">
          <Input name="payment_ref" placeholder="PayNow ref" />
        </Field>

        <Field label="Starts" hint="Optional — defaults to today.">
          <Input type="date" name="starts_at" />
        </Field>
      </div>

      <Button type="submit" loading={pending} variant="secondary" className="h-10 w-auto self-start px-5 text-base">
        Assign package
      </Button>
    </form>
  );
}
