import { faNum, t } from "@/lib/i18n";
import clsx from "clsx";

export const inputClass = "zy-input mt-1 w-full text-sm outline-none";

/** Prefer GlassSelect — native select cannot theme the open list. */
export const selectClass =
  "zy-select mt-1 w-full rounded-xl border py-2.5 text-[var(--zy-ink)] outline-none";

export const dialogPrimaryBtnClass =
  "inline-flex cursor-pointer items-center justify-center rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-500/20 transition hover:bg-accent-600 disabled:cursor-not-allowed";

/** True when a required field value is missing/blank. */
export function isBlank(value?: string | number | null): boolean {
  if (value == null) return true;
  return String(value).trim().length === 0;
}

/** Input classes — red border when required and empty. */
export function fieldInputClass(invalid: boolean, extra?: string) {
  return clsx(inputClass, invalid && "zy-input--error", extra);
}

/** Label tone for required empty fields. */
export function fieldLabelClass(invalid: boolean, extra?: string) {
  return clsx(invalid ? "zy-label--error" : "text-[var(--zy-muted)]", extra);
}

export function formatMoney(amount?: number | null, currency = t("common.toman")): string {
  if (amount == null) return `۰ ${currency}`;
  return `${faNum(Number(amount))} ${currency}`;
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "همین لحظه";
  if (diffMin < 60) return `${faNum(diffMin)} دقیقه پیش`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${faNum(diffH)} ساعت پیش`;
  const diffD = Math.round(diffH / 24);
  return `${faNum(diffD)} روز پیش`;
}
