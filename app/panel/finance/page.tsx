"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Landmark,
  Trash2,
  Wallet,
} from "lucide-react";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { api } from "@/lib/api";
import { isProductAppCode } from "@/lib/apps";
import { t } from "@/lib/i18n";
import {
  dialogPrimaryBtnClass,
  fieldInputClass,
  fieldLabelClass,
  formatMoney,
  formatRelativeTime,
  isBlank,
} from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { BankAccount, WalletSummary, WalletTransaction } from "@/types/account";

type TxStatus = "done" | "pending" | "rejected";

type FinanceTx = WalletTransaction & {
  status?: TxStatus;
};

/** Iranian IBAN: IR + 24 digits */
const IBAN_DIGITS_LEN = 24;

function onlyAsciiDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d]/g, "");
}

function StatusChip({ status, tip }: { status?: TxStatus; tip?: string }) {
  let chip: ReactNode;
  if (status === "pending") {
    chip = (
      <span className="zy-chip !border-amber-500/30 !bg-amber-500/10 !text-amber-700 dark:!text-amber-300">
        {t("panel.txPending")}
      </span>
    );
  } else if (status === "rejected") {
    chip = (
      <span className="zy-chip !border-red-500/30 !bg-red-500/10 !text-red-600 dark:!text-red-400">
        {t("panel.txRejected")}
      </span>
    );
  } else {
    chip = (
      <span className="zy-chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400">
        {t("panel.txDone")}
      </span>
    );
  }

  const note = tip?.trim();
  if (!note) return chip;

  return (
    <span className="zy-tip" tabIndex={0}>
      {chip}
      <span className="zy-tip__bubble" role="tooltip">
        {note}
      </span>
    </span>
  );
}

export default function FinancePage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTx[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [appFilter, setAppFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [banksLoading, setBanksLoading] = useState(true);

  const [bankOpen, setBankOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [bankTitle, setBankTitle] = useState("");
  /** Digits only (no IR prefix) — max 24 */
  const [bankIbanDigits, setBankIbanDigits] = useState("");

  const loadWallet = useCallback(async () => {
    try {
      const w = await api<{
        balance: number;
        transactions?: Array<{
          id: number;
          amount: number;
          type: string;
          description?: string;
          appCode?: string;
          createdAt?: string;
        }>;
      }>("/wallet");
      setWallet({ balance: Number(w?.balance ?? 0) });
      setTransactions(
        (w?.transactions ?? []).map((tx) => {
          const typeLower = String(tx.type || "").toLowerCase();
          const appSlug = tx.appCode || "ACCOUNT";
          return {
            id: tx.id,
            type: typeLower === "debit" ? "debit" : "credit",
            amount: Number(tx.amount ?? 0),
            description: tx.description || "",
            appSlug,
            appName:
              appSlug === "ZUNYAR"
                ? "زانیار"
                : appSlug === "ZUNKO"
                  ? "زانکو"
                  : "زانیار اکانت",
            createdAt: tx.createdAt || "",
            status: "done" as TxStatus,
          };
        }),
      );
    } catch {
      setWallet({ balance: 0 });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBanks = useCallback(async () => {
    setBanksLoading(true);
    try {
      const data = await api<BankAccount[]>("/wallet/banks");
      setBanks(Array.isArray(data) ? data : []);
    } catch (err) {
      setBanks([]);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBanksLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
    void loadBanks();
  }, [loadWallet, loadBanks]);

  const appOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const tx of transactions) {
      if (tx.appSlug && tx.appName && !seen.has(tx.appSlug)) {
        if (tx.appSlug === "ACCOUNT" || isProductAppCode(tx.appSlug)) {
          seen.set(tx.appSlug, tx.appName);
        }
      }
    }
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [transactions]);

  const filtered = appFilter
    ? transactions.filter((tx) => tx.appSlug === appFilter)
    : transactions.filter(
        (tx) => !tx.appSlug || tx.appSlug === "ACCOUNT" || isProductAppCode(tx.appSlug),
      );

  const balance = wallet?.balance ?? 0;
  const ibanInvalid = bankIbanDigits.length > 0 && bankIbanDigits.length < IBAN_DIGITS_LEN;

  function openBankForm() {
    setBankTitle("");
    setBankIbanDigits("");
    setBankOpen(true);
  }

  async function submitBank(e: FormEvent) {
    e.preventDefault();
    const title = bankTitle.trim();
    const digits = onlyAsciiDigits(bankIbanDigits);
    if (!title || digits.length !== IBAN_DIGITS_LEN) {
      toast.error(t("panel.bankInvalid"));
      return;
    }
    setBusy(true);
    try {
      const created = await api<BankAccount>("/wallet/banks", {
        method: "POST",
        body: JSON.stringify({ title, iban: `IR${digits}` }),
      });
      setBanks((prev) => [created, ...prev.filter((b) => b.id !== created.id)]);
      setBankOpen(false);
      toast.success(t("panel.bankSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function removeBank(id: number) {
    setDeletingId(id);
    try {
      await api(`/wallet/banks/${id}`, { method: "DELETE" });
      setBanks((prev) => prev.filter((b) => b.id !== id));
      toast.success(t("panel.bankDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.finance")}</h1>
      <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.financeHint")}</p>

      <div className="glass-card mt-6 p-1">
        <div className="glass-inner !m-2 flex flex-col gap-5 !p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-600 dark:text-accent-400">
              <Wallet size={22} />
            </span>
            <div>
              <p className="text-xs text-[var(--zy-muted)]">{t("panel.walletBalance")}</p>
              <p className="mt-1 text-2xl font-black text-[var(--zy-ink)]">
                {formatMoney(balance)}
              </p>
              <p className="mt-1 max-w-xs text-[11px] text-[var(--zy-muted)]">
                {t("panel.walletBalanceHint")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openBankForm}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/80 px-4 py-2.5 text-sm font-semibold text-[var(--zy-ink)] transition hover:border-accent-500/40 hover:bg-accent-500/10"
          >
            <Landmark size={16} className="text-accent-600 dark:text-accent-400" />
            {t("panel.registerBank")}
          </button>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-[var(--zy-ink)]">{t("panel.bankAccounts")}</h2>
        </div>

        {banksLoading ? (
          <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
        ) : banks.length === 0 ? (
          <div className="glass-card-static p-1">
            <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
              <Landmark size={28} className="text-accent-500" />
              <p className="text-sm text-[var(--zy-muted)]">{t("panel.bankAccountsEmpty")}</p>
              <button
                type="button"
                onClick={openBankForm}
                className="text-sm font-semibold text-accent-600 hover:underline dark:text-accent-400"
              >
                {t("panel.registerBank")}
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card-static p-1">
            <div className="glass-inner !m-1 !p-2 md:!p-0">
              <ResponsiveRecords
                fitWidth
                columns={[
                  t("panel.bankTitle"),
                  t("panel.bankIban"),
                  t("panel.colDate"),
                  t("common.actions"),
                ]}
                rows={banks.map((bank) => {
                  const deleteBtn = (
                    <button
                      type="button"
                      disabled={deletingId === bank.id}
                      onClick={() => void removeBank(bank.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
                    >
                      <Trash2 size={14} />
                      {deletingId === bank.id ? t("common.loading") : t("common.delete")}
                    </button>
                  );
                  return {
                    key: bank.id,
                    cells: [
                      <span key="t" className="font-medium">
                        {bank.title}
                      </span>,
                      <span key="i" className="font-mono text-xs" dir="ltr">
                        {bank.iban}
                      </span>,
                      formatRelativeTime(bank.createdAt),
                      deleteBtn,
                    ],
                    details: [
                      { label: t("panel.bankTitle"), value: bank.title },
                      { label: t("panel.bankIban"), value: bank.iban, dir: "ltr" as const },
                      {
                        label: t("panel.colDate"),
                        value: formatRelativeTime(bank.createdAt),
                      },
                    ],
                    actions: deleteBtn,
                  };
                })}
              />
            </div>
          </div>
        )}
      </section>

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
          <div className="glass-card-static p-1">
            <div className="glass-inner !m-1 !p-2 md:!p-0">
              <ResponsiveRecords
                fitWidth
                columnClassNames={[
                  "w-[18%]",
                  "w-[14%]",
                  "w-[36%]",
                  "w-[16%]",
                  "w-[16%]",
                ]}
                columns={[
                  t("panel.colDate"),
                  t("panel.colApp"),
                  t("panel.colDescription"),
                  t("panel.colAmount"),
                  t("panel.colStatus"),
                ]}
                rows={filtered.map((tx) => {
                  const amountNode = (
                    <span
                      className={`inline-flex flex-wrap items-center gap-1 font-semibold ${
                        tx.type === "credit"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500"
                      }`}
                    >
                      {tx.type === "credit" ? (
                        <ArrowDownLeft size={14} className="shrink-0" />
                      ) : (
                        <ArrowUpRight size={14} className="shrink-0" />
                      )}
                      {formatMoney(tx.amount)}
                    </span>
                  );

                  const statusNode = <StatusChip status={tx.status} tip={tx.description} />;
                  const when = tx.createdAt ? formatRelativeTime(tx.createdAt) || tx.createdAt : "—";

                  return {
                    key: tx.id,
                    cells: [
                      <span key="d" className="text-[var(--zy-muted)]">
                        {when}
                      </span>,
                      <span key="a" className="break-words">
                        {tx.appName || "—"}
                      </span>,
                      <span key="desc" className="break-words whitespace-normal">
                        {tx.description}
                      </span>,
                      amountNode,
                      statusNode,
                    ],
                    details: [
                      { label: t("panel.colDate"), value: when },
                      { label: t("panel.colApp"), value: tx.appName || "—" },
                      { label: t("panel.colDescription"), value: tx.description },
                      { label: t("panel.colAmount"), value: amountNode },
                      { label: t("panel.colStatus"), value: statusNode },
                    ],
                  };
                })}
              />
            </div>
          </div>
        )}
      </section>

      <GlassDialog
        open={bankOpen}
        onClose={() => !busy && setBankOpen(false)}
        title={t("panel.registerBank")}
      >
        <form onSubmit={(e) => void submitBank(e)} className="space-y-4" noValidate>
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(bankTitle))}>{t("panel.bankTitle")}</span>
            <input
              className={fieldInputClass(isBlank(bankTitle))}
              value={bankTitle}
              onChange={(e) => setBankTitle(e.target.value)}
              placeholder={t("panel.bankTitlePlaceholder")}
              disabled={busy}
            />
          </label>
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(bankIbanDigits) || ibanInvalid)}>
              {t("panel.bankIban")}
            </span>
            <div className="relative mt-1">
              <span
                className="pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 text-sm font-semibold text-[var(--zy-ink)]"
                style={{ insetInlineStart: "0.9rem" }}
                dir="ltr"
              >
                IR
              </span>
              <input
                className={fieldInputClass(isBlank(bankIbanDigits) || ibanInvalid, "!mt-0")}
                style={{ paddingInlineStart: "2.35rem" }}
                value={bankIbanDigits}
                onChange={(e) =>
                  setBankIbanDigits(onlyAsciiDigits(e.target.value).slice(0, IBAN_DIGITS_LEN))
                }
                inputMode="numeric"
                placeholder="170000000012345678901234"
                dir="ltr"
                maxLength={IBAN_DIGITS_LEN}
                disabled={busy}
              />
            </div>
            <span className="mt-1 block text-[11px] text-[var(--zy-muted)]">
              {t("panel.bankIbanHint")}
            </span>
          </label>
          <button
            type="submit"
            disabled={busy || isBlank(bankTitle) || bankIbanDigits.length !== IBAN_DIGITS_LEN}
            className={`${dialogPrimaryBtnClass} w-full disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <Building2 size={16} className="me-1.5 inline" />
            {busy ? t("common.loading") : t("common.save")}
          </button>
        </form>
      </GlassDialog>
    </div>
  );
}
