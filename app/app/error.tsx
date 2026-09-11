"use client";

import { Button } from "@/components/ui/Button";

export default function MemberError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col gap-4 pt-6">
      <div className="flex flex-col gap-2 border-l-2 border-brand pl-3">
        <h1 className="text-[34px] leading-none">Something went wrong</h1>
        <p className="text-sm text-muted">Usually a dropped connection. Your bookings are safe.</p>
      </div>
      <Button onClick={reset} variant="secondary">
        Try again
      </Button>
    </div>
  );
}
