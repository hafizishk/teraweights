import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

/** Desktop-first table primitives for the admin portal. */

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ink-3">
      <table className={`w-full border-collapse text-sm ${className}`} {...props} />
    </div>
  );
}

export function Th({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`border-b border-ink-3 bg-ink-2 px-3 py-2 text-left text-xs font-medium uppercase tracking-widest text-muted ${className}`}
      {...props}
    />
  );
}

export function Td({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`border-b border-ink-3 px-3 py-2 align-middle ${className}`} {...props} />;
}

export function Tr({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`hover:bg-ink-2/60 ${className}`} {...props} />;
}

/** Shown in place of rows when a table has nothing in it. */
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}
