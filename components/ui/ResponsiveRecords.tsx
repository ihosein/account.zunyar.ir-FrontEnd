"use client";

import type { ReactNode } from "react";

export type DetailField = {
  label: string;
  value: ReactNode;
  /** LTR values like IP / dates */
  dir?: "ltr" | "rtl";
};

type ResponsiveRecordsProps = {
  /** Desktop table header cells */
  columns: ReactNode[];
  rows: {
    key: string | number;
    /** Desktop table cells (same order as columns) */
    cells: ReactNode[];
    /** Mobile stacked detail fields */
    details: DetailField[];
    /** Optional actions row under mobile details */
    actions?: ReactNode;
  }[];
  className?: string;
  /**
   * Fit the table to the container without horizontal scroll.
   * Uses fixed layout + wrapping cells instead of overflow-x-auto.
   */
  fitWidth?: boolean;
  /** Optional per-column classes applied to both th and td */
  columnClassNames?: string[];
};

/**
 * Default list UI for the panel: desktop table + mobile stacked detail cards.
 * Use this for every records/table page — do not invent a separate mobile layout.
 */
export function ResponsiveRecords({
  columns,
  rows,
  className,
  fitWidth = false,
  columnClassNames,
}: ResponsiveRecordsProps) {
  return (
    <div className={className}>
      <div className={fitWidth ? "hidden md:block" : "hidden overflow-x-auto md:block"}>
        <table
          className={
            fitWidth
              ? "w-full table-fixed text-start text-sm"
              : "w-full text-start text-sm"
          }
        >
          <thead>
            <tr className="border-b border-[var(--zy-border)] text-xs text-[var(--zy-muted)]">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={
                    fitWidth
                      ? `px-3 py-3 text-start font-medium leading-snug ${columnClassNames?.[i] ?? ""}`
                      : "whitespace-nowrap px-4 py-3 text-start font-medium"
                  }
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-[var(--zy-border)] last:border-0">
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={
                      fitWidth
                        ? `break-words px-3 py-3 align-middle text-[var(--zy-ink)] ${columnClassNames?.[i] ?? ""}`
                        : "px-4 py-3 align-middle text-[var(--zy-ink)]"
                    }
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.key}
            className="rounded-2xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/50 p-3.5"
          >
            <dl className="space-y-2.5">
              {row.details.map((field) => (
                <div
                  key={field.label}
                  className="flex items-start justify-between gap-3 border-b border-[var(--zy-border)]/70 pb-2.5 last:border-0 last:pb-0"
                >
                  <dt className="shrink-0 text-xs font-medium text-[var(--zy-muted)]">
                    {field.label}
                  </dt>
                  <dd
                    className="min-w-0 break-words text-end text-sm font-semibold text-[var(--zy-ink)]"
                    dir={field.dir}
                  >
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
            {row.actions ? <div className="mt-3 flex justify-end">{row.actions}</div> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
