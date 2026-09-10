import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { Toaster } from "@/components/ui/Toaster";

/** Public event pages: no sign-in needed, so no member chrome. */
export default function PublicEventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-ink">
      <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-ink-3 bg-ink/95 px-4 py-3 backdrop-blur">
        <Wordmark className="text-xl" />
        <Link href="/login" className="text-xs text-muted underline-offset-4 hover:underline">
          Sign in
        </Link>
      </header>
      <Toaster>
        <main className="safe-bottom flex-1 px-4 pb-10 pt-4">{children}</main>
      </Toaster>
    </div>
  );
}
