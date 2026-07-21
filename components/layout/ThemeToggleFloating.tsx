"use client";

import { ThemeToggle } from "@/components/layout/ThemeToggle";

/** Fixed theme control — top physical-left corner (visible on login + panel). */
export function ThemeToggleFloating() {
  return (
    <div className="fixed left-4 top-4 z-[60]">
      <ThemeToggle />
    </div>
  );
}
