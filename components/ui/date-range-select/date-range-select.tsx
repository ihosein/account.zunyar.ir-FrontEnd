"use client";

import { useEffect, useMemo, useState } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import { CalendarDays } from "lucide-react";
import clsx from "clsx";
import { cn } from "@/lib/utils";

export type DateSelectProps = {
  value?: string;
  onChange: (isoDate: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  inputClassName?: string;
  /** Max selectable date as ISO yyyy-MM-dd (e.g. today for birth date). */
  maxDate?: string;
  /** Min selectable date as ISO yyyy-MM-dd. */
  minDate?: string;
};

/** Build a Persian DateObject from Gregorian ISO — always a fresh instance. */
function toPersianObject(iso?: string): DateObject | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  try {
    return new DateObject({
      date: iso,
      format: "YYYY-MM-DD",
      calendar: gregorian,
    }).convert(persian, persian_fa);
  } catch {
    return undefined;
  }
}

/**
 * Convert picker DateObject → Gregorian ISO with Latin digits.
 * IMPORTANT: clone first — DateObject.convert() mutates in place and breaks the picker.
 * Do NOT use .format() under persian_fa locale (Persian digits break API / regex).
 */
function toIso(date: DateObject | null | undefined): string {
  if (!date) return "";
  try {
    const g = new DateObject(date).convert(gregorian);
    const y = g.year;
    const m = String(g.month?.number ?? g.month).padStart(2, "0");
    const d = String(g.day).padStart(2, "0");
    if (!Number.isFinite(y) || !/^\d{4}$/.test(String(y))) {
      const js = date.toDate();
      if (Number.isNaN(js.getTime())) return "";
      return [
        js.getFullYear(),
        String(js.getMonth() + 1).padStart(2, "0"),
        String(js.getDate()).padStart(2, "0"),
      ].join("-");
    }
    return `${y}-${m}-${d}`;
  } catch {
    try {
      const js = date.toDate();
      if (Number.isNaN(js.getTime())) return "";
      return [
        js.getFullYear(),
        String(js.getMonth() + 1).padStart(2, "0"),
        String(js.getDate()).padStart(2, "0"),
      ].join("-");
    } catch {
      return "";
    }
  }
}

function formatDisplay(iso?: string): string {
  const obj = toPersianObject(iso);
  return obj ? obj.format("YYYY/MM/DD") : "";
}

/**
 * Single Jalali date picker themed like GlassSelect.
 * Value in/out is Gregorian ISO `yyyy-MM-dd` for API compatibility.
 * Layout matches sibling fields (label + control with same top margin as GlassSelect).
 */
export function DateSelect({
  value,
  onChange,
  label,
  placeholder = "انتخاب تاریخ",
  disabled,
  invalid,
  className,
  inputClassName,
  maxDate,
  minDate,
}: DateSelectProps) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState<DateObject | undefined>(() => toPersianObject(value));

  useEffect(() => {
    setInner(toPersianObject(value));
  }, [value]);

  const max = useMemo(() => toPersianObject(maxDate), [maxDate]);
  const min = useMemo(() => toPersianObject(minDate), [minDate]);
  const display = formatDisplay(value) || (inner ? inner.format("YYYY/MM/DD") : "");

  return (
    <div className={cn("w-full text-sm", className)}>
      {label ? (
        <span className={clsx(invalid ? "zy-label--error" : "text-[var(--zy-muted)]")}>
          {label}
        </span>
      ) : null}

      <DatePicker
        value={inner}
        onChange={(date) => {
          const single = Array.isArray(date) ? date[0] : date;
          if (!single) {
            setInner(undefined);
            onChange("");
            return;
          }
          const persianClone = new DateObject(single).convert(persian, persian_fa);
          const iso = toIso(single);
          setInner(persianClone);
          onChange(iso);
        }}
        calendar={persian}
        locale={persian_fa}
        format="YYYY/MM/DD"
        formatMonth={(month) => `${String(month).trim()}،`}
        formatYear={(year) => String(year)}
        monthYearSeparator=" "
        calendarPosition="bottom-center"
        portal
        zIndex={700}
        disabled={disabled}
        maxDate={max}
        minDate={min}
        showOtherDays
        numberOfMonths={1}
        editable={false}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        className="zy-date"
        containerClassName="zy-date-container w-full"
        containerStyle={{ width: "100%" }}
        render={(_value, openCalendar) => (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) openCalendar();
            }}
            aria-expanded={open}
            className={cn(
              "zy-glass-select",
              open && "zy-glass-select--open",
              invalid && "zy-glass-select--error",
              inputClassName,
            )}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-start",
                !display && "text-[var(--zy-muted)]",
              )}
            >
              {display || placeholder}
            </span>
            <CalendarDays size={16} className="shrink-0 text-accent-600 dark:text-accent-400" />
          </button>
        )}
      />
    </div>
  );
}

/** @deprecated Use DateSelect — kept for folder/API compatibility with prior projects. */
export const DateRangeSelect = DateSelect;
export type DateRangeSelectProps = DateSelectProps;
