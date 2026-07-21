"use client";

import { GlassDialog } from "@/components/ui/GlassDialog";
import { t } from "@/lib/i18n";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  danger,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <GlassDialog open={open} onClose={onClose} title={title}>
      <p className="text-sm text-[var(--zy-muted)]">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-xl border border-[var(--zy-border)] px-4 py-2 text-sm text-[var(--zy-ink)]"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={
            danger
              ? "cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              : "cursor-pointer rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {confirmLabel || t("common.delete")}
        </button>
      </div>
    </GlassDialog>
  );
}
