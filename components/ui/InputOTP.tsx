"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { faNum } from "@/lib/i18n";

const FA_TO_EN: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

function toLatinDigits(raw: string): string {
  return raw.replace(/[۰-۹0-9]/g, (d) => FA_TO_EN[d] ?? d).replace(/\D/g, "");
}

type InputOTPProps = {
  length?: number;
  /** Latin digits 0-9 only (for API). */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Red borders when required code is incomplete. */
  invalid?: boolean;
};

/** Themed OTP boxes — displays Persian digits, stores Latin digits. */
export function InputOTP({ length = 5, value, onChange, disabled, autoFocus, invalid }: InputOTPProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = toLatinDigits(value).slice(0, length).split("");

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value === "") refs.current[0]?.focus();
  }, [value]);

  function setAt(index: number, char: string) {
    const next = Array.from({ length }, (_, i) => digits[i] || "");
    next[index] = char;
    onChange(next.join("").slice(0, length));
    if (char && index < length - 1) refs.current[index + 1]?.focus();
  }

  return (
    <div className="flex justify-center gap-2" dir="ltr">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digits[i] ? faNum(digits[i]) : ""}
          className={clsx(
            "h-12 w-11 rounded-xl border bg-[rgba(255,255,255,0.92)] text-center text-lg font-bold text-[var(--zy-ink)] outline-none backdrop-blur-md transition",
            "dark:bg-[rgba(16,19,25,0.92)]",
            invalid
              ? "border-red-500/75 shadow-[0_0_0_3px_rgba(239,68,68,0.12)] focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.2)]"
              : "border-[rgba(13,148,136,0.45)] focus:border-accent-500 focus:shadow-[0_0_0_3px_var(--zy-glow-soft)]",
            disabled && "opacity-50",
          )}
          onChange={(e) => {
            const d = toLatinDigits(e.target.value).slice(-1);
            setAt(i, d);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = toLatinDigits(e.clipboardData.getData("text")).slice(0, length);
            if (!pasted) return;
            onChange(pasted);
            refs.current[Math.min(pasted.length, length) - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}
