import Link from "next/link";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/rules/cancellation";

export const metadata = { title: "Support" };

/**
 * Contact details come from the environment so nothing is invented here.
 * Set NEXT_PUBLIC_SUPPORT_EMAIL and NEXT_PUBLIC_SUPPORT_WHATSAPP (digits with
 * country code, e.g. 6591234567) on Vercel once Teraweights confirm them.
 */
const EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

export default function SupportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/account" className="display text-base tracking-wide text-muted">
          ‹ Account
        </Link>
        <h1 className="text-3xl">Support</h1>
      </div>

      <section className="flex flex-col">
        <div className="rule flex flex-col gap-1 py-3">
          <span className="display text-[20px] leading-none">Talk to a coach</span>
          <span className="text-sm text-muted">The quickest answer is at your next session. Every coach can see your bookings and packages.</span>
        </div>
        {WHATSAPP ? (
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="rule flex items-center justify-between py-3">
            <span className="flex flex-col">
              <span className="display text-[20px] leading-none">WhatsApp</span>
              <span className="text-sm text-muted">Message the studio</span>
            </span>
            <span className="text-muted">›</span>
          </a>
        ) : null}
        {EMAIL ? (
          <a href={`mailto:${EMAIL}`} className="rule flex items-center justify-between py-3">
            <span className="flex flex-col">
              <span className="display text-[20px] leading-none">Email</span>
              <span className="text-sm text-muted">{EMAIL}</span>
            </span>
            <span className="text-muted">›</span>
          </a>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl">Common questions</h2>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="rule flex flex-col gap-1 pt-3">
            <dt className="text-paper">I can&apos;t make a session I booked.</dt>
            <dd className="text-muted">
              Cancel it from Book. {CANCELLATION_CUTOFF_HOURS} hours or more before the start, any credit comes back. Inside that window it does not.
            </dd>
          </div>
          <div className="rule flex flex-col gap-1 pt-3">
            <dt className="text-paper">The session is full.</dt>
            <dd className="text-muted">Join the waitlist. If a spot opens you are moved in automatically and the session shows as booked on You.</dd>
          </div>
          <div className="rule flex flex-col gap-1 pt-3">
            <dt className="text-paper">I didn&apos;t get my sign-in code.</dt>
            <dd className="text-muted">Check spam for an email from Teraweights, then ask for a new code. Codes work once and expire after an hour.</dd>
          </div>
          <div className="rule flex flex-col gap-1 pt-3">
            <dt className="text-paper">I want to pause or change my membership.</dt>
            <dd className="text-muted">Tell a coach. Changes to packages are made by the studio, and show up on You straight away.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
