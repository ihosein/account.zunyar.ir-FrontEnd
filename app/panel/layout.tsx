"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AccountSidebar, useSidebarCollapsed } from "@/components/layout/AccountSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { BrandLoader } from "@/components/brand/BrandLogo";
import { useAuth } from "@/lib/auth";
import { isProfileComplete, PROFILE_PATH } from "@/lib/profile-gate";
import clsx from "clsx";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapsed();
  const profileIncomplete = !isProfileComplete(user);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profileIncomplete && pathname !== PROFILE_PATH) {
      router.replace(PROFILE_PATH);
    }
  }, [loading, user, pathname, router, profileIncomplete]);

  if (loading || !user) {
    return <BrandLoader />;
  }

  if (profileIncomplete && pathname !== PROFILE_PATH) {
    return <BrandLoader />;
  }

  return (
    <div className="min-h-screen">
      <AccountSidebar collapsed={collapsed} onToggle={toggle} />
      <MobileBottomNav />
      <main
        className={clsx(
          "min-w-0 pb-[calc(4.75rem+env(safe-area-inset-bottom))] transition-[margin] duration-300 lg:pb-0 lg:pt-0",
          collapsed ? "lg:ms-[4.75rem]" : "lg:ms-[17rem]",
        )}
      >
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
