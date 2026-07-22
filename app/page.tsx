"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { isProfileComplete, PROFILE_PATH } from "@/lib/profile-gate";
import { t } from "@/lib/i18n";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(isProfileComplete(user) ? "/panel/apps" : PROFILE_PATH);
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
    </div>
  );
}
