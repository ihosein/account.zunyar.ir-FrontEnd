"use client";

import { useEffect, useState } from "react";
import { IdCard } from "lucide-react";
import { api } from "@/lib/api";
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
        if (active) setRows(data);
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
        <div className="glass-card-static mt-6 overflow-x-auto p-1">
          <div className="glass-inner !m-1 !p-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-[var(--zy-border)] text-[var(--zy-muted)]">
                  <th className="px-3 py-3 text-start font-medium">{t("panel.colApp")}</th>
                  <th className="px-3 py-3 text-start font-medium">{t("panel.colPanel")}</th>
                  <th className="px-3 py-3 text-start font-medium">{t("panel.colRole")}</th>
                  <th className="px-3 py-3 text-start font-medium">{t("panel.colUsername")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--zy-border)] last:border-0">
                    <td className="px-3 py-3 font-medium text-[var(--zy-ink)]">{row.appName}</td>
                    <td className="px-3 py-3 text-[var(--zy-muted)]">{row.panelName || "—"}</td>
                    <td className="px-3 py-3">
                      {row.role ? <span className="zy-chip">{row.role}</span> : "—"}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-[var(--zy-ink)]" dir="ltr">
                      {row.username}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
