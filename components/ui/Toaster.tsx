"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Toast = { id: number; text: string; tone: "ok" | "error" };
type ToastContext = { show: (text: string, tone?: "ok" | "error") => void };

const Ctx = createContext<ToastContext | null>(null);

export function useToast(): ToastContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <Toaster>");
  return ctx;
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), text, tone }]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="safe-bottom pointer-events-none fixed inset-x-0 bottom-20 z-50 mx-auto flex w-full max-w-[480px] flex-col gap-2 px-4"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDone={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastRow({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto rounded-md px-4 py-3 text-sm shadow-lg ${
        toast.tone === "error" ? "bg-brand text-paper" : "bg-paper text-ink"
      }`}
    >
      {toast.text}
    </div>
  );
}
