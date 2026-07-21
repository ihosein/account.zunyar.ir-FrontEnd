import fa from "@/locales/fa.json";

type Dict = typeof fa;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** Convert Latin digits (and optionally full number) to Persian digits. */
export function faNum(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("fa-IR");
  }
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]!);
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

export { fa };
export type Messages = Dict;
