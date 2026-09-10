import { Wordmark } from "@/components/ui/Wordmark";
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
        <Wordmark className="text-4xl" />
        <div className="heartbeat w-40" />
        <p className="text-sm text-muted">Sign in with your email. We&apos;ll send a 6-digit code.</p>
      </div>
      <LoginForm next={next} initialError={error} />
    </main>
  );
}
