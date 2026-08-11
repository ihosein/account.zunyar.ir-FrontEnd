"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { faNum, t } from "@/lib/i18n";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type TablePaginationProps = {
  /** ۱‌پایه مثل زانیار */
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  disabled?: boolean;
  /** محتوای اختیاری کنار متن بازه (مثلاً حجم فایل لاگ) */
  aside?: ReactNode;
};

/**
 * فوتر صفحه‌بندی جدول — الگوی زانیار: تعداد در صفحه + نمایش بازه + دکمه‌های صفحه در پایین.
 */
export function TablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  aside,
}: TablePaginationProps) {
  const safeCount = Math.max(pageCount, 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageList(page, safeCount);
  const sizeOptions = PAGE_SIZE_OPTIONS.includes(
    pageSize as (typeof PAGE_SIZE_OPTIONS)[number]
  )
    ? PAGE_SIZE_OPTIONS
    : ([...PAGE_SIZE_OPTIONS, pageSize] as number[]).sort((a, b) => a - b);

  return (
    <div className="zy-table-pagination flex flex-col gap-2 border-t border-[var(--zy-border)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-[var(--zy-muted)]">
          {t("admin.showing", { from, to, total })}
        </p>
        {aside ? (
          <span className="text-xs text-[var(--zy-muted)]">{aside}</span>
        ) : null}
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5 text-xs text-[var(--zy-muted)]">
            <span className="whitespace-nowrap">{t("admin.rowsPerPage")}</span>
            <GlassSelect
              className="zy-table-pagination__page-size !min-h-0 w-auto min-w-[3.25rem] max-w-[4.5rem] !px-2 !py-1.5 !text-xs"
              value={String(pageSize)}
              options={sizeOptions.map((size) => ({
                value: String(size),
                label: faNum(size),
              }))}
              onChange={(v) => onPageSizeChange(Number(v))}
              disabled={disabled}
            />
          </label>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className="zy-table-pagination__btn"
          disabled={disabled || page <= 1}
          aria-label={t("admin.prevPage")}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight size={14} />
        </button>
        <div className="flex items-center gap-0.5">
          {pages.map((p, idx) =>
            p === "…" ? (
              <span key={`e-${idx}`} className="px-0.5 text-xs text-[var(--zy-muted)]">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? "page" : undefined}
                className={clsx(
                  "zy-table-pagination__btn",
                  p === page && "zy-table-pagination__btn--active"
                )}
                disabled={disabled}
                onClick={() => onPageChange(p)}
              >
                {faNum(p)}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          className="zy-table-pagination__btn"
          disabled={disabled || page >= safeCount}
          aria-label={t("admin.nextPage")}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronLeft size={14} />
        </button>
      </div>
    </div>
  );
}

function buildPageList(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const set = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  if (page <= 3) {
    set.add(2);
    set.add(3);
    set.add(4);
  }
  if (page >= pageCount - 2) {
    set.add(pageCount - 1);
    set.add(pageCount - 2);
    set.add(pageCount - 3);
  }

  const sorted = [...set].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) out.push("…");
    out.push(sorted[i]!);
  }
  return out;
}
