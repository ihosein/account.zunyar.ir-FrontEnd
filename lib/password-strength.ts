export type PasswordStrength = "empty" | "weak" | "medium" | "strong";

/** Score password for the profile strength meter. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else if (/[a-zA-Z]/.test(password)) score += 0.5;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score < 2) return "weak";
  if (score < 4) return "medium";
  return "strong";
}

/** Minimum acceptable password for save (not weak, length ≥ 8). */
export function isPasswordAcceptable(password: string): boolean {
  if (password.length < 8) return false;
  return passwordStrength(password) !== "weak";
}
