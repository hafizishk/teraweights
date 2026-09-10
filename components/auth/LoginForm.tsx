"use client";

import { useActionState } from "react";
import { sendOtp, verifyOtp, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const inputClass =
  "h-12 w-full rounded-md border border-ink-3 bg-ink-2 px-4 text-base text-paper placeholder:text-muted focus:border-brand focus:outline-none";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    async (prev, formData) => (prev.step === "code" ? verifyOtp(prev, formData) : sendOtp(prev, formData)),
    { step: "email", error: initialError },
  );

  if (state.step === "code") {
    return (
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={state.email} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">
            Sent to <span className="text-paper">{state.email}</span>. Enter the 6-digit code, or
            just tap the sign-in link in the email.
          </span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="123456"
            required
            autoFocus
            className={`${inputClass} display text-center text-3xl tracking-[0.4em]`}
          />
        </label>
        {state.error ? <p role="alert" className="text-sm text-brand">{state.error}</p> : null}
        <Button type="submit" loading={pending}>
          Verify
        </Button>
        <a href="/login" className="text-center text-sm text-muted underline-offset-4 hover:underline">
          Use a different email
        </a>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          autoFocus
          className={inputClass}
        />
      </label>
      {state.error ? <p role="alert" className="text-sm text-brand">{state.error}</p> : null}
      <Button type="submit" loading={pending}>
        Send code
      </Button>
    </form>
  );
}
