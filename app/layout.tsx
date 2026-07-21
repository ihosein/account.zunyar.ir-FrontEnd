import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeToggleFloating } from "@/components/layout/ThemeToggleFloating";
import { t } from "@/lib/i18n";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = {
  title: t("brand.title"),
  description: t("brand.description"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable} suppressHydrationWarning>
      <body className="font-[family-name:var(--font-vazirmatn)] antialiased">
        <Providers>
          <ThemeToggleFloating />
          {children}
        </Providers>
      </body>
    </html>
  );
}
