"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Detector = { detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/**
 * In-app QR scanner using the BarcodeDetector API (Chrome on Android). Where it
 * isn't available, the phone's own camera app reads the same QR and opens the
 * check-in link directly, so the fallback is a plain instruction.
 */
export function QrScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "unsupported" | "denied">("starting");

  useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    let stream: MediaStream | null = null;
    let raf = 0;
    let done = false;
    const detector = new Ctor({ formats: ["qr_code"] });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setStatus("denied");
        return;
      }
      const el = video.current;
      if (!el) return;
      el.srcObject = stream;
      await el.play();
      setStatus("scanning");

      async function tick() {
        if (done) return;
        try {
          const codes = await detector.detect(el!);
          const hit = codes.map((c) => c.rawValue).find((v) => v.includes("/app/checkin?"));
          if (hit) {
            done = true;
            const url = new URL(hit, window.location.origin);
            router.replace(`/app/checkin?${url.searchParams.toString()}`);
            return;
          }
        } catch {
          // A frame failed to decode; keep going.
        }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      done = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [router]);

  if (status === "unsupported" || status === "denied") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-ink-3 bg-ink-2 p-4">
        <span className="display text-xl leading-tight">
          {status === "denied" ? "Camera access was refused" : "Use your phone's camera"}
        </span>
        <p className="text-sm text-muted">
          Open your camera app and point it at the session QR. It opens the check-in link straight away.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border border-ink-3 bg-ink-2" style={{ aspectRatio: "3 / 4" }}>
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-paper/70" />
      </div>
      <p className="text-center text-sm text-muted">
        {status === "starting" ? "Starting camera…" : "Point at the session QR"}
      </p>
    </div>
  );
}
