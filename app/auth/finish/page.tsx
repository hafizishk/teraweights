import { Wordmark } from "@/components/ui/Wordmark";
import { FinishSignIn } from "@/components/auth/FinishSignIn";

export const metadata = { title: "Signing you in" };

/**
 * Fallback for sign-in results that arrive in the URL fragment rather than the
 * query string. A fragment never reaches the server, so /auth/callback cannot
 * read it and forwards here, where the browser can.
 */
export default function AuthFinishPage() {
  return (
    <main className="safe-top mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center gap-6 px-6">
      <Wordmark className="text-3xl" />
      <div className="heartbeat w-32" />
      <FinishSignIn />
    </main>
  );
}
