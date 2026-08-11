"use client";

import clsx from "clsx";
import { AlertTriangle, Bell, Info, ShieldAlert, X } from "lucide-react";
import { levelTone } from "@/lib/broadcast-inbox";
import { t } from "@/lib/i18n";
import type { InboxMessage } from "@/types/account";

function LevelIcon({ level }: { level?: string }) {
  const tone = levelTone(level);
  if (tone === "danger") return <ShieldAlert size={18} />;
  if (tone === "warning") return <AlertTriangle size={18} />;
  if (tone === "notice") return <Bell size={18} />;
  return <Info size={18} />;
}

export function levelLabel(level?: string) {
  const key = `admin.messageLevel${(level || "INFO").toUpperCase()}`;
  const translated = t(key);
  return translated === key ? level || "INFO" : translated;
}

export function levelCardClass(level?: string) {
  const tone = levelTone(level);
  return clsx(
    tone === "danger" &&
      "border-red-500/40 bg-red-500/10 text-red-900 dark:border-red-400/35 dark:bg-red-500/15 dark:text-red-100",
    tone === "warning" &&
      "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-100",
    tone === "notice" &&
      "border-sky-500/40 bg-sky-500/10 text-sky-950 dark:border-sky-400/35 dark:bg-sky-500/15 dark:text-sky-100",
    tone === "info" &&
      "border-accent-500/35 bg-accent-500/10 text-[var(--zy-ink)] dark:border-accent-400/30 dark:bg-accent-500/15",
  );
}

export function levelBadgeClass(level?: string) {
  const tone = levelTone(level);
  return clsx(
    "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-semibold",
    tone === "danger" && "bg-red-500/20 text-red-800 dark:text-red-200",
    tone === "warning" && "bg-amber-500/20 text-amber-900 dark:text-amber-100",
    tone === "notice" && "bg-sky-500/20 text-sky-900 dark:text-sky-100",
    tone === "info" && "bg-accent-500/20 text-accent-900 dark:text-accent-100",
  );
}

type Props = {
  message: InboxMessage;
  onDismiss?: (id: number) => void;
  compact?: boolean;
};

/** کارت اعلان درون‌برنامه‌ای با رنگ متناسب سطح پیام. */
export function InboxMessageCard({ message, onDismiss, compact }: Props) {
  return (
    <div
      role="status"
      className={clsx(
        "rounded-2xl border px-3.5 py-3 shadow-sm",
        levelCardClass(message.level),
        compact && "px-3 py-2.5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={levelBadgeClass(message.level)}>
              <LevelIcon level={message.level} />
              {levelLabel(message.level)}
            </span>
            <h3 className="text-sm font-bold leading-snug">{message.title}</h3>
          </div>
          <p
            className={clsx(
              "whitespace-pre-wrap text-sm leading-relaxed opacity-90",
              compact && "line-clamp-4",
            )}
          >
            {message.body}
          </p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={() => onDismiss(message.id)}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-semibold opacity-80 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            aria-label={t("panel.messageSeen")}
            title={t("panel.messageSeen")}
          >
            <X size={14} />
            <span className="hidden sm:inline">{t("panel.messageSeen")}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
