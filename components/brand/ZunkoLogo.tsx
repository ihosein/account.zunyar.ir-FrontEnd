"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { t } from "@/lib/i18n";

export const ZUNKO_LOGO = {
  /** Black mark — for light / day theme */
  light: "/images/Zunko-Black.ico",
  /** White mark — for dark / night theme */
  dark: "/images/Zunko-White.ico",
} as const;

type ZunkoLogoProps = {
  className?: string;
  /** Display height in px */
  height?: number;
  priority?: boolean;
};

/** Theme-aware Zunko mark (black on light, white on dark). */
export function ZunkoLogo({ className, height = 24, priority }: ZunkoLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const src = isDark ? ZUNKO_LOGO.dark : ZUNKO_LOGO.light;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={t("auth.apps.zunko")}
      width={height}
      height={height}
      className={clsx("object-contain", className)}
      style={{ width: height, height, aspectRatio: "1 / 1" }}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}
