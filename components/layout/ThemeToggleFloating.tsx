"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";
import { MessagesHistoryButton } from "@/components/broadcast/MessagesHistoryButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/**
 * Fixed controls — top physical-left corner.
 * RTL: پیام‌ها سمت راست دکمه تم (در ردیف افقی).
 * Hidden on mobile panel (theme + messages in settings sheet).
 */
export function ThemeToggleFloating() {
  const pathname = usePathname();
  const onPanel = pathname.startsWith("/panel");

  return (
    <div
      dir="ltr"
      className={clsx(
        "theme-toggle-floating fixed left-4 top-4 z-[60] flex flex-row items-center gap-2 print:hidden",
        onPanel && "hidden lg:flex",
      )}
    >
      <ThemeToggle />
      {onPanel ? <MessagesHistoryButton /> : null}
    </div>
  );
}
