import { Wordmark } from "@/components/ui/Wordmark";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Wordmark />
      <div className="heartbeat w-40" />
      <h1 className="text-3xl">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-muted">
        Reconnect to see your sessions and bookings. Nothing is lost.
      </p>
    </main>
  );
}
