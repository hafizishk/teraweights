import Link from "next/link";
import { checkIn } from "@/lib/actions/checkin";

export const metadata = { title: "Check in" };

/** Landing page for the scanned QR: /app/checkin?s=<session>&t=<token>. */
export default async function CheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; t?: string }>;
}) {
  const { s, t } = await searchParams;

  if (!s || !t) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[34px] leading-none">Check in</h1>
        <div className="rule flex flex-col gap-2 pt-4">
          <span className="display text-[22px] leading-none">Scan the session QR</span>
          <p className="text-sm text-muted">Your coach shows it at the start. Point your camera at it, or use the scanner.</p>
          <Link href="/app/checkin/scan" className="display text-lg tracking-wide text-brand">
            Open scanner →
          </Link>
        </div>
      </div>
    );
  }

  const result = await checkIn(s, t);

  return (
    <div className="flex flex-col gap-6">
      {result.ok ? (
        <div className="flex flex-col gap-2 pt-6">
          <span className="eyebrow">Check in</span>
          <h1 className="text-[64px] leading-[0.88]">
            {result.alreadyIn ? "Already" : "You're"}
            <br />
            in
          </h1>
          <p className="border-l-2 border-brand pl-3 text-sm text-paper/85">{result.message}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-6">
          <span className="eyebrow">Check in</span>
          <h1 className="text-[44px] leading-[0.9]">Not checked in</h1>
          <p className="border-l-2 border-brand pl-3 text-sm">{result.error}</p>
          <Link href="/app/checkin/scan" className="display mt-2 text-lg tracking-wide text-brand">
            Scan again →
          </Link>
        </div>
      )}
      <Link href="/app" className="display text-base tracking-wide text-muted">
        Back to Home
      </Link>
    </div>
  );
}
