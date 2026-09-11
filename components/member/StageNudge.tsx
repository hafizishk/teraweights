import Link from "next/link";
import { StartTrialButton } from "@/components/member/StartTrialButton";
import { stageNudge, type Stage } from "@/lib/rules/packs";

/**
 * The one push under the hero: the free week, a renewal, a top-up, or
 * nothing at all when the member is fine. Copy and timing in lib/rules/packs.
 */
export function StageNudge({ stage, trialEligible }: { stage: Stage; trialEligible: boolean }) {
  const nudge = stageNudge(stage, trialEligible);
  if (!nudge) return null;

  return (
    <section className="rule flex flex-col gap-3 pt-4">
      <div className="flex flex-col gap-1 border-l-2 border-brand pl-3">
        <span className="display text-[26px] leading-none">{nudge.title}</span>
        <span className="text-sm text-muted">{nudge.sub}</span>
      </div>
      {nudge.trial ? (
        <div className="flex flex-col gap-2">
          <StartTrialButton />
          <Link href="/app/packs" className="py-1 text-center text-sm text-muted underline-offset-4 hover:underline">
            Or see every pack
          </Link>
        </div>
      ) : (
        <Link href="/app/packs" className="display text-lg tracking-wide text-brand">
          {nudge.cta} →
        </Link>
      )}
    </section>
  );
}
