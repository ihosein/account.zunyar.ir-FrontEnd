const OTP_COOLDOWN_MS = 60_000;
const STORAGE_PREFIX = "zy_otp_until_";

function storageKey(phone: string) {
  return `${STORAGE_PREFIX}${phone}`;
}

/** Start (or restart) a 60s resend cooldown for this phone. */
export function startOtpCooldown(phone: string) {
  if (typeof window === "undefined" || !phone) return;
  localStorage.setItem(storageKey(phone), String(Date.now() + OTP_COOLDOWN_MS));
}

/** Seconds left until resend is allowed (0 = ready). Survives refresh. */
export function getOtpCooldownRemaining(phone: string): number {
  if (typeof window === "undefined" || !phone) return 0;
  const until = Number(localStorage.getItem(storageKey(phone)) || 0);
  if (!until) return 0;
  const left = Math.ceil((until - Date.now()) / 1000);
  if (left <= 0) {
    localStorage.removeItem(storageKey(phone));
    return 0;
  }
  return left;
}
