import Link from "next/link";
import { getMyProfile } from "@/lib/queries/profile";
import { assertOnboarded } from "@/lib/onboarding";
import { DEFAULT_MAX_HR } from "@/lib/rules/zones";

export const metadata = { title: "Connected health" };

const SOURCE_LABEL = { apple_health: "Apple Health", health_connect: "Health Connect" } as const;

/**
 * What connecting the phone's health store means, and its state. The
 * connect button itself only works inside the native app, where the plugin
 * can ask the phone; the web build says so instead of pretending.
 */
export default async function HealthPage() {
  const profile = await getMyProfile();
  assertOnboarded(profile);
  const source = profile?.health_source ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/app/account" className="display text-base tracking-wide text-muted">
          ‹ Account
        </Link>
        <h1 className="text-3xl">Connected health</h1>
        <p className="text-sm text-muted">
          {source
            ? `${SOURCE_LABEL[source]} is connected${profile?.health_device ? ` through your ${profile.health_device}` : ""}. Read only.`
            : "Not connected."}
        </p>
      </div>

      <section className="flex flex-col gap-3 text-sm">
        <h2 className="text-xl">What we read</h2>
        <ul className="flex flex-col gap-2">
          <Item title="Heart rate" body="During sessions you've checked in to. Nothing outside them." />
          <Item title="Active energy" body="For the same window, so a session shows its calories." />
          <Item title="Workouts" body="Your own runs and rides, so the week counts them. They never count toward your streak." />
        </ul>
        <p className="text-muted">
          Works with Apple Watch, Whoop, Amazfit, Garmin and anything else that writes to Apple Health or Health Connect. Coaches and other
          Energisers never see any of it.
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="text-xl">Zones</h2>
        <p className="text-muted">
          Five bands from your max heart rate: easy below 60%, then 60, 70, 80 and 90% upward. Your max is {profile?.max_hr ?? DEFAULT_MAX_HR}
          {profile?.max_hr ? "" : ", the default until you set your own under Your details"}.
        </p>
      </section>

      <div className="rule flex flex-col gap-2 pt-4">
        <span className="display inline-flex h-12 w-full items-center justify-center rounded-md bg-ink-3 px-5 text-lg tracking-wide text-muted">
          {source ? "Connected" : "Open the Teraweights app to connect"}
        </span>
        <p className="text-center text-xs text-muted">
          {source ? "Turn it off in your phone's Health settings at any time." : "Connecting happens in the app on your phone, not in the browser."}
        </p>
      </div>
    </div>
  );
}

function Item({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-2">
      <span className="text-brand">✓</span>
      <span>
        <span className="text-brand">{title}</span> {body}
      </span>
    </li>
  );
}
