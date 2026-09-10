"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { Field, Input, Select, Textarea, controlClass } from "@/components/admin/Field";
import { Table, Th, Td, Tr, EmptyRow } from "@/components/admin/Table";
import { Badge, ClassBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toaster";
import { savePackage, setPackageActive } from "@/lib/actions/packages";
import type { ActionResult } from "@/lib/actions/bookings";
import type { PackageDefinition } from "@/lib/queries/admin";
import { formatSgd } from "@/lib/format";
import type { ClassSlug } from "@/lib/types";

const CLASS_TYPES: ClassSlug[] = ["energise_east", "energise_west", "prime", "fitness_engine"];

const KINDS: { value: PackageDefinition["kind"]; label: string }[] = [
  { value: "membership", label: "Membership" },
  { value: "credits", label: "Credit pack" },
  { value: "dropin", label: "Drop-in" },
];

const KIND_LABELS: Record<PackageDefinition["kind"], string> = {
  membership: "Membership",
  credits: "Credit pack",
  dropin: "Drop-in",
};

const NEW = "new";

/** Only the class slugs we know how to badge; anything else is ignored. */
function knownClassTypes(slugs: string[]): ClassSlug[] {
  return CLASS_TYPES.filter((slug) => slugs.includes(slug));
}

/**
 * Checkboxes for the class types a package covers. Their values are joined
 * into the comma-separated hidden input the action reads. Lives in its own
 * component so remounting the form resets it with the newly selected package.
 */
function ClassTypePicker({ initial }: { initial: ClassSlug[] }) {
  const [checked, setChecked] = useState<ClassSlug[]>(initial);

  function toggle(slug: ClassSlug, on: boolean) {
    setChecked((prev) => (on ? [...prev, slug] : prev.filter((s) => s !== slug)));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-widest text-muted">What it covers</span>
      <div className="flex flex-wrap gap-2">
        {CLASS_TYPES.map((slug) => (
          <label
            key={slug}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-ink-3 bg-ink px-3 py-2"
          >
            <input
              type="checkbox"
              checked={checked.includes(slug)}
              onChange={(e) => toggle(slug, e.target.checked)}
              className="h-4 w-4 accent-[#b11226]"
            />
            <ClassBadge slug={slug} />
          </label>
        ))}
      </div>
      <input type="hidden" name="allowed_class_types" value={checked.join(",")} />
      <span className="text-xs text-muted">Pick at least one.</span>
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink-3 bg-ink px-3 py-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#b11226]" />
      <span>{label}</span>
    </label>
  );
}

/** The fields themselves, remounted (via key) whenever the selection changes. */
function PackageFields({ pkg }: { pkg: PackageDefinition | null }) {
  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="id" value={pkg?.id ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="name" defaultValue={pkg?.name ?? ""} required placeholder="Energise Weekday" />
        </Field>
        <Field label="Kind">
          <Select name="kind" defaultValue={pkg?.kind ?? "membership"}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Description" hint="Say what it gets you in sessions, not just a price.">
        <Textarea
          name="description"
          defaultValue={pkg?.description ?? ""}
          placeholder="10 credits, about five weeks at twice a week."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tier">
          <Select name="tier" defaultValue={pkg?.tier ?? ""}>
            <option value="">None</option>
            <option value="energise">Energise</option>
            <option value="pro">PRO / PRIME</option>
          </Select>
        </Field>
        <Field label="Variant">
          <Select name="variant" defaultValue={pkg?.variant ?? ""}>
            <option value="">None</option>
            <option value="weekday">Weekday</option>
            <option value="weekend">Weekend</option>
            <option value="west">West</option>
          </Select>
        </Field>
        <Field label="Term (months)" hint="Blank for credit packs and drop-ins.">
          <Input name="term_months" type="number" min={1} defaultValue={pkg?.term_months ?? ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Validity (days)" hint="Free months are modelled as longer validity.">
          <Input name="validity_days" type="number" min={1} defaultValue={pkg?.validity_days ?? 30} required />
        </Field>
        <Field label="Credits" hint="Blank for unlimited memberships.">
          <Input name="credits" type="number" min={0} defaultValue={pkg?.credits ?? ""} />
        </Field>
        <Field label="Fitness Engine credits">
          <Input name="fe_credits_included" type="number" min={0} defaultValue={pkg?.fe_credits_included ?? 0} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price (SGD)">
          <Input name="price_sgd" type="number" min={0} step="0.01" defaultValue={pkg?.price_sgd ?? 0} required />
        </Field>
        <Field label="Price per month (SGD)" hint="Blank unless the package advertises a monthly rate.">
          <Input name="price_per_month" type="number" min={0} step="0.01" defaultValue={pkg?.price_per_month ?? ""} />
        </Field>
      </div>

      <ClassTypePicker initial={knownClassTypes(pkg?.allowed_class_types ?? [])} />

      <Field label="Perks" hint="Comma separated. Shown on the package card.">
        <Input name="perks" defaultValue={(pkg?.perks ?? []).join(", ")} placeholder="Cashback eligible, Free tee" />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Toggle name="cashback_eligible" label="Cashback eligible" defaultChecked={pkg?.cashback_eligible ?? false} />
        <Toggle name="is_active" label="On sale" defaultChecked={pkg?.is_active ?? true} />
      </div>
    </div>
  );
}

/**
 * The whole packages editing experience: the form on top, the table of every
 * package below. Editing a row loads it into the form; there is no local
 * persistence, the selection is React state only.
 */
export function PackageForm({ packages }: { packages: PackageDefinition[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<string>(NEW);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(savePackage, null);

  useEffect(() => {
    if (!state) return;
    toast.show(state.ok ? state.message : state.error, state.ok ? "ok" : "error");
    if (state.ok) router.refresh();
  }, [state, toast, router]);

  const current = packages.find((p) => p.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{current ? `Edit ${current.name}` : "New package"}</CardTitle>
          <div className="flex items-center gap-2">
            <select
              aria-label="Package to edit"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className={`${controlClass} w-auto`}
            >
              <option value={NEW}>New package</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <PackageFields key={selected} pkg={current} />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={pending} className="w-auto">
              {current ? "Save package" : "Create package"}
            </Button>
            {current ? (
              <button
                type="button"
                onClick={() => setSelected(NEW)}
                className="text-sm text-muted underline-offset-4 hover:underline"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>Package</Th>
            <Th>Kind</Th>
            <Th>Covers</Th>
            <Th>Credits</Th>
            <Th>Validity</Th>
            <Th>Price</Th>
            <Th>Cashback</Th>
            <Th>State</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {packages.length === 0 ? (
            <EmptyRow colSpan={9}>No packages yet. Create the first one above.</EmptyRow>
          ) : (
            packages.map((p) => (
              <Tr key={p.id} className={p.id === selected ? "bg-ink-2" : ""}>
                <Td>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-paper">{p.name}</span>
                    {p.is_trial ? <Badge>Trial</Badge> : null}
                  </span>
                  {p.description ? <span className="block text-xs text-muted">{p.description}</span> : null}
                </Td>
                <Td className="text-muted">
                  {KIND_LABELS[p.kind]}
                  {p.term_months ? <span className="block text-xs">{p.term_months} month term</span> : null}
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1">
                    {knownClassTypes(p.allowed_class_types).map((slug) => (
                      <ClassBadge key={slug} slug={slug} />
                    ))}
                  </span>
                </Td>
                <Td className="text-muted">
                  {p.credits ?? "Unlimited"}
                  {p.fe_credits_included > 0 ? (
                    <span className="block text-xs">+{p.fe_credits_included} FE</span>
                  ) : null}
                </Td>
                <Td className="text-muted">{p.validity_days} days</Td>
                <Td>
                  {formatSgd(p.price_sgd)}
                  {p.price_per_month !== null ? (
                    <span className="block text-xs text-muted">{formatSgd(p.price_per_month)}/mo</span>
                  ) : null}
                </Td>
                <Td className="text-muted">{p.cashback_eligible ? "Yes" : "—"}</Td>
                <Td>
                  {p.is_active ? (
                    <span className="text-paper">On sale</span>
                  ) : (
                    <span className="text-muted">Retired</span>
                  )}
                </Td>
                <Td>
                  <span className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(p.id)}
                      className="inline-flex h-8 items-center whitespace-nowrap rounded-md border border-ink-3 px-3 text-xs text-paper transition-colors hover:border-muted"
                    >
                      Edit
                    </button>
                    <ActionButton
                      action={() => setPackageActive(p.id, !p.is_active)}
                      variant={p.is_active ? "danger" : "quiet"}
                      confirm={p.is_active ? "Retire it?" : undefined}
                    >
                      {p.is_active ? "Retire" : "Reinstate"}
                    </ActionButton>
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );
}
