"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/panel/profile" : "/login");
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
    </div>
  );
}
