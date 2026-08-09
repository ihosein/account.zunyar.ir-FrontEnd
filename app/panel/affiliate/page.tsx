"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Handshake, Loader2 } from "lucide-react";
import clsx from "clsx";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { api } from "@/lib/api";
import { faNum, t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, formatMoney } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type {
  AffiliateCommissionStatus,
  AffiliateConversion,
  AffiliateDashboard,
} from "@/types/account";

function statusLabel(status: AffiliateCommissionStatus): string {
  return t(`panel.affiliateStatus${status}`);
}

function statusChipClass(status: AffiliateCommissionStatus): string {
  switch (status) {
    case "SETTLED":
      return "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400";
    case "UNDER_REVIEW":
      return "!border-amber-500/35 !bg-amber-500/10 !text-amber-700 dark:!text-amber-300";
    case "QUEUED":
      return "!border-sky-500/30 !bg-sky-500/10 !text-sky-700 dark:!text-sky-300";
    case "REJECTED":
    case "ERROR":
      return "!border-red-500/30 !bg-red-500/10 !text-red-600 dark:!text-red-400";
    default:
      return "";
  }
}

function customerCell(row: AffiliateConversion) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-[var(--zy-ink)]">{row.customerName}</p>
      {row.customerOrgName ? (
        <p className="truncate text-xs text-[var(--zy-muted)]">{row.customerOrgName}</p>
      ) : null}
      {row.customerPhone ? (
        <p className="mt-0.5 truncate text-xs tabular-nums text-[var(--zy-muted)]" dir="ltr">
          {faNum(row.customerPhone)}
        </p>
      ) : null}
    </div>
  );
}

export default function AffiliatePage() {
  const [data, setData] = useState<AffiliateDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [project, setProject] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const dashboard = await api<AffiliateDashboard>("/affiliate");
      setData(dashboard);
      setProject((prev) => {
        if (prev) return prev;
        const firstWithout = dashboard.programs.find((p) => !p.hasCode);
        return (firstWithout ?? dashboard.programs[0])?.appCode ?? "";
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const projectOptions = useMemo(
    () =>
      (data?.programs ?? []).map((p) => ({
        value: p.appCode,
        label: p.nameFa,
        description: p.hasCode
          ? p.myCode || undefined
          : `${t("panel.affiliateDiscount")} ${faNum(p.customerDiscountPercent)}٪ · ${t("panel.affiliateCommission")} ${faNum(p.affiliateCommissionPercent)}٪`,
      })),
    [data?.programs],
  );

  const selectedProgram = data?.programs.find((p) => p.appCode === project);

  async function claimCode() {
    if (!project) {
      toast.error(t("panel.affiliateSelectProjectPlaceholder"));
      return;
    }
    setClaiming(true);
    try {
      await api("/affiliate/codes", {
        method: "POST",
        body: JSON.stringify({ appCode: project }),
      });
      toast.success(t("panel.affiliateCodeIssued"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setClaiming(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(t("panel.affiliateCodeCopied"));
      window.setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1800);
    } catch {
      toast.error(t("common.error"));
    }
  }

  const conversions = data?.conversions ?? [];

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
          <Handshake size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.affiliate")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.affiliateHint")}</p>
        </div>
      </div>

      {loading && !data ? (
        <div className="mt-10 flex justify-center text-[var(--zy-muted)]">
          <Loader2 className="animate-spin" size={28} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="glass-card-static p-4">
              <p className="text-xs text-[var(--zy-muted)]">{t("panel.affiliateTotalEarned")}</p>
              <p className="mt-1 text-lg font-bold text-[var(--zy-ink)]">
                {formatMoney(data?.totalCommission)}
              </p>
            </div>
            <div className="glass-card-static p-4">
              <p className="text-xs text-[var(--zy-muted)]">{t("panel.affiliateSettled")}</p>
              <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatMoney(data?.settledCommission)}
              </p>
            </div>
            <div className="glass-card-static p-4">
              <p className="text-xs text-[var(--zy-muted)]">{t("panel.affiliatePending")}</p>
              <p className="mt-1 text-lg font-bold text-amber-600 dark:text-amber-300">
                {formatMoney(data?.pendingCommission)}
              </p>
            </div>
          </div>

          <div className="glass-card-static mt-6 p-4 md:p-5">
            <h2 className="text-sm font-semibold text-[var(--zy-ink)]">{t("panel.affiliateGetCode")}</h2>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="text-xs text-[var(--zy-muted)]">
                  {t("panel.affiliateSelectProject")}
                </label>
                <GlassSelect
                  className="mt-1"
                  value={project}
                  onChange={setProject}
                  options={projectOptions}
                  placeholder={t("panel.affiliateSelectProjectPlaceholder")}
                />
              </div>
              <button
                type="button"
                disabled={claiming || !project || selectedProgram?.hasCode}
                onClick={() => void claimCode()}
                className={clsx(dialogPrimaryBtnClass, "shrink-0 disabled:opacity-50")}
              >
                {claiming ? <Loader2 size={16} className="animate-spin" /> : null}
                {selectedProgram?.hasCode
                  ? selectedProgram.myCode
                  : t("panel.affiliateGetCode")}
              </button>
            </div>
            {selectedProgram?.hasCode && selectedProgram.myCode ? (
              <p className="mt-2 text-xs text-[var(--zy-muted)]">
                {t("panel.affiliateDiscount")} {faNum(selectedProgram.customerDiscountPercent)}٪ ·{" "}
                {t("panel.affiliateCommission")}{" "}
                {faNum(selectedProgram.affiliateCommissionPercent)}٪
              </p>
            ) : null}
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold text-[var(--zy-ink)]">{t("panel.affiliateMyCodes")}</h2>
            {(data?.codes?.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-[var(--zy-muted)]">{t("panel.affiliateNoCodes")}</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {data!.codes.map((c) => (
                  <div
                    key={c.id}
                    className="glass-card-static flex items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--zy-ink)]">{c.appNameFa}</p>
                      <p className="mt-1 font-mono text-base tracking-wide text-accent-700 dark:text-accent-300" dir="ltr">
                        {c.code}
                      </p>
                      <p className="mt-1 text-xs text-[var(--zy-muted)]">
                        {t("panel.affiliateDiscount")} {faNum(c.customerDiscountPercent)}٪ ·{" "}
                        {t("panel.affiliateCommission")} {faNum(c.affiliateCommissionPercent)}٪
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void copyCode(c.code)}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-xs font-medium text-[var(--zy-ink)] transition hover:bg-accent-500/10"
                    >
                      {copiedCode === c.code ? <Check size={14} /> : <Copy size={14} />}
                      {t("panel.affiliateCopyCode")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-[var(--zy-ink)]">
              {t("panel.affiliateConversions")}
              {data?.conversionCount ? (
                <span className="ms-2 text-[var(--zy-muted)]">({faNum(data.conversionCount)})</span>
              ) : null}
            </h2>

            {conversions.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--zy-muted)]">{t("panel.affiliateEmpty")}</p>
            ) : (
              <div className="glass-card-static mt-3 p-1">
                <div className="glass-inner !m-1 !p-2 md:!p-0">
                  <ResponsiveRecords
                    fitWidth
                    columns={[
                      t("panel.affiliateColCustomer"),
                      t("panel.affiliateColRegistered"),
                      t("panel.affiliateColPaid"),
                      t("panel.affiliateColPercent"),
                      t("panel.affiliateColStatus"),
                    ]}
                    columnClassNames={["w-[28%]", "w-[14%]", "w-[20%]", "w-[14%]", "w-[24%]"]}
                    rows={conversions.map((row) => ({
                      key: row.id,
                      cells: [
                        customerCell(row),
                        <span key="n" className="tabular-nums">
                          {faNum(row.registeredCount)}
                        </span>,
                        <span key="paid" className="tabular-nums">
                          {formatMoney(row.amountPaid)}
                        </span>,
                        <span key="pct" className="tabular-nums">
                          {faNum(row.commissionPercent)}٪
                          <span className="mt-0.5 block text-xs text-[var(--zy-muted)]">
                            {formatMoney(row.commissionAmount)}
                          </span>
                        </span>,
                        <span
                          key="st"
                          className={clsx("zy-chip", statusChipClass(row.status))}
                        >
                          {statusLabel(row.status)}
                        </span>,
                      ],
                      details: [
                        { label: t("panel.affiliateColCustomer"), value: customerCell(row) },
                        {
                          label: t("panel.affiliateColProject"),
                          value: row.appNameFa,
                        },
                        {
                          label: t("panel.affiliateColRegistered"),
                          value: faNum(row.registeredCount),
                        },
                        {
                          label: t("panel.affiliateColPaid"),
                          value: formatMoney(row.amountPaid),
                        },
                        {
                          label: t("panel.affiliateColPercent"),
                          value: `${faNum(row.commissionPercent)}٪ (${formatMoney(row.commissionAmount)})`,
                        },
                        {
                          label: t("panel.affiliateColStatus"),
                          value: (
                            <span className={clsx("zy-chip", statusChipClass(row.status))}>
                              {statusLabel(row.status)}
                            </span>
                          ),
                        },
                      ],
                    }))}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
