/** Product apps currently live in the account portal UI. */
export const PRODUCT_APP_CODES = ["ZUNYAR", "ZUNKO"] as const;

export type ProductAppCode = (typeof PRODUCT_APP_CODES)[number];

export function isProductAppCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = code.toUpperCase();
  return (PRODUCT_APP_CODES as readonly string[]).includes(normalized);
}

export function isZunkoApp(code?: string | null): boolean {
  return String(code || "").toUpperCase() === "ZUNKO";
}

/** Chip styles for app badges; Zunko uses orange so it stays distinct. */
export function appChipClass(code?: string | null): string {
  if (isZunkoApp(code)) {
    return "!whitespace-nowrap !border-orange-500/35 !bg-orange-500/15 !text-orange-700 dark:!text-orange-300";
  }
  return "!whitespace-nowrap";
}

export const PRODUCT_APP_OPTIONS = [
  { value: "ZUNYAR", label: "زانیار" },
  { value: "ZUNKO", label: "زانکو" },
] as const;
