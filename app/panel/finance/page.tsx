"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { formatMoney } from "@/lib/ui";
import type { WalletSummary, WalletTransaction } from "@/types/account";

export default function FinancePage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [appFilter, setAppFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [w, tx] = await Promise.all([
          api<WalletSummary>("/account/wallet"),
          api<WalletTransaction[]>("/account/transactions"),
        ]);
        if (active) {
          setWallet(w);
          setTransactions(tx);
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

  const appOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const tx of transactions) {
      if (tx.appSlug && tx.appName && !seen.has(tx.appSlug)) seen.set(tx.appSlug, tx.appName);
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [transactions]);

  const filtered = appFilter ? transactions.filter((tx) => tx.appSlug === appFilter) : transactions;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.finance")}</h1>
      <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.financeHint")}</p>

      <div className="glass-card mt-6 p-1">
        <div className="glass-inner !m-2 flex flex-wrap items-center justify-between gap-4 !p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-600 dark:text-accent-400">
              <Wallet size={22} />
            </span>
            <div>
              <p className="text-xs text-[var(--zy-muted)]">{t("panel.walletBalance")}</p>
              <p className="mt-1 text-2xl font-black text-[var(--zy-ink)]">
                {formatMoney(wallet?.balance ?? 0)}
              </p>
            </div>
          </div>
          <p className="max-w-xs text-xs text-[var(--zy-muted)]">
            {t("panel.walletBalanceHint")}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-[var(--zy-ink)]">{t("panel.transactions")}</h2>
          {appOptions.length > 0 && (
            <div className="w-48">
              <GlassSelect
                value={appFilter}
                onChange={setAppFilter}
                placeholder={t("panel.allApps")}
                options={[{ value: "", label: t("panel.allApps") }, ...appOptions]}
              />
            </div>
          )}
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="glass-card-static p-1">
            <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
              <Wallet size={28} className="text-accent-500" />
              <p className="text-sm text-[var(--zy-muted)]">{t("panel.transactionsEmpty")}</p>
            </div>
          </div>
        ) : (
          <div className="glass-card-static overflow-x-auto p-1">
            <div className="glass-inner !m-1 !p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--zy-border)] text-[var(--zy-muted)]">
                    <th className="px-3 py-3 text-start font-medium">{t("panel.colDate")}</th>
                    <th className="px-3 py-3 text-start font-medium">{t("panel.colApp")}</th>
                    <th className="px-3 py-3 text-start font-medium">{t("panel.colDescription")}</th>
                    <th className="px-3 py-3 text-start font-medium">{t("panel.colAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} className="border-b border-[var(--zy-border)] last:border-0">
                      <td className="px-3 py-3 text-[var(--zy-muted)]">{tx.createdAt}</td>
                      <td className="px-3 py-3 text-[var(--zy-ink)]">{tx.appName || "—"}</td>
                      <td className="px-3 py-3 text-[var(--zy-ink)]">{tx.description}</td>
                      <td
                        className={`px-3 py-3 font-semibold ${
                          tx.type === "credit"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-500"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {tx.type === "credit" ? (
                            <ArrowDownLeft size={14} />
                          ) : (
                            <ArrowUpRight size={14} />
                          )}
                          {formatMoney(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
