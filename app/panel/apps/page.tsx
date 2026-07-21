"use client";

import { useEffect, useState } from "react";
import { ExternalLink, LayoutGrid } from "lucide-react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import type { ConnectedApp } from "@/types/account";

export default function AppsPage() {
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<ConnectedApp[]>("/account/apps");
        if (active) setApps(data);
      } catch {
        // backend not available yet — keep empty state
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.apps")}</h1>
      <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.appsHint")}</p>

      {!loading && apps.length === 0 && (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <LayoutGrid size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.appsEmpty")}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {apps.map((app) => (
          <div key={app.id} className="glass-card p-1">
            <div className="glass-inner !m-2 !p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white"
                    style={{ background: app.color || "var(--zy-primary)" }}
                  >
                    {app.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-bold text-[var(--zy-ink)]">{app.name}</p>
                    {app.description && (
                      <p className="mt-0.5 text-xs text-[var(--zy-muted)]">{app.description}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg p-2 text-accent-600 hover:bg-accent-500/10 dark:text-accent-400"
                  aria-label={t("panel.openApp")}
                  title={t("panel.openApp")}
                >
                  <ExternalLink size={16} />
                </button>
              </div>

              {app.connectedAt && (
                <p className="mt-3 text-xs text-[var(--zy-muted)]">
                  {t("panel.appConnectedAt")}: {app.connectedAt}
                </p>
              )}

              <div className="mt-4 border-t border-[var(--zy-border)] pt-3">
                <p className="mb-2 text-xs font-semibold text-[var(--zy-muted)]">
                  {t("panel.appPanels")}
                </p>
                <div className="space-y-1.5">
                  {app.panels.map((panel) => (
                    <div
                      key={panel.id}
                      className="flex items-center justify-between rounded-lg bg-accent-500/5 px-3 py-2 text-sm"
                    >
                      <span className="text-[var(--zy-ink)]">{panel.panelName}</span>
                      <span className="zy-chip">{panel.role}</span>
                    </div>
                  ))}
                  {app.panels.length === 0 && (
                    <p className="text-xs text-[var(--zy-muted)]">{t("common.empty")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
