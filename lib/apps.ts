/** Product apps currently live in the account portal UI. */
export const PRODUCT_APP_CODES = ["ZUNYAR", "ZUNKO"] as const;

export type ProductAppCode = (typeof PRODUCT_APP_CODES)[number];

export function isProductAppCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const normalized = code.toUpperCase();
  return (PRODUCT_APP_CODES as readonly string[]).includes(normalized);
}

export const PRODUCT_APP_OPTIONS = [
  { value: "ZUNYAR", label: "زانیار" },
  { value: "ZUNKO", label: "زانکو" },
] as const;
