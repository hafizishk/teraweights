import { createClient } from "@/lib/supabase/server";
import { getPackageDefinitions } from "@/lib/queries/admin";
import { PackageForm } from "@/components/admin/PackageForm";
import { PageHeader, StatCard } from "@/components/admin/PageHeader";
import { formatSgd } from "@/lib/format";

export const metadata = { title: "Packages" };

export default async function AdminPackagesPage() {
  const supabase = await createClient();
  const packages = await getPackageDefinitions(supabase);

  const onSale = packages.filter((p) => p.is_active);
  const paid = onSale.filter((p) => p.price_sgd > 0);
  const cheapest = paid.length > 0 ? Math.min(...paid.map((p) => p.price_sgd)) : null;

  return (
    <>
      <PageHeader title="Packages" sub="Memberships, credit packs and drop-ins members can be put on." />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="On sale" value={onSale.length} hint={`${packages.length} in total`} />
        <StatCard label="Retired" value={packages.length - onSale.length} hint="Existing members keep theirs" />
        <StatCard label="From" value={cheapest === null ? "—" : formatSgd(cheapest)} hint="Cheapest paid package" />
      </div>

      <PackageForm packages={packages} />
    </>
  );
}
