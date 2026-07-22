"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Headphones, Phone, Ticket } from "lucide-react";
import clsx from "clsx";
import { t } from "@/lib/i18n";

const SUPPORT_PHONE = "02191000000";

type SupportMenuProps = {
  className?: string;
};

/** Icon-only support control that expands on hover and opens a menu above. */
export function SupportMenu({ className }: SupportMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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
  }, [open]);

  const items = [
    {
      key: "ticket",
      label: t("support.ticket"),
      icon: Ticket,
      onClick: () => {
        setOpen(false);
        router.push("/panel/support");
      },
    },
    {
      key: "phone",
      label: t("support.phone"),
      icon: Phone,
      onClick: () => {
        setOpen(false);
        window.location.href = `tel:${SUPPORT_PHONE}`;
      },
      extra: SUPPORT_PHONE,
    },
    {
      key: "docs",
      label: t("support.docs"),
      icon: BookOpen,
      onClick: () => {
        setOpen(false);
        router.push("/panel/tutorials");
      },
    },
  ] as const;

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full start-0 z-50 mb-2 min-w-[11.5rem] overflow-hidden rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface-solid)] p-1.5 shadow-xl shadow-black/10 backdrop-blur-md dark:bg-[rgba(22,26,34,0.96)]"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                onClick={item.onClick}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-start text-sm font-medium text-[var(--zy-ink)] transition hover:bg-accent-500/10"
              >
                <Icon size={16} className="shrink-0 text-accent-600 dark:text-accent-400" />
                <span className="min-w-0 flex-1">
                  <span className="block">{item.label}</span>
                  {"extra" in item && item.extra ? (
                    <span className="mt-0.5 block text-[11px] font-normal text-[var(--zy-muted)]" dir="ltr">
                      {item.extra}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        title={t("support.title")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "group inline-flex max-w-full items-center overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
          open
            ? "bg-accent-500/15 text-accent-700 dark:text-accent-300"
            : "text-[var(--zy-ink)]/85 hover:bg-accent-500/10",
        )}
      >
        <Headphones size={18} className="shrink-0 text-accent-600 dark:text-accent-400" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ms-2.5 group-hover:max-w-[7rem] group-hover:opacity-100">
          {t("support.title")}
        </span>
      </button>
    </div>
  );
}
