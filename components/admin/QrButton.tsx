"use client";

import { useState } from "react";
import { SessionQr } from "@/components/admin/SessionQr";

/** Opens the fullscreen rotating check-in QR for a session. */
export function QrButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="display inline-flex h-10 items-center rounded-md bg-brand px-5 text-lg tracking-wide text-paper transition-colors hover:bg-brand-2"
      >
        Show check-in QR
      </button>
      {open ? <SessionQr sessionId={sessionId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
