"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import clsx from "clsx";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { TablePagination } from "@/components/ui/TablePagination";
import { api } from "@/lib/api";
import { appChipClass } from "@/lib/apps";
import { faNum, t } from "@/lib/i18n";
import { formatMoney, formatRelativeTime } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type {
  AdminPaymentOrder,
  AdminPaymentOrderPage,
  PaymentPurpose,
  PaymentStatus,
} from "@/types/account";

const APP_OPTIONS = [
  { value: "", labelKey: "admin.allApps" },
  { value: "ZUNYAR", labelKey: "admin.appZUNYAR" },
  { value: "ZUNKO", labelKey: "admin.appZUNKO" },
  { value: "ACCOUNT", labelKey: "admin.appACCOUNT" },
] as const;

const PURPOSE_BY_APP: Record<string, { value: PaymentPurpose; labelKey: string }[]> = {
  "": [
    { value: "PANEL_PURCHASE", labelKey: "admin.purposePANEL_PURCHASE" },
    { value: "PANEL_PLAN_UPDATE", labelKey: "admin.purposePANEL_PLAN_UPDATE" },
    { value: "COURSE_PURCHASE", labelKey: "admin.purposeCOURSE_PURCHASE" },
  ],
  ZUNYAR: [
    { value: "PANEL_PURCHASE", labelKey: "admin.purposePANEL_PURCHASE" },
    { value: "PANEL_PLAN_UPDATE", labelKey: "admin.purposePANEL_PLAN_UPDATE" },
  ],
  ZUNKO: [
    { value: "PANEL_PURCHASE", labelKey: "admin.purposePANEL_PURCHASE" },
    { value: "COURSE_PURCHASE", labelKey: "admin.purposeCOURSE_PURCHASE" },
  ],
  ACCOUNT: [{ value: "WALLET_DEPOSIT", labelKey: "admin.purposeWALLET_DEPOSIT" }],
};

const STATUS_OPTIONS = [
  { value: "", labelKey: "admin.allStatuses" },
  { value: "PAID", labelKey: "admin.statusPAID" },
  { value: "PENDING", labelKey: "admin.statusPENDING" },
  { value: "FAILED", labelKey: "admin.statusFAILED" },
  { value: "CANCELLED", labelKey: "admin.statusCANCELLED" },
  { value: "REFUNDED", labelKey: "admin.statusREFUNDED" },
] as const;

function appLabel(code?: string | null) {
  if (!code) return "—";
  const key = `admin.app${code}` as const;
  const translated = t(key);
  return translated === key ? code : translated;
}

function appNode(code?: string | null) {
  return <span className={clsx("zy-chip", appChipClass(code))}>{appLabel(code)}</span>;
}

function purposeLabel(purpose?: string | null) {
  if (!purpose) return "—";
  const key = `admin.purpose${purpose}` as const;
  const translated = t(key);
  return translated === key ? purpose : translated;
}

function statusLabel(status?: string | null) {
  if (!status) return "—";
  const key = `admin.status${status}` as const;
  const translated = t(key);
  return translated === key ? status : translated;
}

function statusChipClass(status: string) {
  switch (status as PaymentStatus) {
    case "PAID":
      return "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300";
    case "PENDING":
      return "!border-amber-500/30 !bg-amber-500/10 !text-amber-700 dark:!text-amber-300";
    case "FAILED":
    case "CANCELLED":
      return "!border-red-500/30 !bg-red-500/10 !text-red-700 dark:!text-red-300";
    case "REFUNDED":
      return "!border-sky-500/30 !bg-sky-500/10 !text-sky-700 dark:!text-sky-300";
    default:
      return "";
  }
}

function amountNumber(value: AdminPaymentOrder["amount"]) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function AdminPaymentsPage() {
  const [appCode, setAppCode] = useState("");
  const [purpose, setPurpose] = useState("");
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AdminPaymentOrderPage | null>(null);
  const [loading, setLoading] = useState(true);

  const purposeOptions = useMemo(() => {
    const list = PURPOSE_BY_APP[appCode] ?? PURPOSE_BY_APP[""]!;
    return [
      { value: "", label: t("admin.allPurposes") },
      ...list.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    ];
  }, [appCode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(searchInput.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (purpose && !purposeOptions.some((o) => o.value === purpose)) {
      setPurpose("");
    }
  }, [purpose, purposeOptions]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appCode) params.set("appCode", appCode);
      if (purpose) params.set("purpose", purpose);
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("size", String(pageSize));
      const result = await api<AdminPaymentOrderPage>(`/admin/payments?${params.toString()}`);
      setData(result);
    } catch (err) {
      setData(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [appCode, purpose, status, q, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = data?.content ?? [];
  const totalPages = Math.max(data?.totalPages ?? 0, 1);
  const totalElements = data?.totalElements ?? 0;

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
          <Wallet size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.payments")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.paymentsHint")}</p>
        </div>
      </div>

      <div className="glass-card-static mt-6 p-1">
        <div className="glass-inner !m-2 flex flex-wrap items-end gap-3 !p-4">
          <label className="block min-w-[14rem] flex-[2] text-sm">
            <span className="text-[var(--zy-muted)]">{t("admin.search")}</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("admin.searchPaymentsPlaceholder")}
              className="mt-1 w-full rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)] px-3 py-2.5 text-sm text-[var(--zy-ink)] outline-none transition focus:border-accent-500/50"
            />
          </label>
          <label className="block min-w-[9rem] flex-1 text-sm sm:max-w-[11rem]">
            <span className="text-[var(--zy-muted)]">{t("admin.filterApp")}</span>
            <GlassSelect
              className="mt-1"
              value={appCode}
              onChange={(v) => {
                setAppCode(v);
                setPurpose("");
                setPage(0);
              }}
              options={APP_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            />
          </label>
          <label className="block min-w-[9rem] flex-1 text-sm sm:max-w-[12rem]">
            <span className="text-[var(--zy-muted)]">{t("admin.filterPurpose")}</span>
            <GlassSelect
              className="mt-1"
              value={purpose}
              onChange={(v) => {
                setPurpose(v);
                setPage(0);
              }}
              options={purposeOptions}
            />
          </label>
          <label className="block min-w-[8rem] flex-1 text-sm sm:max-w-[10rem]">
            <span className="text-[var(--zy-muted)]">{t("admin.filterStatus")}</span>
            <GlassSelect
              className="mt-1"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(0);
              }}
              options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            />
          </label>
          {data ? (
            <p className="ms-auto text-xs text-[var(--zy-muted)]">
              {t("admin.totalPayments", { count: data.totalElements })}
            </p>
          ) : null}
        </div>
      </div>

      {loading && !data ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Wallet size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("admin.emptyPayments")}</p>
          </div>
        </div>
      ) : (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 overflow-hidden !p-0">
            <div className="p-2 md:p-0">
              <ResponsiveRecords
                fitWidth
                columns={[
                  t("admin.colPanel"),
                  t("admin.colManager"),
                  t("admin.colAmount"),
                  t("admin.colPurpose"),
                  t("admin.colProduct"),
                  t("admin.colApp"),
                  t("admin.colStatus"),
                  t("admin.colCreated"),
                ]}
                columnClassNames={[
                  "w-auto",
                  "w-[8rem]",
                  "w-[7rem]",
                  "w-[7rem]",
                  "w-[8rem]",
                  "w-[5.5rem]",
                  "w-[6.5rem]",
                  "w-[5.5rem]",
                ]}
                rows={rows.map((row) => {
                  const manager = (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--zy-ink)]">
                        {row.managerName || "—"}
                      </p>
                      {row.managerPhone ? (
                        <p className="truncate text-xs text-[var(--zy-muted)]" dir="ltr">
                          {faNum(row.managerPhone)}
                        </p>
                      ) : null}
                    </div>
                  );
                  const purposeNode = (
                    <span className="zy-chip !whitespace-nowrap">{purposeLabel(row.purpose)}</span>
                  );
                  const statusNode = (
                    <span className={clsx("zy-chip", statusChipClass(String(row.status)))}>
                      {statusLabel(String(row.status))}
                    </span>
                  );
                  const when = formatRelativeTime(row.createdAt) || faNum(row.createdAt);
                  const amount = formatMoney(amountNumber(row.amount));
                  const product = row.productLabel || row.planCode || row.description || "—";
                  return {
                    key: row.id,
                    cells: [
                      <div key="p" className="min-w-0">
                        <p className="truncate font-medium">{row.panelName || "—"}</p>
                        {row.panelCode ? (
                          <p className="truncate font-mono text-[11px] text-[var(--zy-muted)]" dir="ltr">
                            {row.panelCode}
                          </p>
                        ) : null}
                      </div>,
                      manager,
                      <span key="a" className="font-semibold tabular-nums">
                        {amount}
                      </span>,
                      purposeNode,
                      <span key="pr" className="text-sm text-[var(--zy-muted)]">
                        {product}
                      </span>,
                      appNode(row.appCode ? String(row.appCode) : null),
                      statusNode,
                      <span key="t" className="text-[var(--zy-muted)]">
                        {when}
                      </span>,
                    ],
                    details: [
                      { label: t("admin.colPanel"), value: row.panelName || "—" },
                      { label: t("admin.colManager"), value: manager },
                      { label: t("admin.colAmount"), value: amount },
                      { label: t("admin.colPurpose"), value: purposeNode },
                      { label: t("admin.colProduct"), value: product },
                      {
                        label: t("admin.colApp"),
                        value: appNode(row.appCode ? String(row.appCode) : null),
                      },
                      { label: t("admin.colStatus"), value: statusNode },
                      { label: t("admin.colCreated"), value: when },
                      {
                        label: t("admin.colPayer"),
                        value: [row.payerName, row.payerPhone].filter(Boolean).join(" · ") || "—",
                      },
                    ],
                  };
                })}
              />
            </div>
            <TablePagination
              page={page + 1}
              pageCount={totalPages}
              total={totalElements}
              pageSize={pageSize}
              disabled={loading}
              onPageChange={(p) => setPage(Math.max(0, p - 1))}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(0);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
