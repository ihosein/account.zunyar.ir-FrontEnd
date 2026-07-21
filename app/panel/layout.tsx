"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountSidebar } from "@/components/layout/AccountSidebar";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AccountSidebar />
      <main className="min-w-0 pt-16 lg:ms-[17rem] lg:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
