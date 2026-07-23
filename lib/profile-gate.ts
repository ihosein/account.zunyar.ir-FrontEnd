import type { User } from "@/types/account";

/** Iranian national code: exactly 10 digits when present. */
export function isValidNationalCode(value: string | null | undefined): boolean {
  return /^\d{10}$/.test(String(value || "").trim());
}

/** Required personal fields before the rest of the panel is unlocked. */
export function isProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false;
  const gender = String(user.gender || "").trim();
  return (
    !!user.firstName?.trim() &&
    !!user.lastName?.trim() &&
    !!user.fatherName?.trim() &&
    isValidNationalCode(user.nationalCode) &&
    !!gender
  );
}

export const PROFILE_PATH = "/panel/profile";
