"use client";

import { useState } from "react";
import { isPasswordAcceptable, passwordStrength } from "@/lib/password-strength";
import { fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { t } from "@/lib/i18n";

type PasswordFieldsProps = {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  /** true on first login when passwordSet=false — required, no fake placeholder dots. */
  required?: boolean;
};

const STRENGTH_COLOR: Record<string, string> = {
  weak: "bg-red-500",
  medium: "bg-amber-500",
  strong: "bg-emerald-500",
};

const STRENGTH_WIDTH: Record<string, string> = {
  weak: "w-1/3",
  medium: "w-2/3",
  strong: "w-full",
};

/** Password + confirm side-by-side; inputs top-aligned, strength under password. */
export function PasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  required,
}: PasswordFieldsProps) {
  const [unlocked, setUnlocked] = useState(!required);
  const strength = passwordStrength(password);
  const touched = password.length > 0 || confirm.length > 0;
  const match = password.length > 0 && password === confirm;
  const readOnlyGuard = required && !unlocked;
  const passwordInvalid = !!required && isBlank(password);
  const confirmInvalid =
    (!!required && isBlank(confirm)) || (touched && confirm.length > 0 && !match);

  const strengthLabel =
    strength === "empty"
      ? ""
      : strength === "weak"
        ? t("panel.passwordWeak")
        : strength === "medium"
          ? t("panel.passwordMedium")
          : t("panel.passwordStrong");

  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
      <label className="text-sm">
        <span className={fieldLabelClass(passwordInvalid)}>{t("panel.password")}</span>
        <input
          type="password"
          className={fieldInputClass(passwordInvalid)}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          onFocus={() => setUnlocked(true)}
          readOnly={readOnlyGuard}
          dir="ltr"
          autoComplete="new-password"
          placeholder={required ? undefined : "••••••••"}
        />
        {password.length > 0 && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(15,23,32,0.1)] dark:bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${STRENGTH_COLOR[strength] ?? "bg-transparent"} ${STRENGTH_WIDTH[strength] ?? "w-0"}`}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--zy-muted)]">{strengthLabel}</p>
          </div>
        )}
        <p className="mt-1 text-xs text-[var(--zy-muted)]">
          {required ? t("panel.passwordRequiredHint") : t("panel.passwordHint")}
        </p>
      </label>
      <label className="text-sm">
        <span className={fieldLabelClass(confirmInvalid)}>{t("panel.passwordConfirm")}</span>
        <input
          type="password"
          className={fieldInputClass(confirmInvalid)}
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
          onFocus={() => setUnlocked(true)}
          readOnly={readOnlyGuard}
          dir="ltr"
          autoComplete="new-password"
          placeholder={required ? undefined : "••••••••"}
        />
        {touched && confirm.length > 0 && !match && (
          <p className="mt-1 text-xs text-red-600">{t("panel.passwordMismatch")}</p>
        )}
      </label>
    </div>
  );
}

export function passwordFieldsValid(password: string, confirm: string, required?: boolean) {
  if (required) {
    return password === confirm && isPasswordAcceptable(password);
  }
  if (!password && !confirm) return true;
  return password === confirm && isPasswordAcceptable(password);
}
