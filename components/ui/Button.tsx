import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-brand text-paper hover:bg-brand-2 disabled:bg-ink-3 disabled:text-muted",
  secondary: "bg-paper text-ink hover:bg-paper-2 disabled:bg-ink-3 disabled:text-muted",
  ghost: "bg-transparent text-paper hover:bg-ink-3 disabled:text-muted",
};

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      className={`display inline-flex h-12 w-full items-center justify-center rounded-md px-5 text-lg tracking-wide transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Working</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
