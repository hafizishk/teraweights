"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CHECKIN_WINDOW_SECONDS } from "@/lib/rules/checkin-window";

type Payload = { url: string; secondsLeft: number; state: "early" | "open" | "closed" };

/**
 * The roster's check-in QR, shown fullscreen for members to scan.
 *
 * The token changes every 60 seconds, so this refetches the link as each
 * window closes. The session's secret stays on the server; only the current
 * short-lived token ever reaches this browser.
 */
export function SessionQr({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(CHECKIN_WINDOW_SECONDS);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/session-qr?s=${encodeURIComponent(sessionId)}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as Payload & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not load the QR.");
        return;
      }
      setError(null);
      setPayload(body);
      setSecondsLeft(body.secondsLeft);
    } catch {
      setError("Lost the connection. The QR will refresh when it comes back.");
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  // One timer drives both the countdown and the refresh at window's end.
  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          load();
          return CHECKIN_WINDOW_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [load]);

  useEffect(() => {
    if (!payload?.url || !canvas.current) return;
    QRCode.toCanvas(canvas.current, payload.url, {
      width: 460,
      margin: 1,
      color: { dark: "#0b0b0b", light: "#f4f1ec" },
      errorCorrectionLevel: "M",
    }).catch(() => setError("Could not draw the QR."));
  }, [payload?.url]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink/95 p-6 backdrop-blur">
      <div className="flex flex-col items-center gap-2">
        <h2 className="display text-4xl leading-none">Scan to check in</h2>
        <p className="text-sm text-muted">
          {payload?.state === "early"
            ? "Check-in opens 30 minutes before the session."
            : payload?.state === "closed"
              ? "This session has ended."
              : "Open the Teraweights app and tap Check in."}
        </p>
      </div>

      <div className="rounded-2xl bg-paper p-5">
        {error ? (
          <p className="flex h-[460px] w-[460px] items-center justify-center px-8 text-center text-sm text-ink">
            {error}
          </p>
        ) : (
          <canvas ref={canvas} aria-label="Check-in QR code" className="block h-[460px] w-[460px]" />
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-xs uppercase tracking-widest text-muted">Refreshes in {secondsLeft}s</p>
        <button
          type="button"
          onClick={onClose}
          className="display rounded-md border border-ink-3 px-5 py-2 text-lg tracking-wide text-paper hover:border-muted"
        >
          Close
        </button>
      </div>
    </div>
  );
}
