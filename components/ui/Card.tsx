import type { HTMLAttributes } from "react";

/**
 * A section of content. By default it is ruled, not boxed: a hairline above,
 * content flush with the page edge, the black showing through. `raised` is
 * for the few things that are genuinely objects on top of the page, such as
 * a bottom sheet or an alert.
 */
export function Card({
  className = "",
  raised = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return (
    <div
      className={raised ? `rounded-md bg-ink-2 p-4 ${className}` : `rule pt-4 ${className}`}
      {...props}
    />
  );
}

export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-xl leading-tight ${className}`} {...props} />;
}
