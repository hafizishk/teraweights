import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/onboarding";
import { getMemberPackages } from "@/lib/queries/packages";
import { activePtPack, getPtCoaches, getTakenSlots } from "@/lib/queries/pt";
import { describeHours, ptSlots, PT_BOOKING_HORIZON_DAYS } from "@/lib/rules/pt";
import { PtSlotPicker, type PickerCoach } from "@/components/member/PtSlotPicker";

export const metadata = { title: "Book a PT session" };

/** Pick a slot. Slots are computed here from open hours minus taken windows. */
export default async function BookPtPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;
  await requireOnboarded(supabase, uid);
  const now = new Date();

  const packages = await getMemberPackages(supabase, uid);
  const pack = activePtPack(packages, now);
  if (!pack || (pack.credits_remaining ?? 0) === 0) redirect("/app/pt");

  const coaches = await getPtCoaches(supabase);
  const to = new Date(now.getTime() + (PT_BOOKING_HORIZON_DAYS + 1) * 86_400_000).toISOString();
  const venueNames = new Map(coaches.flatMap((c) => c.hours.map((h) => [h.venue_id ?? "", h.venue_name] as const)));

  const picker: PickerCoach[] = await Promise.all(
    coaches.map(async (c) => {
      const taken = await getTakenSlots(supabase, c.id, now.toISOString(), to);
      const slots = ptSlots(c.hours, taken, now);
      return {
        id: c.id,
        name: c.full_name ?? "Coach",
        title: c.staff_title,
        avatarUrl: c.avatar_url,
        hoursLabel: describeHours(c.hours),
        slots: slots.map((s) => ({
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          taken: s.taken,
          venueName: venueNames.get(s.venueId ?? "") ?? null,
          slotMinutes: Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60_000),
        })),
      };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Book a PT session</span>
          <h1 className="text-[32px] leading-none">When suits you?</h1>
        </div>
        <Link href="/app/pt" className="text-sm text-muted underline underline-offset-4">
          Back
        </Link>
      </div>
      <p className="text-sm text-muted">Open hours in the next two weeks. One PT session per booking.</p>
      <PtSlotPicker coaches={picker} sessionsLeft={pack.credits_remaining ?? 0} />
    </div>
  );
}
