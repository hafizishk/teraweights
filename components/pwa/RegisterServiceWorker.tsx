"use client";

import { useEffect } from "react";

/** Registers /sw.js in production. Dev builds skip it so HMR isn't cached. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Non-fatal: the app works without offline support.
    });
  }, []);
  return null;
}
