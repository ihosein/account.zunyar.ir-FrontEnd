"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { BrandLoader, ZUNYAR_LOGO } from "@/components/brand/BrandLogo";

/**
 * Shows BrandLoader briefly on route changes and keeps <link rel="icon"> in sync with theme.
 */
export function RouteLoader() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    const href = isDark ? ZUNYAR_LOGO.faviconDark : ZUNYAR_LOGO.faviconLight;
    let link = document.querySelector<HTMLLinkElement>("link[data-zy-favicon]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.setAttribute("data-zy-favicon", "1");
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = href;
  }, [resolvedTheme]);

  if (!visible) return null;
  return <BrandLoader />;
}
