"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { t } from "@/lib/i18n";

export const ZUNYAR_LOGO = {
  /** Black+orange mark — for light backgrounds (wide wordmark) */
  light: "/images/ZunyarBlack.png",
  /** White+orange mark — for dark backgrounds (wide wordmark) */
  dark: "/images/ZunyarWhite.png",
  /** Square favicons for browser tab (padded canvas — not stretched) */
  faviconLight: "/images/ZunyarBlackFavicon.png",
  faviconDark: "/images/ZunyarWhiteFavicon.png",
  /** Square loader marks (orange accent preserved for grayscale→color wash) */
  loaderLight: "/images/ZunyarLoaderBlack.ico",
  loaderDark: "/images/ZunyarLoaderWhite.ico",
} as const;

type BrandLogoProps = {
  className?: string;
  /** Display height in px */
  height?: number;
  /** Prefer loader mark variants */
  variant?: "full" | "loader";
  priority?: boolean;
};

/** Theme-aware Zunyar wordmark (black on light, white on dark). */
export function BrandLogo({
  className,
  height = 24,
  variant = "full",
  priority,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // App defaultTheme is dark — avoid flashing black logo on dark UI before hydrate.
  const isDark = mounted ? resolvedTheme === "dark" : true;
  const src =
    variant === "loader"
      ? isDark
        ? ZUNYAR_LOGO.loaderDark
        : ZUNYAR_LOGO.loaderLight
      : isDark
        ? ZUNYAR_LOGO.dark
        : ZUNYAR_LOGO.light;

  // Loader assets are square; full wordmark is ~2.1:1.
  const isSquare = variant === "loader";
  const width = isSquare ? height : Math.round(height * 2.05);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={t("brand.name")}
      width={width}
      height={height}
      className={clsx("object-contain", className)}
      style={
        isSquare
          ? { width: height, height, aspectRatio: "1 / 1" }
          : { height, width: "auto", maxWidth: "100%" }
      }
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );
}

type BrandLoaderProps = {
  label?: string;
};

/**
 * Full-screen route loader: blurred backdrop + mark fills from grayscale to color (RTL).
 */
export function BrandLoader({ label }: BrandLoaderProps) {
  return (
    <div className="zy-page-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="zy-page-loader__mark" aria-hidden>
        <BrandLogo
          variant="loader"
          height={128}
          className="zy-page-loader__layer zy-page-loader__layer--gray"
        />
        <BrandLogo
          variant="loader"
          height={128}
          className="zy-page-loader__layer zy-page-loader__layer--color"
        />
      </div>
      <p className="mt-5 text-sm text-[var(--zy-muted)]">{label || t("common.loading")}</p>
    </div>
  );
}
