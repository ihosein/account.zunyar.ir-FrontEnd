"use client";

import clsx from "clsx";
import { t } from "@/lib/i18n";

export type TransferMode = "deposit" | "withdraw";

type TransferModeSwitchProps = {
  value: TransferMode;
  onChange: (value: TransferMode) => void;
  className?: string;
};

/** Segmented deposit (green) / withdraw (red) control. */
export function TransferModeSwitch({ value, onChange, className }: TransferModeSwitchProps) {
  return (
    <div
      role="tablist"
      aria-label={t("panel.transferMode")}
      className={clsx(
        "relative grid grid-cols-2 rounded-2xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/70 p-1",
        className,
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "deposit"}
        onClick={() => onChange("deposit")}
        className={clsx(
          "cursor-pointer rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200",
          value === "deposit"
            ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
            : "text-[var(--zy-muted)] hover:text-emerald-600 dark:hover:text-emerald-400",
        )}
      >
        {t("panel.typeCredit")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "withdraw"}
        onClick={() => onChange("withdraw")}
        className={clsx(
          "cursor-pointer rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200",
          value === "withdraw"
            ? "bg-red-500 text-white shadow-md shadow-red-500/30"
            : "text-[var(--zy-muted)] hover:text-red-500",
        )}
      >
        {t("panel.typeDebit")}
      </button>
    </div>
  );
}
