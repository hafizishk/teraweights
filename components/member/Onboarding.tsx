"use client";

import { useState } from "react";
import { completeOnboarding } from "@/lib/actions/profile";

type Step = { key: "zone" | "weekly_target" | "preferred_time"; title: string; help: string; options: { value: string; label: string; hint?: string }[] };

const STEPS: Step[] = [
  {
    key: "zone",
    title: "Where do you usually train?",
    help: "Sets your default in Book and which coach notes you see.",
    options: [
      { value: "east", label: "East", hint: "Bedok Reservoir · Tue, Thu, Sat, Sun" },
      { value: "west", label: "West", hint: "Wed evening, Sun morning" },
    ],
  },
  {
    key: "weekly_target",
    title: "How many sessions a week are you aiming for?",
    help: "Your streak ring fills against this. You can change it any time.",
    options: [
      { value: "1", label: "1 a week" },
      { value: "2", label: "2 a week" },
      { value: "3", label: "3 a week" },
      { value: "4", label: "4 or more" },
    ],
  },
  {
    key: "preferred_time",
    title: "Mornings or evenings?",
    help: "We'll mark your usual slot so it's easy to find.",
    options: [
      { value: "morning", label: "Mornings", hint: "7.30am and 8am sessions" },
      { value: "evening", label: "Evenings", hint: "6pm and 8pm sessions" },
      { value: "either", label: "Either" },
    ],
  },
];

export function Onboarding({ firstName }: { firstName: string }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  function pick(value: string) {
    const next = { ...answers, [step.key]: value };
    setAnswers(next);
    if (!last) setIndex(index + 1);
  }

  return (
    <div className="flex min-h-[70vh] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted">Welcome, {firstName}</span>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s.key} className={`h-1 flex-1 rounded-full ${i <= index ? "bg-brand" : "bg-ink-3"}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-[36px] leading-[0.92]">{step.title}</h1>
        <p className="text-sm text-muted">{step.help}</p>
      </div>

      <form action={completeOnboarding} className="flex flex-1 flex-col gap-3">
        {Object.entries(answers).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

        <div className="flex flex-col border-b border-ink-3">
          {step.options.map((o) => {
            const selected = answers[step.key] === o.value;
            return (
              <button
                key={o.value}
                type={last ? "submit" : "button"}
                name={last ? step.key : undefined}
                value={last ? o.value : undefined}
                onClick={() => pick(o.value)}
                className={`rule flex min-h-[60px] items-center justify-between py-3 text-left ${
                  selected ? "border-l-2 border-l-brand pl-3" : "hover:text-paper"
                }`}
              >
                <span className="flex flex-col">
                  <span className="display text-[24px] leading-none">{o.label}</span>
                  {o.hint ? <span className="eyebrow mt-1">{o.hint}</span> : null}
                </span>
                <span className="display text-xl text-muted">›</span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          {index > 0 ? (
            <button type="button" onClick={() => setIndex(index - 1)} className="text-sm text-muted underline underline-offset-4">
              Back
            </button>
          ) : (
            <span />
          )}
          {last ? null : (
            <button type="submit" className="text-sm text-muted underline underline-offset-4">
              Skip for now
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
