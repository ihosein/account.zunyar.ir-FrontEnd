import fa from "@/locales/fa.json";
import { createElement, type ReactNode } from "react";

type Dict = typeof fa;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const SPLIT_MARK = "\uE000";

/** Convert Latin digits (and optionally full number) to Persian digits. */
export function faNum(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("fa-IR");
  }
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]!);
}

/**
 * ایزولهٔ چپ‌به‌راست برای شماره‌ها داخل متن RTL تا برعکس دیده نشوند.
 */
export function ltrIsolate(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return `\u2066${value}\u2069`;
}

export function t(path: string, vars?: Record<string, string | number>): string {
  const parts = path.split(".");
  let cur: unknown = fa;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  if (typeof cur !== "string") return path;
  let out = cur;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      const rendered = typeof v === "number" ? faNum(v) : faNum(String(v));
      out = out.replaceAll(`{${k}}`, rendered);
    }
  }
  return out;
}

/**
 * متن ترجمه‌شده با یک توکن LTR (مثل شماره موبایل) که در RTL برعکس نشود.
 */
export function tWithLtr(
  path: string,
  token: string,
  ltrValue: string,
  otherVars?: Record<string, string | number>
): ReactNode {
  const text = t(path, { ...(otherVars || {}), [token]: SPLIT_MARK });
  const [before, after = ""] = text.split(SPLIT_MARK);
  return createElement(
    "span",
    null,
    before,
    createElement(
      "span",
      {
        dir: "ltr",
        className: "mx-0.5 inline-block",
        style: { unicodeBidi: "isolate" },
      },
      ltrValue
    ),
    after
  );
}

export { fa };
export type Messages = Dict;
