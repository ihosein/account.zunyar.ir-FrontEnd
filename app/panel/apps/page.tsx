"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronLeft, LayoutGrid, School } from "lucide-react";
import type { ComponentType } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { api } from "@/lib/api";
import { isProductAppCode } from "@/lib/apps";
import { t } from "@/lib/i18n";
import clsx from "clsx";

type Membership = {
  membershipId: number;
  tenantName?: string;
  roleLabelFa?: string;
  roleCode?: string;
  panelUrl?: string;
  subscriptionDaysRemaining?: number | null;
};

type AppConnection = {
  code: string;
  nameFa: string;
  description?: string;
  baseUrl?: string;
  iconKey?: string;
  connected: boolean;
  subscriptionDaysRemaining?: number | null;
  memberships?: Membership[];
};

const APP_ORDER = ["ZUNYAR", "ZUNKO"] as const;

const APP_DESCRIPTIONS: Record<string, string> = {
  ZUNYAR: "سامانه مدیریت آموزشگاه",
  ZUNKO: "سامانه آموزش مجازی",
};

/** Temporary demo panels for Zunyar — replace with API/DB data later. */
const ZUNYAR_DEMO_PANELS: Membership[] = [
  { membershipId: -1, tenantName: "مدرسه اکبرخانی", roleLabelFa: "مسئول پایه" },
  { membershipId: -2, tenantName: "آموزشگاه زبان قلی", roleLabelFa: "معلم" },
  {
    membershipId: -3,
    tenantName: "آموزشگاه تقی‌پور",
    roleLabelFa: "مدیر",
    subscriptionDaysRemaining: 42,
  },
];

const ZUNYAR_LOGIN_URL = "https://zunyar.ir/login";

const APP_ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  zunko: BookOpen,
  zunyar: School,
};

function isManagerRole(membership: Membership): boolean {
  const label = membership.roleLabelFa?.trim();
  const code = membership.roleCode?.trim().toUpperCase();
  return label === "مدیر" || code === "MANAGER" || code === "ADMIN" || code === "OWNER";
}

function subscriptionLabel(days: number | null | undefined): string {
  if (days == null) return t("panel.subscriptionUnknown");
  if (days < 0) return t("panel.subscriptionExpired");
  return t("panel.subscriptionDaysLeft", { days });
}

function AppIcon({ iconKey, name }: { iconKey?: string; name: string }) {
  const key = (iconKey || "").toLowerCase();
  if (key === "zunyar" || name.includes("زانیار")) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-500/10 p-1.5 transition group-hover:bg-accent-500/20">
        <BrandLogo height={26} className="max-h-full max-w-full" />
        <span className="sr-only">{name}</span>
      </span>
    );
  }
  const Icon = (iconKey && APP_ICONS[iconKey]) || LayoutGrid;
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-600 transition group-hover:bg-accent-500/25 dark:text-accent-400">
      <Icon size={24} />
      <span className="sr-only">{name}</span>
    </span>
  );
}

function panelHref(app: AppConnection, membership: Membership): string | undefined {
  const code = app.code.toUpperCase();
  if (code === "ZUNYAR") return ZUNYAR_LOGIN_URL;
  if (code === "ZUNKO") return membership.panelUrl || app.baseUrl || undefined;
  return app.baseUrl || undefined;
}

export default function AppsPage() {
  const [apps, setApps] = useState<AppConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<AppConnection[]>("/apps/connected");
        if (active) setApps(data);
      } catch {
        setApps([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const visibleApps = useMemo(() => {
    const filtered = apps.filter((a) => isProductAppCode(a.code));
    const enriched = filtered.map((app) => {
      const code = app.code.toUpperCase();
      if (code === "ZUNYAR") {
        return {
          ...app,
          connected: true,
          description: APP_DESCRIPTIONS.ZUNYAR,
          // Demo panels until backend memberships are wired for preview
          memberships: ZUNYAR_DEMO_PANELS,
        };
      }
      if (code === "ZUNKO") {
        return {
          ...app,
          description: APP_DESCRIPTIONS.ZUNKO,
        };
      }
      return app;
    });
    return enriched.sort((a, b) => {
      const ai = APP_ORDER.indexOf(a.code.toUpperCase() as (typeof APP_ORDER)[number]);
      const bi = APP_ORDER.indexOf(b.code.toUpperCase() as (typeof APP_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [apps]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.apps")}</h1>
      <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.appsHint")}</p>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : visibleApps.length === 0 ? (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <LayoutGrid size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.appsEmpty")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleApps.map((app) => {
            const code = app.code.toUpperCase();
            const href =
              code === "ZUNYAR" ? ZUNYAR_LOGIN_URL : app.baseUrl || undefined;
            const description = APP_DESCRIPTIONS[code] || app.description || "";

            const titleBlock = (
              <>
                <AppIcon iconKey={app.iconKey} name={app.nameFa} />
                <div className="min-w-0">
                  <p className="truncate font-bold text-[var(--zy-ink)] group-hover:text-accent-700 dark:group-hover:text-accent-300">
                    {app.nameFa}
                  </p>
                  {description ? (
                    <p className="mt-0.5 text-xs text-[var(--zy-muted)]">{description}</p>
                  ) : null}
                </div>
              </>
            );

            return (
              <article key={app.code} className="glass-card p-1">
                <div className="glass-inner !m-2 !p-5">
                  <div className="flex items-start justify-between gap-3">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                      >
                        {titleBlock}
                      </a>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3">{titleBlock}</div>
                    )}

                    <div className="flex shrink-0 flex-col items-center gap-2">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-500/50 hover:bg-emerald-500/15 active:scale-[0.97] dark:text-emerald-400"
                        >
                          {t("panel.viewApp")}
                        </a>
                      ) : null}
                      <span
                        className={clsx(
                          "zy-chip",
                          app.connected
                            ? "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400"
                            : "!border-red-500/30 !bg-red-500/10 !text-red-600 dark:!text-red-400",
                        )}
                      >
                        {app.connected ? t("panel.appConnected") : t("panel.appDisconnected")}
                      </span>
                    </div>
                  </div>

                  {app.connected && app.memberships && app.memberships.length > 0 ? (
                    <div className="mt-4 space-y-1.5 border-t border-[var(--zy-border)] pt-3">
                      {app.memberships.map((m) => {
                        const rowHref = panelHref(app, m);
                        const showSubscription = isManagerRole(m);
                        const rowClass =
                          "flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/50 px-3 py-2.5 text-sm transition hover:border-accent-500/40 hover:bg-accent-500/10";
                        const rowBody = (
                          <>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-[var(--zy-ink)]">
                                {m.tenantName || t("panel.appPanels")}
                              </span>
                              {showSubscription ? (
                                <span className="mt-0.5 block text-[11px] text-[var(--zy-muted)]">
                                  {subscriptionLabel(m.subscriptionDaysRemaining)}
                                </span>
                              ) : null}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {m.roleLabelFa ? (
                                <span className="zy-chip">{m.roleLabelFa}</span>
                              ) : null}
                              <ChevronLeft
                                size={16}
                                className="text-accent-600 dark:text-accent-400"
                              />
                            </span>
                          </>
                        );
                        return rowHref ? (
                          <a
                            key={m.membershipId}
                            href={rowHref}
                            target="_blank"
                            rel="noreferrer"
                            className={clsx(rowClass, "cursor-pointer")}
                          >
                            {rowBody}
                          </a>
                        ) : (
                          <div key={m.membershipId} className={rowClass}>
                            {rowBody}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
