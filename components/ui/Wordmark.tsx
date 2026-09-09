/** Placeholder wordmark until the client sends logo assets (brief section 10). */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display select-none text-2xl leading-none tracking-wide text-paper ${className}`}>
      TERA<span className="text-brand">WEIGHTS</span>
    </span>
  );
}
