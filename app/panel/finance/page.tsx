"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Landmark,
  Plus,
  Wallet,
} from "lucide-react";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { TransferModeSwitch, type TransferMode } from "@/components/ui/TransferModeSwitch";
import { api } from "@/lib/api";
import { isProductAppCode } from "@/lib/apps";
import { faNum, t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, formatMoney, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { WalletSummary, WalletTransaction } from "@/types/account";

type BankAccount = {
  id: string;
  title: string;
  iban: string;
};

type TxStatus = "done" | "pending" | "rejected";

type FinanceTx = WalletTransaction & {
  status?: TxStatus;
  bankTitle?: string;
};

const MIN_WITHDRAW = 1_000_000;
/** Iranian IBAN: IR + 24 digits */
const IBAN_DIGITS_LEN = 24;

/** Temporary demo data — remove when wiring real API. */
const DEMO_BANKS: BankAccount[] = [
  { id: "b1", title: "حساب ملت — شخصی", iban: "IR12 0170 0000 0012 3456 7890 01" },
  { id: "b2", title: "حساب ملی — کسب‌وکار", iban: "IR34 0170 0000 0098 7654 3210 09" },
];

const DEMO_TX: FinanceTx[] = [
  {
    id: 1,
    type: "credit",
    amount: 5_000_000,
    description: "شارژ کیف پول",
    appName: "زانیار اکانت",
    appSlug: "ACCOUNT",
    createdAt: "۱۴۰۴/۰۴/۲۸ — ۱۰:۱۵",
    status: "done",
  },
  {
    id: 2,
    type: "debit",
    amount: 1_200_000,
    description: "پرداخت اشتراک زانیار",
    appName: "زانیار",
    appSlug: "ZUNYAR",
    createdAt: "۱۴۰۴/۰۴/۲۷ — ۱۸:۴۰",
    status: "done",
  },
  {
    id: 3,
    type: "debit",
    amount: 2_000_000,
    description: "درخواست برداشت به حساب ملت",
    appName: "زانیار اکانت",
    appSlug: "ACCOUNT",
    createdAt: "۱۴۰۴/۰۴/۲۶ — ۱۲:۰۵",
    status: "pending",
    bankTitle: "حساب ملت — شخصی",
  },
  {
    id: 6,
    type: "debit",
    amount: 3_500_000,
    description: "اطلاعات حساب بانکی با نام صاحب حساب مطابقت ندارد",
    appName: "زانیار اکانت",
    appSlug: "ACCOUNT",
    createdAt: "۱۴۰۴/۰۴/۲۴ — ۱۴:۲۰",
    status: "rejected",
    bankTitle: "حساب ملت — شخصی",
  },
  {
    id: 4,
    type: "credit",
    amount: 8_500_000,
    description: "بازگشت وجه دوره زانکو",
    appName: "زانکو",
    appSlug: "ZUNKO",
    createdAt: "۱۴۰۴/۰۴/۲۰ — ۰۹:۳۰",
    status: "done",
  },
  {
    id: 5,
    type: "debit",
    amount: 350_000,
    description: "کارمزد سرویس",
    appName: "زانیار اکانت",
    appSlug: "ACCOUNT",
    createdAt: "۱۴۰۴/۰۴/۱۸ — ۱۶:۱۲",
    status: "done",
  },
];

const DEMO_BALANCE = 12_450_000;

function onlyAsciiDigits(raw: string): string {
  return raw
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d]/g, "");
}

function formatIbanDisplay(iban: string): string {
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

function parseAmount(raw: string): number {
  return raw ? Number(raw) : 0;
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
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletSummary | null>({ balance: DEMO_BALANCE });
  const [transactions, setTransactions] = useState<FinanceTx[]>(DEMO_TX);
  const [banks, setBanks] = useState<BankAccount[]>(DEMO_BANKS);
  const [appFilter, setAppFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [transferOpen, setTransferOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [mode, setMode] = useState<TransferMode>("deposit");
  const [accountId, setAccountId] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [busy, setBusy] = useState(false);

  const [bankTitle, setBankTitle] = useState("");
  /** Digits only (no IR prefix) — max 24 */
  const [bankIbanDigits, setBankIbanDigits] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [w, tx] = await Promise.all([
          api<WalletSummary>("/account/wallet"),
          api<WalletTransaction[]>("/account/transactions"),
        ]);
        if (!active) return;
        // Prefer live data when API returns anything; keep demos if empty
        if (w && typeof w.balance === "number") setWallet(w);
        if (Array.isArray(tx) && tx.length > 0) setTransactions(tx);
      } catch {
        // demo data already set
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (transferOpen && !accountId && banks[0]) setAccountId(banks[0].id);
  }, [transferOpen, accountId, banks]);

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

  const bankOptions = banks.map((b) => ({
    value: b.id,
    label: b.title,
    description: b.iban,
  }));

  const balance = wallet?.balance ?? 0;
  const amount = parseAmount(amountRaw);
  const amountInvalid = amount <= 0;
  const withdrawTooLow = mode === "withdraw" && amount > 0 && amount < MIN_WITHDRAW;
  const withdrawOverBalance = mode === "withdraw" && amount > 0 && amount > balance;
  const noBanks = banks.length === 0;
  const ibanInvalid = bankIbanDigits.length > 0 && bankIbanDigits.length < IBAN_DIGITS_LEN;

  function openTransfer(initial: TransferMode = "deposit") {
    setMode(initial);
    setAmountRaw("");
    setAccountId(banks[0]?.id || "");
    setTransferOpen(true);
  }

  function openBankForm() {
    setBankTitle("");
    setBankIbanDigits("");
    setBankOpen(true);
  }

  function submitBank(e: FormEvent) {
    e.preventDefault();
    const title = bankTitle.trim();
    const digits = onlyAsciiDigits(bankIbanDigits);
    if (!title || digits.length !== IBAN_DIGITS_LEN) {
      toast.error(t("panel.bankInvalid"));
      return;
    }
    const next: BankAccount = {
      id: `b-${Date.now()}`,
      title,
      iban: formatIbanDisplay(`IR${digits}`),
    };
    setBanks((prev) => [...prev, next]);
    setAccountId(next.id);
    setBankOpen(false);
    toast.success(t("panel.bankSaved"));
  }

  function submitTransfer(e: FormEvent) {
    e.preventDefault();
    if (noBanks) {
      toast.error(t("panel.bankRequired"));
      return;
    }
    if (!accountId || amountInvalid) return;
    if (withdrawTooLow) {
      toast.error(t("panel.withdrawMinError", { amount: faNum(MIN_WITHDRAW) }));
      return;
    }
    if (withdrawOverBalance) {
      toast.error(t("panel.withdrawOverBalance"));
      return;
    }

    const bank = banks.find((b) => b.id === accountId);

    if (mode === "deposit") {
      setTransferOpen(false);
      const q = new URLSearchParams({
        amount: String(amount),
        accountId,
        bankTitle: bank?.title || "",
      });
      router.push(`/panel/finance/pay?${q.toString()}`);
      return;
    }

    setBusy(true);
    try {
      const row: FinanceTx = {
        id: Date.now(),
        type: "debit",
        amount,
        description: t("panel.withdrawRequestDesc", { bank: bank?.title || "—" }),
        appName: t("panel.brand"),
        appSlug: "ACCOUNT",
        createdAt: t("panel.justNow"),
        status: "pending",
        bankTitle: bank?.title,
      };
      setTransactions((prev) => [row, ...prev]);
      setTransferOpen(false);
      toast.success(t("panel.withdrawRequested"));
    } finally {
      setBusy(false);
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openTransfer("deposit")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition hover:bg-emerald-600"
            >
              <ArrowDownLeft size={16} />
              {t("panel.transferAction")}
            </button>
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

                  return {
                    key: tx.id,
                    cells: [
                      <span key="d" className="text-[var(--zy-muted)]">
                        {tx.createdAt}
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
                      { label: t("panel.colDate"), value: tx.createdAt },
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
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title={t("panel.transferTitle")}
      >
        <form onSubmit={submitTransfer} className="space-y-4" noValidate>
          <TransferModeSwitch value={mode} onChange={setMode} />

          <label className="block text-sm">
            <span className={fieldLabelClass(amountInvalid && amountRaw.length > 0)}>
              {t("panel.transferAmount")}
            </span>
            <input
              className={fieldInputClass(
                (amountInvalid && amountRaw.length > 0) || withdrawOverBalance,
              )}
              value={amountRaw ? faNum(Number(amountRaw)) : ""}
              onChange={(e) => setAmountRaw(onlyAsciiDigits(e.target.value))}
              inputMode="numeric"
              placeholder={t("panel.transferAmountPlaceholder")}
              dir="ltr"
            />
            {mode === "withdraw" ? (
              <span className="mt-1 block text-[11px] text-[var(--zy-muted)]">
                {t("panel.withdrawMinHint", { amount: faNum(MIN_WITHDRAW) })}
              </span>
            ) : null}
            {withdrawTooLow ? (
              <span className="mt-1 block text-[11px] text-red-500">
                {t("panel.withdrawMinError", { amount: faNum(MIN_WITHDRAW) })}
              </span>
            ) : null}
            {withdrawOverBalance ? (
              <span className="mt-1 block text-[11px] text-red-500">
                {t("panel.withdrawOverBalance")}
              </span>
            ) : null}
          </label>

          <div className="text-sm">
            <span className={fieldLabelClass(noBanks || isBlank(accountId))}>
              {t("panel.bankAccount")}
            </span>
            {noBanks ? (
              <button
                type="button"
                onClick={() => {
                  setTransferOpen(false);
                  openBankForm();
                }}
                className="mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-accent-500/40 px-3 py-3 text-sm font-medium text-accent-700 hover:bg-accent-500/10 dark:text-accent-300"
              >
                <Plus size={16} />
                {t("panel.registerBankFirst")}
              </button>
            ) : (
              <GlassSelect
                value={accountId}
                onChange={setAccountId}
                options={bankOptions}
                placeholder={t("panel.bankSelect")}
                invalid={isBlank(accountId)}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={
              busy ||
              noBanks ||
              amountInvalid ||
              withdrawTooLow ||
              withdrawOverBalance ||
              isBlank(accountId)
            }
            className={`${dialogPrimaryBtnClass} w-full disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === "withdraw"
                ? "!bg-red-500 !shadow-red-500/25 hover:!bg-red-600"
                : "!bg-emerald-500 !shadow-emerald-500/25 hover:!bg-emerald-600"
            }`}
          >
            {busy
              ? t("common.loading")
              : mode === "deposit"
                ? t("panel.goToPayment")
                : t("panel.submitWithdraw")}
          </button>
        </form>
      </GlassDialog>

      <GlassDialog
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        title={t("panel.registerBank")}
      >
        <form onSubmit={submitBank} className="space-y-4" noValidate>
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(bankTitle))}>{t("panel.bankTitle")}</span>
            <input
              className={fieldInputClass(isBlank(bankTitle))}
              value={bankTitle}
              onChange={(e) => setBankTitle(e.target.value)}
              placeholder={t("panel.bankTitlePlaceholder")}
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
              />
            </div>
          </label>
          <button type="submit" className={`${dialogPrimaryBtnClass} w-full`}>
            <Building2 size={16} className="me-1.5 inline" />
            {t("common.save")}
          </button>
        </form>
      </GlassDialog>
    </div>
  );
}
