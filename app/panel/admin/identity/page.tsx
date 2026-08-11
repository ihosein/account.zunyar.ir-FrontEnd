"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, X } from "lucide-react";
import clsx from "clsx";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { api, apiBlob } from "@/lib/api";
import { faNum, t } from "@/lib/i18n";
import {
  dialogPrimaryBtnClass,
  fieldInputClass,
  fieldLabelClass,
  formatRelativeTime,
} from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { AdminIdentityDoc, AdminIdentityList, IdentityDocStatus } from "@/types/account";

const STATUS_FILTERS = [
  { value: "", labelKey: "admin.allStatuses" },
  { value: "PENDING", labelKey: "admin.identityStatusPENDING" },
  { value: "APPROVED", labelKey: "admin.identityStatusAPPROVED" },
  { value: "REJECTED", labelKey: "admin.identityStatusREJECTED" },
] as const;

function formatBirthDate(iso?: string | null) {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  return day ? faNum(day) : "—";
}

function docTypeLabel(type?: string | null) {
  if (!type) return "—";
  const key = `admin.identityDoc${type}` as const;
  const translated = t(key);
  return translated === key ? type : translated;
}

function statusLabel(status?: string | null) {
  if (!status) return "—";
  const key = `admin.identityStatus${status}` as const;
  const translated = t(key);
  return translated === key ? status : translated;
}

function statusChipClass(status: IdentityDocStatus) {
  switch (status) {
    case "PENDING":
      return "!border-amber-500/30 !bg-amber-500/10 !text-amber-700 dark:!text-amber-300";
    case "APPROVED":
      return "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300";
    case "REJECTED":
      return "!border-red-500/30 !bg-red-500/10 !text-red-700 dark:!text-red-300";
    default:
      return "";
  }
}

function fullName(row: AdminIdentityDoc) {
  const n = `${row.firstName || ""} ${row.lastName || ""}`.trim();
  return n || "—";
}

function IdentityImagePreview({ docId, alt }: { docId: number; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(false);
    setSrc(null);
    (async () => {
      try {
        const blob = await apiBlob(`/admin/identity/${docId}/image`);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId]);

  if (loading) {
    return <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>;
  }
  if (error || !src) {
    return <p className="text-sm text-[var(--zy-muted)]">—</p>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className="max-h-[70vh] w-full rounded-xl bg-[var(--zy-surface)] object-contain"
    />
  );
}

export default function AdminIdentityPage() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [items, setItems] = useState<AdminIdentityDoc[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<AdminIdentityDoc | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminIdentityDoc | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const data = await api<AdminIdentityList>(`/admin/identity${query}`);
      setItems(Array.isArray(data.items) ? data.items : []);
      setPendingCount(Number(data.pendingCount) || 0);
    } catch (err) {
      setItems([]);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filterOptions = useMemo(
    () => STATUS_FILTERS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [],
  );

  async function review(id: number, decision: "APPROVED" | "REJECTED", note?: string) {
    setBusyId(id);
    try {
      await api<AdminIdentityDoc>(`/admin/identity/${id}/review`, {
        method: "POST",
        body: JSON.stringify({
          decision,
          reviewNote: note?.trim() || undefined,
        }),
      });
      toast.success(
        decision === "APPROVED" ? t("admin.identityApproved") : t("admin.identityRejected"),
      );
      setRejectTarget(null);
      setRejectNote("");
      setPreview((cur) => (cur?.id === id ? null : cur));
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusyId(null);
    }
  }

  function actionButtons(row: AdminIdentityDoc) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPreview(row)}
          disabled={row.hasImage === false}
          className="text-xs font-semibold text-accent-600 hover:underline disabled:opacity-40 dark:text-accent-400"
        >
          {t("admin.identityViewImage")}
        </button>
        {row.status === "PENDING" && (
          <>
            <button
              type="button"
              disabled={busyId === row.id}
              onClick={() => void review(row.id, "APPROVED")}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-300"
            >
              <Check size={12} />
              {t("admin.identityApprove")}
            </button>
            <button
              type="button"
              disabled={busyId === row.id}
              onClick={() => {
                setRejectNote("");
                setRejectTarget(row);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
            >
              <X size={12} />
              {t("admin.identityReject")}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
            <BadgeCheck size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.identity")}</h1>
            <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.identityHint")}</p>
            <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              {t("admin.identityPendingCount", { count: pendingCount })}
            </p>
          </div>
        </div>
        <div className="w-44">
          <GlassSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={filterOptions}
          />
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("admin.identityEmpty")}</p>
      ) : (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 overflow-hidden !p-0">
            <div className="p-2 md:p-0">
              <ResponsiveRecords
                fitWidth
                columns={[
                  t("admin.colUser"),
                  t("admin.colNationalCode"),
                  t("admin.colFatherName"),
                  t("admin.colBirthDate"),
                  t("admin.colDocType"),
                  t("admin.colStatus"),
                  t("admin.colSubmittedAt"),
                  t("common.actions"),
                ]}
                rows={items.map((row) => {
                  const nameCell = (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--zy-ink)]">{fullName(row)}</p>
                      <p className="truncate text-xs text-[var(--zy-muted)]" dir="ltr">
                        {row.phone || "—"}
                      </p>
                    </div>
                  );
                  const statusChip = (
                    <span className={clsx("zy-chip", statusChipClass(row.status))}>
                      {statusLabel(row.status)}
                    </span>
                  );
                  const actions = actionButtons(row);
                  return {
                    key: row.id,
                    cells: [
                      nameCell,
                      <span key="nc" className="tabular-nums" dir="ltr">
                        {row.nationalCode || "—"}
                      </span>,
                      row.fatherName?.trim() || "—",
                      <span key="bd" className="tabular-nums" dir="ltr">
                        {formatBirthDate(row.birthDate)}
                      </span>,
                      docTypeLabel(row.docType),
                      statusChip,
                      formatRelativeTime(row.createdAt),
                      actions,
                    ],
                    details: [
                      { label: t("admin.colUser"), value: nameCell },
                      {
                        label: t("admin.colNationalCode"),
                        value: row.nationalCode || "—",
                        dir: "ltr" as const,
                      },
                      { label: t("admin.colFatherName"), value: row.fatherName?.trim() || "—" },
                      {
                        label: t("admin.colBirthDate"),
                        value: formatBirthDate(row.birthDate),
                        dir: "ltr" as const,
                      },
                      { label: t("admin.colDocType"), value: docTypeLabel(row.docType) },
                      { label: t("admin.colStatus"), value: statusChip },
                      {
                        label: t("admin.colSubmittedAt"),
                        value: formatRelativeTime(row.createdAt),
                      },
                      ...(row.reviewNote
                        ? [{ label: t("admin.identityRejectNote"), value: row.reviewNote }]
                        : []),
                    ],
                    actions,
                  };
                })}
              />
            </div>
          </div>
        </div>
      )}

      <GlassDialog
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `${docTypeLabel(preview.docType)} — ${fullName(preview)}` : ""}
      >
        {preview && (
          <div className="space-y-4">
            {preview.hasImage !== false ? (
              <IdentityImagePreview docId={preview.id} alt={docTypeLabel(preview.docType)} />
            ) : (
              <p className="text-sm text-[var(--zy-muted)]">—</p>
            )}
            {preview.status === "PENDING" && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === preview.id}
                  onClick={() => void review(preview.id, "APPROVED")}
                  className={dialogPrimaryBtnClass}
                >
                  <BadgeCheck size={16} className="me-1 inline" />
                  {t("admin.identityApprove")}
                </button>
                <button
                  type="button"
                  disabled={busyId === preview.id}
                  onClick={() => {
                    setRejectNote("");
                    setRejectTarget(preview);
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-600"
                >
                  {t("admin.identityReject")}
                </button>
              </div>
            )}
            {preview.reviewNote && (
              <p className="text-sm text-red-600 dark:text-red-400">{preview.reviewNote}</p>
            )}
          </div>
        )}
      </GlassDialog>

      <GlassDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={t("admin.identityRejectTitle")}
      >
        {rejectTarget && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--zy-muted)]">
              {fullName(rejectTarget)} — {docTypeLabel(rejectTarget.docType)}
            </p>
            <label className="block text-sm">
              <span className={fieldLabelClass(false)}>{t("admin.identityRejectNote")}</span>
              <textarea
                className={fieldInputClass(false, "mt-1 min-h-[96px] resize-y")}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                maxLength={1000}
                placeholder={t("admin.identityRejectNoteHint")}
              />
            </label>
            <button
              type="button"
              disabled={busyId === rejectTarget.id}
              onClick={() => void review(rejectTarget.id, "REJECTED", rejectNote)}
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {busyId === rejectTarget.id ? t("common.loading") : t("admin.identityReject")}
            </button>
          </div>
        )}
      </GlassDialog>
    </div>
  );
}
