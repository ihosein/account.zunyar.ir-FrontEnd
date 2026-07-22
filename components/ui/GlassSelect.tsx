"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { t } from "@/lib/i18n";

export type GlassSelectOption = {
  value: string;
  label: string;
  /** Secondary line under the label (e.g. IBAN), shown muted. */
  description?: string;
  /** Optional leading image (e.g. university logo). */
  imageUrl?: string;
  /** Non-selectable section header inside the menu. */
  separator?: boolean;
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
      width: Math.max(r.width, 200),
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
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
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

type GlassSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  invalid?: boolean;
};

/** Themed single select — use everywhere instead of a native `<select>`. */
export function GlassSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  searchable,
  invalid,
}: GlassSelectProps) {
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pos = useMenuPlace(open, triggerRef);
  useDismiss(open, setOpen, triggerRef, menuRef);
  const selected = options.find((o) => !o.separator && o.value === value);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = (() => {
    const q = query.trim();
    if (!searchable || !q) return options;
    const matched = options.filter(
      (o) => !o.separator && (o.label.includes(q) || o.value.includes(q)),
    );
    return matched;
  })();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "zy-glass-select",
          open && "zy-glass-select--open",
          invalid && "zy-glass-select--error",
          className,
        )}
      >
        <span
          className={clsx(
            "flex min-w-0 flex-1 items-center gap-2 text-start",
            !selected && "text-[var(--zy-muted)]",
          )}
        >
          {selected?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.imageUrl}
              alt=""
              className="zy-glass-select__logo"
            />
          ) : null}
          {selected ? (
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate">{selected.label}</span>
              {selected.description ? (
                <span className="truncate text-xs font-normal text-[var(--zy-muted)]" dir="ltr">
                  {selected.description}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="truncate">{placeholder ?? "—"}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={clsx(
            "shrink-0 text-accent-600 transition-transform dark:text-accent-400",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
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
            {filtered.map((opt) => {
              if (opt.separator) {
                return (
                  <div key={`sep-${opt.value}-${opt.label}`} className="zy-glass-select__separator">
                    {opt.label}
                  </div>
                );
              }
              const active = opt.value === value;
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
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  {opt.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={opt.imageUrl}
                      alt=""
                      className="zy-glass-select__logo"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block truncate">{opt.label}</span>
                    {opt.description ? (
                      <span className="mt-0.5 block truncate text-xs font-normal text-[var(--zy-muted)]" dir="ltr">
                        {opt.description}
                      </span>
                    ) : null}
                  </span>
                  {active && <Check size={16} className="zy-glass-select__check" />}
                </button>
              );
            })}
            {filtered.filter((o) => !o.separator).length === 0 && (
              <p className="px-3 py-2 text-sm text-[var(--zy-muted)]">موردی یافت نشد</p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
