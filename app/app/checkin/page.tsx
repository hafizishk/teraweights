import Link from "next/link";
import { checkIn } from "@/lib/actions/checkin";
import { Card, CardTitle } from "@/components/ui/Card";

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
        <h1 className="text-3xl">Check in</h1>
        <Card className="flex flex-col gap-2">
          <CardTitle>Scan the session QR</CardTitle>
          <p className="text-sm text-muted">Your coach shows it at the start. Point your camera at it, or use the scanner.</p>
          <Link href="/app/checkin/scan" className="display text-lg text-brand">
            Open scanner →
          </Link>
        </Card>
      </div>
    );
  }

  const result = await checkIn(s, t);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">Check in</h1>
      {result.ok ? (
        <Card className="flex flex-col gap-2 border-paper/30">
          <span className="display text-[56px] leading-none">✓</span>
          <CardTitle>{result.alreadyIn ? "Already in" : "You're in"}</CardTitle>
          <p className="text-sm text-muted">{result.message}</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-2 border-brand/40">
          <CardTitle>Not checked in</CardTitle>
          <p className="text-sm">{result.error}</p>
          <Link href="/app/checkin/scan" className="display text-lg text-brand">
            Scan again →
          </Link>
        </Card>
      )}
      <Link href="/app" className="text-sm text-muted underline underline-offset-4">
        Back to Home
      </Link>
    </div>
  );
}
