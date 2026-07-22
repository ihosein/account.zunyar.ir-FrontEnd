"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** Fixed theme control — top physical-left corner. Hidden on mobile panel (in settings sheet). */
export function ThemeToggleFloating() {
  const pathname = usePathname();
  const onPanel = pathname.startsWith("/panel");

  return (
    <div
      className={clsx(
        "theme-toggle-floating fixed left-4 top-4 z-[60] print:hidden",
        onPanel && "hidden lg:block",
      )}
    >
      <ThemeToggle />
    </div>
  );
}
