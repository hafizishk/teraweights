import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/** Form primitives for the admin portal. Dark surfaces, generous hit areas. */

export const controlClass =
  "h-10 w-full rounded-md border border-ink-3 bg-ink px-3 text-sm text-paper placeholder:text-muted focus:border-brand focus:outline-none";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-widest text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-24 w-full rounded-md border border-ink-3 bg-ink px-3 py-2 text-sm text-paper placeholder:text-muted focus:border-brand focus:outline-none ${className}`}
      {...props}
    />
  );
}
