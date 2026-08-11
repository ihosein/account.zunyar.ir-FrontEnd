"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import clsx from "clsx";
import { t } from "@/lib/i18n";

export type GlassMultiSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type Place = { top: number; left: number; width: number; maxH: number };

function useMenuPlace(open: boolean, triggerRef: RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<Place | null>(null);

  const place = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const gap = 6;
    const spaceBelow = window.innerHeight - r.bottom - gap - 8;
    const spaceAbove = r.top - gap - 8;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxH = Math.min(280, preferBelow ? spaceBelow : spaceAbove);
    const top = preferBelow ? r.bottom + gap : Math.max(8, r.top - gap - maxH);
    setPos({
      top,
      left: r.left,
      width: Math.max(r.width, 220),
      maxH: Math.max(140, maxH),
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => place();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, place]);

  return pos;
}

function useDismiss(
  open: boolean,
  setOpen: (v: boolean) => void,
  triggerRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (triggerRef.current?.contains(node) || menuRef.current?.contains(node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen, triggerRef, menuRef]);
}

type GlassMultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  options: GlassMultiSelectOption[];
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  invalid?: boolean;
  /** Empty selection hint under the control. */
  emptyHint?: string;
  /** Show “select all / clear” row at the top of the menu. */
  showSelectAll?: boolean;
};

/** Themed multi-select (glass), same look as GlassSelect / DateSelect. */
export function GlassMultiSelect({
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
  disabled,
  searchable = true,
  invalid,
  emptyHint,
  showSelectAll = false,
}: GlassMultiSelectProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pos = useMenuPlace(open, triggerRef);
  useDismiss(open, setOpen, triggerRef, menuRef);

  const selectedSet = new Set(value);
  const selectedOptions = options.filter((o) => selectedSet.has(o.value));

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = (() => {
    const q = query.trim();
    if (!searchable || !q) return options;
    return options.filter(
      (o) =>
        o.label.includes(q) ||
        o.value.includes(q) ||
        (o.description ? o.description.includes(q) : false),
    );
  })();

  function toggle(v: string) {
    if (selectedSet.has(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }

  function removeChip(v: string, e: MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((x) => x !== v));
  }

  const filteredValues = filtered.map((o) => o.value);
  const allFilteredSelected =
    filteredValues.length > 0 && filteredValues.every((v) => selectedSet.has(v));

  function toggleSelectAll() {
    if (filteredValues.length === 0) return;
    if (allFilteredSelected) {
      const drop = new Set(filteredValues);
      onChange(value.filter((v) => !drop.has(v)));
      return;
    }
    const next = new Set(value);
    filteredValues.forEach((v) => next.add(v));
    onChange([...next]);
  }

  return (
    <div className={clsx("w-full text-sm", className)}>
      {label ? (
        <span className={clsx(invalid ? "zy-label--error" : "text-[var(--zy-muted)]")}>
          {label}
        </span>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "zy-glass-select mt-1 !h-auto min-h-11 items-start py-2",
          open && "zy-glass-select--open",
          invalid && "zy-glass-select--error",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-start">
          {selectedOptions.length === 0 ? (
            <span className="text-[var(--zy-muted)]">
              {placeholder ?? t("common.selectPlaceholder")}
            </span>
          ) : (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex max-w-full items-center gap-1 rounded-lg border border-accent-500/25 bg-accent-500/10 px-2 py-0.5 text-xs font-semibold text-accent-700 dark:text-accent-300"
              >
                <span className="truncate">{opt.label}</span>
                <span
                  role="button"
                  tabIndex={-1}
                  className="shrink-0 rounded p-0.5 hover:bg-accent-500/20"
                  onClick={(e) => removeChip(opt.value, e)}
                  onKeyDown={() => undefined}
                  aria-label={t("common.delete")}
                >
                  <X size={12} />
                </span>
              </span>
            ))
          )}
        </span>
        <ChevronDown
          size={16}
          className={clsx(
            "mt-0.5 shrink-0 text-accent-600 transition-transform dark:text-accent-400",
            open && "rotate-180",
          )}
        />
      </button>

      {emptyHint && selectedOptions.length === 0 ? (
        <p className="mt-1 text-[11px] text-[var(--zy-muted)]">{emptyHint}</p>
      ) : null}

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxH,
            }}
            className="zy-glass-select__menu"
          >
            {searchable && (
              <div className="zy-glass-select__search-wrap">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className="zy-glass-select__search"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            )}
            {showSelectAll && filteredValues.length > 0 ? (
              <button
                type="button"
                role="option"
                aria-selected={allFilteredSelected}
                className={clsx(
                  "zy-glass-select__option border-b border-[var(--zy-border)] font-semibold",
                  allFilteredSelected && "zy-glass-select__option--active",
                )}
                onClick={toggleSelectAll}
              >
                <span className="min-w-0 flex-1 text-start">
                  {allFilteredSelected ? t("common.deselectAll") : t("common.selectAll")}
                </span>
                {allFilteredSelected && <Check size={16} className="zy-glass-select__check" />}
              </button>
            ) : null}
            {filtered.map((opt) => {
              const active = selectedSet.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={clsx(
                    "zy-glass-select__option",
                    active && "zy-glass-select__option--active",
                  )}
                  onClick={() => toggle(opt.value)}
                >
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block truncate">{opt.label}</span>
                    {opt.description ? (
                      <span
                        className="mt-0.5 block truncate text-xs font-normal text-[var(--zy-muted)]"
                        dir="ltr"
                      >
                        {opt.description}
                      </span>
                    ) : null}
                  </span>
                  {active && <Check size={16} className="zy-glass-select__check" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-[var(--zy-muted)]">{t("common.noResults")}</p>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
