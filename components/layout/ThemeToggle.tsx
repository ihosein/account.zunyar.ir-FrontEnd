"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { t } from "@/lib/i18n";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? t("theme.light") : t("theme.dark");

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={clsx(
        "theme-toggle group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border transition-all duration-300",
        "border-accent-500/30 bg-white/80 text-accent-700 hover:border-accent-500 hover:bg-accent-50",
        "dark:border-white/10 dark:bg-charcoal-soft/80 dark:text-accent-400 dark:hover:border-accent-500 dark:hover:bg-charcoal-soft",
        "dark:shadow-[0_0_16px_rgba(20,184,166,0.22)]",
      )}
    >
      <span
        className={clsx(
          "absolute transition-all duration-500 ease-out",
          isDark
            ? "translate-y-8 rotate-90 scale-50 opacity-0"
            : "translate-y-0 rotate-0 scale-100 opacity-100",
        )}
      >
        <Sun size={18} className="group-hover:animate-spin-slow" />
      </span>
      <span
        className={clsx(
          "absolute transition-all duration-500 ease-out",
          isDark
            ? "translate-y-0 rotate-0 scale-100 opacity-100"
            : "-translate-y-8 -rotate-90 scale-50 opacity-0",
        )}
      >
        <Moon size={18} className="group-hover:animate-wiggle" />
      </span>
      {!mounted && <Sun size={18} className="opacity-40" />}
    </button>
  );
}
