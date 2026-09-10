"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";

export default function MemberError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 border-brand/40">
        <CardTitle>Something went wrong</CardTitle>
        <p className="text-sm text-muted">Usually a dropped connection. Your bookings are safe.</p>
        <Button onClick={reset} variant="secondary">
          Try again
        </Button>
      </Card>
    </div>
  );
}
