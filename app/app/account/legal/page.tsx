import Link from "next/link";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/rules/cancellation";
import { TRIAL_DAYS } from "@/lib/rules/trial";

export const metadata = { title: "Legal" };

/**
 * House rules and a plain-language privacy note, written from what the app
 * actually does. Marked as a draft until Teraweights confirm the wording;
 * nothing here invents a policy the app does not enforce.
 */
export default function LegalPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/account" className="display text-base tracking-wide text-muted">
          ‹ Account
        </Link>
        <h1 className="text-3xl">Legal</h1>
        <p className="eyebrow text-prime">Draft, to be confirmed by Teraweights</p>
      </div>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-xl">House rules</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted">
          <li>A booking holds your spot. Cancel {CANCELLATION_CUTOFF_HOURS} hours or more before the start and any credit used is returned. Inside that window the credit is kept.</li>
          <li>Memberships cover every session in their days. Credit packs spend one credit per session and expire on the date shown on You.</li>
          <li>The free week is {TRIAL_DAYS} days of Energise East and West, once per Energiser, and does not renew or charge anything.</li>
          <li>Personal training sessions come from a PT pack and are cancelled under the same {CANCELLATION_CUTOFF_HOURS}-hour rule.</li>
          <li>Sessions are outdoors. Coaches may move or cancel a session for weather or safety, and will post the change on the Feed.</li>
          <li>Check in with the QR code at the session so your attendance and streak are recorded.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-xl">Your data</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted">
          <li>We store your name, email, phone, photo if you add one, your zone and time preferences, and your bookings, packages, event registrations and PA.ROX results.</li>
          <li>It lives in a Supabase database and is used to run bookings, credits, results and the community feed. It is not sold or shared with advertisers.</li>
          <li>Coaches and studio admins can see your details, bookings and packages so they can run sessions and help you.</li>
          <li>Other members see your name and photo on a session only if you turn on &quot;Show me on session rosters&quot; under Your details. Results from a PA.ROX or Kampung Grind appear on that event&apos;s scoreboard.</li>
          <li>If you connect Apple Health or Health Connect, we store heart rate and calories from sessions you checked in to, and your own workouts. Only you can see them. Coaches and other members cannot, and you can disconnect at any time in your phone&apos;s settings.</li>
          <li>Sign-in is by a one-time email code. We keep no password.</li>
          <li>To correct your details, use Your details. To delete your account and data, ask a coach or use Support.</li>
        </ul>
      </section>
    </div>
  );
}
