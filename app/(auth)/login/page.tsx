import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { devLoginEnabled } from "@/lib/dev-login";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Wordmark className="text-[44px]" />
        <div className="heartbeat w-40" />
        <p className="text-sm text-muted">Sign in with your email. We&apos;ll send you a code.</p>
      </div>
      <LoginForm next={next} initialError={error} />
      {devLoginEnabled() ? (
        <Link href="/dev/login" className="text-center text-xs text-muted underline underline-offset-4">
          Dev: sign in as a seeded account
        </Link>
      ) : null}
    </main>
  );
}
