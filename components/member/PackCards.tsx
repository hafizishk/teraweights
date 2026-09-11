"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { StartTrialButton } from "@/components/member/StartTrialButton";
import { formatSgd } from "@/lib/format";
import { packBlurb, termSaving, type CataloguePackage, type Plan } from "@/lib/rules/packs";

/**
 * Buy is wired to Stripe Checkout when payments land (scope change: built
 * last). Until then it says so and records nothing; no manual PayNow.
 */
export function BuyButton({ price, variant = "primary" }: { price: number; variant?: "primary" | "secondary" }) {
  const toast = useToast();
  return (
    <Button
      variant={variant}
      onClick={() => toast.show("Checkout is coming with payments. Message the coaches to get set up now.")}
    >
      Buy · {formatSgd(price)}
    </Button>
  );
}

function Perks({ perks }: { perks: string[] }) {
  if (perks.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {perks.map((perk) => (
        <li key={perk}>
          <Badge>{perk}</Badge>
        </li>
      ))}
    </ul>
  );
}

/** One membership plan, terms switchable inside the card. */
export function PlanCard({ plan, highlight = false }: { plan: Plan; highlight?: boolean }) {
  const defaultTerm = plan.terms.find((t) => t.term_months === 4) ?? plan.terms[0];
  const [termId, setTermId] = useState(defaultTerm.id);
  const term = plan.terms.find((t) => t.id === termId) ?? defaultTerm;
  const saving = termSaving(term, plan);
  const isPro = plan.key === "pro";

  return (
    <article className={`flex flex-col gap-3 rounded-lg border p-4 ${highlight ? "border-brand" : "border-ink-3"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className={`display text-[26px] leading-none ${isPro ? "text-prime" : ""}`}>{plan.title}</h3>
          <p className="text-sm text-muted">{plan.blurb}</p>
        </div>
        {highlight ? <Badge className="border-brand text-brand">For you</Badge> : null}
      </div>

      {plan.terms.length > 1 ? (
        <div className="grid gap-1 rounded-md border border-ink-3 p-1" style={{ gridTemplateColumns: `repeat(${plan.terms.length}, minmax(0, 1fr))` }}>
          {plan.terms.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTermId(t.id)}
              aria-pressed={t.id === term.id}
              className={`display rounded px-1 py-2 text-center text-base leading-none tracking-wide ${
                t.id === term.id ? "bg-brand text-paper" : "text-muted hover:text-paper"
              }`}
            >
              {t.term_months} mo
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-3">
        <span className="display tnum text-[40px] leading-none">{formatSgd(term.price_sgd)}</span>
        <span className="flex flex-col items-end text-right">
          {term.price_per_month ? <span className="tnum text-sm">{formatSgd(term.price_per_month)} a month</span> : null}
          {saving ? <span className="eyebrow text-prime">{saving}</span> : null}
        </span>
      </div>

      <ul className="flex flex-col gap-0.5 text-sm text-paper/85">
        <li>Valid {term.validity_days} days</li>
        {term.fe_credits_included > 0 ? (
          <li>
            {term.fe_credits_included} Fitness Engine {term.fe_credits_included === 1 ? "session" : "sessions"} included
          </li>
        ) : null}
        {term.cashback_eligible ? <li>Cashback eligible</li> : null}
      </ul>
      <Perks perks={term.perks} />

      <BuyButton price={term.price_sgd} variant={highlight ? "primary" : "secondary"} />
    </article>
  );
}

/** A credit pack, drop-in or PT pack. */
export function PackCard({ pack, weeklyTarget, highlight = false }: { pack: CataloguePackage; weeklyTarget: number; highlight?: boolean }) {
  const best = pack.perks.some((p) => /best value/i.test(p));
  return (
    <article className={`flex flex-col gap-3 rounded-lg border p-4 ${highlight ? "border-brand" : "border-ink-3"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="display text-[26px] leading-none">{pack.name}</h3>
          <p className="text-sm text-muted">{packBlurb(pack, weeklyTarget)}</p>
        </div>
        {highlight ? <Badge className="border-brand text-brand">For you</Badge> : best ? <Badge className="border-prime/60 text-prime">Best value</Badge> : null}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="display tnum text-[40px] leading-none">{formatSgd(pack.price_sgd)}</span>
        {pack.credits && pack.credits > 1 ? <span className="tnum text-sm">{formatSgd(pack.price_sgd / pack.credits)} a session</span> : null}
      </div>
      {pack.cashback_eligible ? <p className="text-sm text-paper/85">Cashback eligible</p> : null}
      <Perks perks={pack.perks.filter((p) => !/best value/i.test(p))} />
      <BuyButton price={pack.price_sgd} variant={highlight ? "primary" : "secondary"} />
    </article>
  );
}

/** The free week, for anyone still eligible. */
export function TrialCard({ pack }: { pack: CataloguePackage }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-brand p-4">
      <div className="flex flex-col gap-1">
        <span className="eyebrow text-brand">Start here</span>
        <h3 className="display text-[30px] leading-none">A week on us</h3>
        <p className="text-sm text-muted">Seven days of Energise East and West, any session. No card, no catch, one per Energiser.</p>
      </div>
      <Perks perks={pack.perks} />
      <StartTrialButton />
    </article>
  );
}
