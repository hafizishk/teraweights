/**
 * "What it gets you" copy for packages (scope change, 10 Sep 2026).
 * Price alone tells a member nothing; sessions do.
 */
import { formatDate } from "@/lib/format";

export type CopyPackage = {
  kind: "membership" | "credits" | "dropin" | "pt";
  tier: "energise" | "pro" | null;
  variant: "weekday" | "weekend" | "west" | null;
  credits_remaining: number | null;
  expires_at: string;
  is_trial: boolean;
};

export function describePackage(p: CopyPackage, weeklyTarget = 2, now: Date = new Date()): string {
  const until = `until ${formatDate(p.expires_at)}`;

  if (p.is_trial) return `Any East or West session, ${until}`;

  if (p.kind === "dropin") return "One session, valid on the day";

  if (p.kind === "pt") {
    const n = p.credits_remaining ?? 0;
    if (n === 0) return `No PT sessions left. Expired ${formatDate(p.expires_at)}`;
    return `${n} one-to-one ${n === 1 ? "session" : "sessions"} with a coach, ${until}`;
  }

  if (p.kind === "credits") {
    const n = p.credits_remaining ?? 0;
    if (n === 0) return `No credits left. Expired ${formatDate(p.expires_at)}`;
    const target = Math.max(1, weeklyTarget);
    const weeks = Math.ceil(n / target);
    const weeksLeft = Math.max(0, Math.floor((new Date(p.expires_at).getTime() - now.getTime()) / (7 * 86_400_000)));
    const pace = `about ${weeks} ${weeks === 1 ? "week" : "weeks"} at ${target} a week`;
    if (weeksLeft < weeks) return `${n} ${n === 1 ? "credit" : "credits"}, use by ${formatDate(p.expires_at)}`;
    return `${n} ${n === 1 ? "credit" : "credits"}, ${pace}`;
  }

  // Memberships.
  if (p.tier === "pro") return `PRIME plus every Energise session, ${until}`;
  switch (p.variant) {
    case "weekday":
      return `Unlimited East and West, Mon–Fri, ${until}`;
    case "weekend":
      return `Unlimited East and West, Sat–Sun, ${until}`;
    case "west":
      return `Unlimited West sessions, ${until}`;
    default:
      return `Unlimited Energise sessions, ${until}`;
  }
}
