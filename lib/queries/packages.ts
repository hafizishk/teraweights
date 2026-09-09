import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberPackage } from "@/lib/rules/entitlement";

type PackageJoin = {
  id: string;
  kind: MemberPackage["kind"];
  credits_total: number | null;
  credits_remaining: number | null;
  fe_credits_remaining: number;
  payment_status: "pending" | "paid";
  expires_at: string;
  purchased_at: string;
  packages: {
    name: string;
    tier: MemberPackage["tier"];
    variant: MemberPackage["variant"];
    allowed_class_types: string[];
    term_months: number | null;
    perks: string[];
    cashback_eligible: boolean;
  } | null;
};

export type MemberPackageRow = MemberPackage & {
  credits_total: number | null;
  term_months: number | null;
  perks: string[];
  cashback_eligible: boolean;
  purchased_at: string;
};

const SELECT =
  "id, kind, credits_total, credits_remaining, fe_credits_remaining, payment_status, expires_at, purchased_at, " +
  "packages(name, tier, variant, allowed_class_types, term_months, perks, cashback_eligible)";

function toRow(r: PackageJoin): MemberPackageRow {
  return {
    id: r.id,
    package_name: r.packages?.name ?? "Package",
    kind: r.kind,
    tier: r.packages?.tier ?? null,
    variant: r.packages?.variant ?? null,
    allowed_class_types: r.packages?.allowed_class_types ?? [],
    credits_total: r.credits_total,
    credits_remaining: r.credits_remaining,
    fe_credits_remaining: r.fe_credits_remaining,
    payment_status: r.payment_status,
    expires_at: r.expires_at,
    term_months: r.packages?.term_months ?? null,
    perks: r.packages?.perks ?? [],
    cashback_eligible: r.packages?.cashback_eligible ?? false,
    purchased_at: r.purchased_at,
  };
}

/** Every package the member holds, newest purchase first. RLS scopes this to them. */
export async function getMemberPackages(
  supabase: SupabaseClient,
  memberId: string,
): Promise<MemberPackageRow[]> {
  const { data } = await supabase
    .from("member_packages")
    .select(SELECT)
    .eq("member_id", memberId)
    .order("purchased_at", { ascending: false });

  return ((data ?? []) as unknown as PackageJoin[]).map(toRow);
}

/** Paid and unexpired only — what entitlement resolution runs against. */
export async function getActivePackages(
  supabase: SupabaseClient,
  memberId: string,
): Promise<MemberPackageRow[]> {
  const { data } = await supabase
    .from("member_packages")
    .select(SELECT)
    .eq("member_id", memberId)
    .eq("payment_status", "paid")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true });

  return ((data ?? []) as unknown as PackageJoin[]).map(toRow);
}
