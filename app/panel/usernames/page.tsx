"use client";

import { useEffect, useState } from "react";
import { IdCard } from "lucide-react";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { api } from "@/lib/api";
import { isProductAppCode } from "@/lib/apps";
import { t } from "@/lib/i18n";
import type { UsernameBinding } from "@/types/account";

export default function UsernamesPage() {
  const [rows, setRows] = useState<UsernameBinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<UsernameBinding[]>("/account/usernames");
        if (active) {
          setRows(data.filter((r) => isProductAppCode(r.appSlug)));
        }
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
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.usernames")}</h1>
      <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.usernamesHint")}</p>

      {!loading && rows.length === 0 ? (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <IdCard size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.usernamesEmpty")}</p>
          </div>
        </div>
      ) : (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-1 !p-2 md:!p-0">
            <ResponsiveRecords
              columns={[
                t("panel.colApp"),
                t("panel.colPanel"),
                t("panel.colRole"),
                t("panel.colUsername"),
              ]}
              rows={rows.map((row) => ({
                key: row.id,
                cells: [
                  <span key="a" className="font-medium">
                    {row.appName}
                  </span>,
                  <span key="p" className="text-[var(--zy-muted)]">
                    {row.panelName || "—"}
                  </span>,
                  row.role ? <span className="zy-chip">{row.role}</span> : "—",
                  <span key="u" className="font-mono text-xs" dir="ltr">
                    {row.username}
                  </span>,
                ],
                details: [
                  { label: t("panel.colApp"), value: row.appName },
                  { label: t("panel.colPanel"), value: row.panelName || "—" },
                  {
                    label: t("panel.colRole"),
                    value: row.role ? <span className="zy-chip">{row.role}</span> : "—",
                  },
                  { label: t("panel.colUsername"), value: row.username, dir: "ltr" },
                ],
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}
