"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Handshake, Pencil } from "lucide-react";
import clsx from "clsx";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { ZyCheckbox } from "@/components/ui/ZyCheckbox";
import { api } from "@/lib/api";
import { appChipClass, isZunkoApp } from "@/lib/apps";
import { faNum, t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { AdminAffiliatePartner } from "@/types/account";

/** داده نمونه برای پیش‌نمایش ظاهر وقتی هنوز همکاری ثبت نشده. */
const DEMO_PARTNERS: AdminAffiliatePartner[] = [
  {
    codeId: -1,
    userId: -1,
    firstName: "سارا",
    lastName: "محمدی",
    phone: "09121234567",
    appCode: "ZUNYAR",
    appNameFa: "زانیار",
    code: "ZY-DEMO01",
    customerDiscountPercent: 10,
    affiliateCommissionPercent: 15,
    programDiscountPercent: 5,
    programCommissionPercent: 10,
    active: true,
    conversionCount: 12,
    createdAt: "2026-05-01T10:00:00Z",
  },
  {
    codeId: -2,
    userId: -2,
    firstName: "علی",
    lastName: "رضایی",
    phone: "09129876543",
    appCode: "ZUNKO",
    appNameFa: "زانکو",
    code: "ZK-DEMO02",
    customerDiscountPercent: 8,
    affiliateCommissionPercent: 20,
    programDiscountPercent: 5,
    programCommissionPercent: 12,
    active: true,
    conversionCount: 7,
    createdAt: "2026-06-12T14:30:00Z",
  },
  {
    codeId: -3,
    userId: -3,
    firstName: "نگار",
    lastName: "حسینی",
    phone: "09351234567",
    appCode: "ZUNYAR",
    appNameFa: "زانیار",
    code: "ZY-DEMO03",
    customerDiscountPercent: 5,
    affiliateCommissionPercent: 12,
    programDiscountPercent: 5,
    programCommissionPercent: 10,
    active: false,
    conversionCount: 3,
    createdAt: "2026-07-01T09:15:00Z",
  },
  {
    codeId: -4,
    userId: -4,
    firstName: "حسین",
    lastName: "کاظمی",
    phone: "09123334455",
    appCode: "ZUNKO",
    appNameFa: "زانکو",
    code: "ZK-SALE44",
    customerDiscountPercent: 12,
    affiliateCommissionPercent: 18,
    programDiscountPercent: 5,
    programCommissionPercent: 12,
    active: true,
    conversionCount: 21,
    createdAt: "2026-04-20T11:00:00Z",
  },
];

type EditForm = {
  code: string;
  customerDiscountPercent: string;
  affiliateCommissionPercent: string;
  active: boolean;
};

function appLabel(code?: string | null) {
  if (!code) return "—";
  const key = `admin.app${code}` as const;
  const translated = t(key);
  return translated === key ? code : translated;
}

function fullName(row: AdminAffiliatePartner) {
  const n = `${row.firstName || ""} ${row.lastName || ""}`.trim();
  return n || "—";
}

function appNode(code?: string | null) {
  return (
    <span
      className={clsx(
        "zy-chip !text-[11px]",
        isZunkoApp(code) ? appChipClass("ZUNKO") : appChipClass("ZUNYAR"),
      )}
    >
      {appLabel(code)}
    </span>
  );
}

export default function AdminAffiliatesPage() {
  const [rows, setRows] = useState<AdminAffiliatePartner[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appFilter, setAppFilter] = useState("");
  const [editTarget, setEditTarget] = useState<AdminAffiliatePartner | null>(null);
  const [form, setForm] = useState<EditForm>({
    code: "",
    customerDiscountPercent: "",
    affiliateCommissionPercent: "",
    active: true,
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<AdminAffiliatePartner[]>("/admin/affiliates");
      if (Array.isArray(data) && data.length > 0) {
        setRows(data);
        setDemoMode(false);
      } else {
        setRows(DEMO_PARTNERS);
        setDemoMode(true);
      }
    } catch {
      setRows(DEMO_PARTNERS);
      setDemoMode(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (!appFilter) return rows;
    return rows.filter((r) => (r.appCode || "").toUpperCase() === appFilter);
  }, [rows, appFilter]);

  function openEdit(row: AdminAffiliatePartner) {
    setEditTarget(row);
    setForm({
      code: row.code || "",
      customerDiscountPercent: String(row.customerDiscountPercent ?? ""),
      affiliateCommissionPercent: String(row.affiliateCommissionPercent ?? ""),
      active: row.active !== false,
    });
  }

  async function saveEdit() {
    if (!editTarget) return;
    if (demoMode || editTarget.codeId < 0) {
      setRows((prev) =>
        prev.map((r) =>
          r.codeId === editTarget.codeId
            ? {
                ...r,
                code: form.code.trim().toUpperCase(),
                customerDiscountPercent: Number(form.customerDiscountPercent) || 0,
                affiliateCommissionPercent: Number(form.affiliateCommissionPercent) || 0,
                active: form.active,
              }
            : r,
        ),
      );
      setEditTarget(null);
      toast.success(t("admin.affiliateDemoSaved"));
      return;
    }
    setBusy(true);
    try {
      const updated = await api<AdminAffiliatePartner>(`/admin/affiliates/${editTarget.codeId}`, {
        method: "PUT",
        body: JSON.stringify({
          code: form.code.trim(),
          customerDiscountPercent: Number(form.customerDiscountPercent),
          affiliateCommissionPercent: Number(form.affiliateCommissionPercent),
          active: form.active,
        }),
      });
      setRows((prev) => prev.map((r) => (r.codeId === updated.codeId ? updated : r)));
      setEditTarget(null);
      toast.success(t("admin.affiliateSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
            <Handshake size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.affiliates")}</h1>
            <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.affiliatesHint")}</p>
          </div>
        </div>
        <div className="w-44">
          <GlassSelect
            value={appFilter}
            onChange={setAppFilter}
            options={[
              { value: "", label: t("admin.allApps") },
              { value: "ZUNYAR", label: t("admin.appZUNYAR") },
              { value: "ZUNKO", label: t("admin.appZUNKO") },
            ]}
          />
        </div>
      </div>

      {demoMode ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          {t("admin.affiliatesDemoBanner")}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : visible.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("admin.affiliatesEmpty")}</p>
      ) : (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 overflow-hidden !p-0">
            <div className="p-2 md:p-0">
              <ResponsiveRecords
                fitWidth
                columns={[
                  t("admin.colAffiliate"),
                  t("admin.colApp"),
                  t("admin.colDiscountCode"),
                  t("admin.colCustomerDiscount"),
                  t("admin.colCommission"),
                  t("admin.colConversions"),
                  t("admin.colStatus"),
                  t("common.actions"),
                ]}
                columnClassNames={[
                  "w-[9rem]",
                  "w-[5rem]",
                  "w-[7rem]",
                  "w-[5rem]",
                  "w-[5rem]",
                  "w-[4.5rem]",
                  "w-[5rem]",
                  "w-[5rem]",
                ]}
                rows={visible.map((row) => {
                  const nameCell = (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--zy-ink)]">{fullName(row)}</p>
                      <p className="truncate text-xs text-[var(--zy-muted)]" dir="ltr">
                        {row.phone || "—"}
                      </p>
                    </div>
                  );
                  const statusChip = row.active ? (
                    <span className="zy-chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300">
                      {t("admin.active")}
                    </span>
                  ) : (
                    <span className="zy-chip !border-red-500/30 !bg-red-500/10 !text-red-600 dark:!text-red-400">
                      {t("admin.inactive")}
                    </span>
                  );
                  const editBtn = (
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent-600 hover:bg-accent-500/10 dark:text-accent-400"
                    >
                      <Pencil size={14} />
                      {t("common.edit")}
                    </button>
                  );
                  return {
                    key: row.codeId,
                    cells: [
                      nameCell,
                      appNode(row.appCode),
                      <span key="c" dir="ltr" className="font-mono text-xs font-semibold">
                        {row.code}
                      </span>,
                      <span key="d" className="tabular-nums">
                        {faNum(row.customerDiscountPercent)}٪
                      </span>,
                      <span key="m" className="tabular-nums">
                        {faNum(row.affiliateCommissionPercent)}٪
                      </span>,
                      <span key="cv" className="tabular-nums">
                        {faNum(row.conversionCount)}
                      </span>,
                      statusChip,
                      editBtn,
                    ],
                    details: [
                      { label: t("admin.colAffiliate"), value: nameCell },
                      { label: t("admin.colApp"), value: appNode(row.appCode) },
                      { label: t("admin.colDiscountCode"), value: row.code, dir: "ltr" as const },
                      {
                        label: t("admin.colCustomerDiscount"),
                        value: `${faNum(row.customerDiscountPercent)}٪`,
                      },
                      {
                        label: t("admin.colCommission"),
                        value: `${faNum(row.affiliateCommissionPercent)}٪`,
                      },
                      {
                        label: t("admin.colConversions"),
                        value: faNum(row.conversionCount),
                      },
                      { label: t("admin.colStatus"), value: statusChip },
                    ],
                    actions: editBtn,
                  };
                })}
              />
            </div>
          </div>
        </div>
      )}

      <GlassDialog
        open={!!editTarget}
        onClose={() => !busy && setEditTarget(null)}
        title={t("admin.affiliateEditTitle")}
      >
        {editTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--zy-muted)]">
              {fullName(editTarget)} · {appLabel(editTarget.appCode)}
            </p>
            <div>
              <label className={fieldLabelClass}>{t("admin.colDiscountCode")}</label>
              <input
                className={fieldInputClass}
                dir="ltr"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClass}>{t("admin.colCustomerDiscount")}</label>
                <input
                  className={fieldInputClass}
                  inputMode="decimal"
                  value={form.customerDiscountPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerDiscountPercent: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={fieldLabelClass}>{t("admin.colCommission")}</label>
                <input
                  className={fieldInputClass}
                  inputMode="decimal"
                  value={form.affiliateCommissionPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, affiliateCommissionPercent: e.target.value }))
                  }
                />
              </div>
            </div>
            <ZyCheckbox
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              label={t("admin.active")}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveEdit()}
              className={clsx(dialogPrimaryBtnClass, "w-full disabled:opacity-50")}
            >
              {t("common.save")}
            </button>
          </div>
        ) : null}
      </GlassDialog>
    </div>
  );
}
