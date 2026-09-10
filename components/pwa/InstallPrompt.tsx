"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Install-to-home-screen nudge. Android: the browser's own prompt. iOS Safari:
 * a hint, since it has no prompt API. Hidden once installed or dismissed for
 * this visit; no storage is used, so it can reappear next visit.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua)) setIos(true);

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (dismissed || (!deferred && !ios)) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-ink-3 bg-ink-2 px-4 py-3">
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="display text-base leading-tight">Add Teraweights to your phone</span>
        <span className="text-xs text-muted">
          {deferred ? "One tap. Opens like an app, no browser bar." : "Tap Share, then “Add to Home Screen”."}
        </span>
      </span>
      {deferred ? (
        <button
          type="button"
          onClick={async () => {
            await deferred.prompt();
            const { outcome } = await deferred.userChoice;
            if (outcome === "accepted") setDeferred(null);
            setDismissed(true);
          }}
          className="display rounded-md bg-brand px-3 py-2 text-base leading-none tracking-wide text-paper"
        >
          Install
        </button>
      ) : null}
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="text-muted">
        ×
      </button>
    </div>
  );
}
