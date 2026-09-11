import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getMemberPackages } from "@/lib/queries/packages";
import { getPackageDefinitions } from "@/lib/queries/admin";
import { trialEligibility } from "@/lib/rules/trial";
import { buildCatalogue, memberStage, planKey } from "@/lib/rules/packs";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/rules/cancellation";
import { PackCard, PlanCard, TrialCard } from "@/components/member/PackCards";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Packs" };

/**
 * The Packs tab: everything on sale, from the packages table the admin
 * maintains. The top card is chosen by the member's stage; the rest is the
 * whole catalogue, memberships as one card per plan with a term switch.
 */
export default async function PacksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  await requireOnboarded(supabase, uid);
  const now = new Date();

  const [{ data: profile }, mine, defs] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle<Profile>(),
    getMemberPackages(supabase, uid),
    getPackageDefinitions(supabase, { activeOnly: true }),
  ]);

  const weeklyTarget = profile?.weekly_target ?? 2;
  const catalogue = buildCatalogue(defs);
  const stage = memberStage(mine, now);
  const trial = trialEligibility(mine, now);

  // Which card to lift to the top: the plan they are on or were last on,
  // credits when they are running low on credits, Weekday for everyone else.
  const lastMembership = mine
    .filter((p) => p.kind === "membership" && !p.is_trial)
    .sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];
  const highlightKey =
    stage.kind === "low" && stage.what === "credits"
      ? "credits"
      : lastMembership
        ? planKey(lastMembership)
        : "energise-weekday";

  const intro =
    stage.kind === "new"
      ? "Pick how you want to train. Every pack works at East and West."
      : stage.kind === "lapsed"
        ? "Pick up where you left off. Your bookings, results and streak are all still here."
        : stage.kind === "trial"
          ? "Liked the free week? Here is what comes next."
          : stage.kind === "low"
            ? "Keep it going. Renew or top up before it runs out."
            : "What is on sale, in case you want to change things up.";

  const showTrial = catalogue.trial && trial.eligible;
  const highlightedPack = highlightKey === "credits" ? catalogue.packs.find((p) => p.kind === "credits") : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">Packs</h1>
        <p className="text-sm text-muted">{intro}</p>
      </div>

      {showTrial && catalogue.trial ? <TrialCard pack={catalogue.trial} /> : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 className="text-xl">Memberships</h2>
          <p className="text-sm text-muted">Unlimited sessions. Longer terms carry months free and the welcome kit.</p>
        </div>
        {catalogue.plans.map((plan) => (
          <PlanCard key={plan.key} plan={plan} highlight={!showTrial && plan.key === highlightKey} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 className="text-xl">Packs and passes</h2>
          <p className="text-sm text-muted">Credits you spend one session at a time, no fixed days.</p>
        </div>
        {catalogue.packs.map((pack) => (
          <PackCard key={pack.id} pack={pack} weeklyTarget={weeklyTarget} highlight={pack.id === highlightedPack?.id} />
        ))}
      </section>

      {catalogue.pt.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-xl">Personal training</h2>
            <p className="text-sm text-muted">One to one with a coach, booked into their open hours. Separate from class credits.</p>
          </div>
          {catalogue.pt.map((pack) => (
            <PackCard key={pack.id} pack={pack} weeklyTarget={weeklyTarget} />
          ))}
        </section>
      ) : null}

      <section className="rule flex flex-col gap-2 pt-4 text-sm text-muted">
        <h2 className="text-xl text-paper">The basics</h2>
        <p>One credit is one session. Memberships cover every session in their days, no credits needed.</p>
        <p>Cancel {CANCELLATION_CUTOFF_HOURS} hours or more before a session and the credit comes back. Inside that, it does not.</p>
        <p>Need to pause a membership? Message the coaches and they will sort it.</p>
      </section>
    </div>
  );
}
