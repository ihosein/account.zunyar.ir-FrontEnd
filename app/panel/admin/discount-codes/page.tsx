"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import clsx from "clsx";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { TablePagination } from "@/components/ui/TablePagination";
import { ZyCheckbox } from "@/components/ui/ZyCheckbox";
import { api } from "@/lib/api";
import { appChipClass, isZunkoApp } from "@/lib/apps";
import { faNum, t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { AdminDiscountCode } from "@/types/account";

type FormState = {
  code: string;
  appCode: string;
  discountPercent: string;
  active: boolean;
  userId: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  appCode: "ZUNYAR",
  discountPercent: "",
  active: true,
  userId: "",
  note: "",
};

function appLabel(code?: string | null) {
  if (!code) return "—";
  const key = `admin.app${code}` as const;
  const translated = t(key);
  return translated === key ? code : translated;
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

function typeLabel(row: AdminDiscountCode) {
  if (row.userId == null) {
    return t("admin.discountTypePublic");
  }
  const who = [row.userName, row.userPhone].filter(Boolean).join(" · ");
  return who
    ? `${t("admin.discountTypeSpecial")} — ${who}`
    : `${t("admin.discountTypeSpecial")} (#${faNum(row.userId)})`;
}

function parseUserId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export default function AdminDiscountCodesPage() {
  const [rows, setRows] = useState<AdminDiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [appFilter, setAppFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminDiscountCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDiscountCode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appFilter) params.set("appCode", appFilter);
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await api<AdminDiscountCode[]>(`/admin/discount-codes${query}`);
      setRows(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      setRows([]);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [appFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const appOptions = useMemo(
    () => [
      { value: "ZUNYAR", label: t("admin.appZUNYAR") },
      { value: "ZUNKO", label: t("admin.appZUNKO") },
    ],
    [],
  );

  function openCreate() {
    setEditTarget(null);
    setForm({
      ...EMPTY_FORM,
      appCode: appFilter || "ZUNYAR",
    });
    setDialogOpen(true);
  }

  function openEdit(row: AdminDiscountCode) {
    setEditTarget(row);
    setForm({
      code: row.code || "",
      appCode: (row.appCode || "ZUNYAR").toUpperCase(),
      discountPercent: String(row.discountPercent ?? ""),
      active: row.active !== false,
      userId: row.userId != null ? String(row.userId) : "",
      note: row.note || "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    if (busy) return;
    setDialogOpen(false);
    setEditTarget(null);
  }

  async function save() {
    const code = form.code.trim();
    const percent = Number(form.discountPercent);
    if (!code || !form.appCode) {
      toast.error(t("common.error"));
      return;
    }
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      toast.error(t("common.error"));
      return;
    }
    const userId = parseUserId(form.userId);
    if (form.userId.trim() && userId == null) {
      toast.error(t("common.error"));
      return;
    }

    const body = {
      code,
      appCode: form.appCode,
      discountPercent: percent,
      active: form.active,
      userId,
      note: form.note.trim() || null,
    };

    setBusy(true);
    try {
      if (editTarget) {
        await api<AdminDiscountCode>(`/admin/discount-codes/${editTarget.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success(t("admin.discountCodeSaved"));
      } else {
        await api<AdminDiscountCode>("/admin/discount-codes", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success(t("admin.discountCodeCreated"));
      }
      setDialogOpen(false);
      setEditTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api(`/admin/discount-codes/${deleteTarget.id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success(t("admin.discountCodeDeleted"));
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
            <Tag size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.discountCodes")}</h1>
            <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.discountCodesHint")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            onClick={openCreate}
            className={clsx(dialogPrimaryBtnClass, "inline-flex items-center gap-1.5 !px-3 !py-2")}
          >
            <Plus size={16} />
            {t("common.add")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("admin.discountCodesEmpty")}</p>
      ) : (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 overflow-hidden !p-0">
            <div className="p-2 md:p-0">
              <ResponsiveRecords
                fitWidth
                columns={[
                  t("admin.colDiscountCode"),
                  t("admin.colApp"),
                  t("admin.colDiscountPercent"),
                  t("admin.colType"),
                  t("admin.colStatus"),
                  t("admin.colNote"),
                  t("common.actions"),
                ]}
                columnClassNames={[
                  "w-[7rem]",
                  "w-[5rem]",
                  "w-[5rem]",
                  "w-[10rem]",
                  "w-[5rem]",
                  "w-[8rem]",
                  "w-[7rem]",
                ]}
                rows={pageRows.map((row) => {
                  const statusChip = row.active ? (
                    <span className="zy-chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300">
                      {t("admin.active")}
                    </span>
                  ) : (
                    <span className="zy-chip !border-red-500/30 !bg-red-500/10 !text-red-600 dark:!text-red-400">
                      {t("admin.inactive")}
                    </span>
                  );
                  const typeCell = (
                    <span className="text-sm text-[var(--zy-ink)]">{typeLabel(row)}</span>
                  );
                  const actions = (
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-accent-600 hover:bg-accent-500/10 dark:text-accent-400"
                      >
                        <Pencil size={14} />
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        <Trash2 size={14} />
                        {t("common.delete")}
                      </button>
                    </div>
                  );
                  return {
                    key: row.id,
                    cells: [
                      <span key="c" dir="ltr" className="font-mono text-xs font-semibold">
                        {row.code}
                      </span>,
                      appNode(row.appCode),
                      <span key="d" className="tabular-nums">
                        {faNum(row.discountPercent)}٪
                      </span>,
                      typeCell,
                      statusChip,
                      <span key="n" className="truncate text-sm text-[var(--zy-muted)]">
                        {row.note?.trim() || "—"}
                      </span>,
                      actions,
                    ],
                    details: [
                      { label: t("admin.colDiscountCode"), value: row.code, dir: "ltr" as const },
                      { label: t("admin.colApp"), value: appNode(row.appCode) },
                      {
                        label: t("admin.colDiscountPercent"),
                        value: `${faNum(row.discountPercent)}٪`,
                      },
                      { label: t("admin.colType"), value: typeCell },
                      { label: t("admin.colStatus"), value: statusChip },
                      { label: t("admin.colNote"), value: row.note?.trim() || "—" },
                    ],
                    actions,
                  };
                })}
              />
            </div>
            <TablePagination
              page={safePage}
              pageCount={pageCount}
              total={rows.length}
              pageSize={pageSize}
              disabled={loading}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      <GlassDialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editTarget ? t("admin.discountCodeEdit") : t("admin.discountCodeCreate")}
      >
        <div className="space-y-4">
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.colDiscountCode")}</label>
            <input
              className={fieldInputClass(false)}
              dir="ltr"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              maxLength={32}
            />
          </div>
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.colApp")}</label>
            <GlassSelect
              value={form.appCode}
              onChange={(v) => setForm((f) => ({ ...f, appCode: v }))}
              options={appOptions}
            />
          </div>
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.colDiscountPercent")}</label>
            <input
              className={fieldInputClass(false)}
              inputMode="decimal"
              value={form.discountPercent}
              onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
            />
          </div>
          <ZyCheckbox
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            label={t("admin.active")}
          />
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.discountUserId")}</label>
            <input
              className={fieldInputClass(false)}
              inputMode="numeric"
              dir="ltr"
              value={form.userId}
              onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
              placeholder={t("common.optional")}
            />
            <p className="mt-1 text-xs text-[var(--zy-muted)]">{t("admin.discountUserIdHint")}</p>
          </div>
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.discountNote")}</label>
            <input
              className={fieldInputClass(false)}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              maxLength={255}
              placeholder={t("common.optional")}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className={clsx(dialogPrimaryBtnClass, "w-full disabled:opacity-50")}
          >
            {busy ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </GlassDialog>

      <GlassDialog
        open={!!deleteTarget}
        onClose={() => !busy && setDeleteTarget(null)}
        title={t("common.delete")}
      >
        {deleteTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--zy-muted)]">
              {t("admin.discountCodeDeleteConfirm")}
              <span className="mt-1 block font-mono font-semibold text-[var(--zy-ink)]" dir="ltr">
                {deleteTarget.code}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
                className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-[var(--zy-border)] px-4 py-2.5 text-sm font-semibold text-[var(--zy-ink)] disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmDelete()}
                className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? t("common.loading") : t("common.delete")}
              </button>
            </div>
          </div>
        ) : null}
      </GlassDialog>
    </div>
  );
}
