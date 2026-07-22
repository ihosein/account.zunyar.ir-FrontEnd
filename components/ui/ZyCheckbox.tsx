"use client";

import { Check } from "lucide-react";
import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

type ZyCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

/** Accessible checkbox with a visible check icon (not color-only). */
export function ZyCheckbox({ label, className, checked, ...props }: ZyCheckboxProps) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-center gap-2.5 text-sm text-[var(--zy-ink)]",
        props.disabled && "cursor-not-allowed opacity-55",
        className,
      )}
    >
      <span className="relative inline-flex h-[1.15rem] w-[1.15rem] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="zy-checkbox peer"
          checked={checked}
          {...props}
        />
        <Check
          size={12}
          className={clsx(
            "pointer-events-none absolute text-white transition-opacity [stroke-width:3]",
            checked ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
      </span>
      <span>{label}</span>
    </label>
  );
}
