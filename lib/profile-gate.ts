import type { User } from "@/types/account";

/** Required personal fields before the rest of the panel is unlocked. */
export function isProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false;
  const gender = String(user.gender || "").trim();
  return (
    !!user.firstName?.trim() &&
    !!user.lastName?.trim() &&
    !!user.fatherName?.trim() &&
    !!user.nationalCode?.trim() &&
    !!gender
  );
}

export const PROFILE_PATH = "/panel/profile";
