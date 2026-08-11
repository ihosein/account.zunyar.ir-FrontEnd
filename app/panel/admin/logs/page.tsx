"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { ScrollText, Trash2 } from "lucide-react";
import clsx from "clsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { TablePagination } from "@/components/ui/TablePagination";
import { ZyCheckbox } from "@/components/ui/ZyCheckbox";
import { api } from "@/lib/api";
import { appChipClass } from "@/lib/apps";
import { faNum, t } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type {
  ApplicationLog,
  ApplicationLogPage,
  LogDeleteResult,
  LogLevel,
} from "@/types/account";

const APP_OPTIONS = [
  { value: "", labelKey: "admin.allApps" },
  { value: "ACCOUNT", labelKey: "admin.appACCOUNT" },
  { value: "ZUNYAR", labelKey: "admin.appZUNYAR" },
  { value: "ZUNKO", labelKey: "admin.appZUNKO" },
] as const;

const LEVEL_OPTIONS = [
  { value: "", labelKey: "admin.allLevels" },
  { value: "ERROR", labelKey: "admin.levelERROR" },
  { value: "WARN", labelKey: "admin.levelWARN" },
  { value: "INFO", labelKey: "admin.levelINFO" },
] as const;

function formatBytes(bytes?: number | null): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n < 0) return faNum(0);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${faNum(rounded)} ${units[unit]}`;
}

function appLabel(code?: string | null) {
  if (!code) return "—";
  const key = `admin.app${code}` as const;
  const translated = t(key);
  return translated === key ? code : translated;
}

function appNode(code?: string | null) {
  return <span className={clsx("zy-chip", appChipClass(code))}>{appLabel(code)}</span>;
}

function levelLabel(level?: string | null) {
  if (!level) return "—";
  const key = `admin.level${level}` as const;
  const translated = t(key);
  return translated === key ? level : translated;
}

function levelChipClass(level: string) {
  switch (level as LogLevel) {
    case "ERROR":
      return "!border-red-500/30 !bg-red-500/10 !text-red-600 dark:!text-red-400";
    case "WARN":
      return "!border-amber-500/30 !bg-amber-500/10 !text-amber-700 dark:!text-amber-300";
    case "INFO":
      return "!border-sky-500/30 !bg-sky-500/10 !text-sky-700 dark:!text-sky-300";
    default:
      return "";
  }
}

function truncate(text: string, max = 80) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export default function AdminLogsPage() {
  const [appCode, setAppCode] = useState("");
  const [level, setLevel] = useState("");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ApplicationLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<ApplicationLog | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [selectedConfirm, setSelectedConfirm] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  /** Index of last non-Shift click on this page — Shift+click selects from here to the new row. */
  const selectAnchorIndex = useRef<number | null>(null);

  const hasFilter = Boolean(appCode || level || query);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appCode) params.set("appCode", appCode);
      if (level) params.set("level", level);
      if (query) params.set("q", query);
      params.set("page", String(page));
      params.set("size", String(pageSize));
      const result = await api<ApplicationLogPage>(`/admin/logs?${params.toString()}`);
      setData(result);
    } catch (err) {
      setData(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [appCode, level, query, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelected(new Set());
    selectAnchorIndex.current = null;
  }, [appCode, level, query, page, pageSize]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = searchInput.trim();
      setQuery((prev) => {
        if (prev === next) return prev;
        setPage(0);
        return next;
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const logs = data?.content ?? [];
  const pageIds = useMemo(() => logs.map((log) => log.id), [logs]);
  const selectedCount = selected.size;
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  function toggleAllPage(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) pageIds.forEach((id) => next.add(id));
      else pageIds.forEach((id) => next.delete(id));
      return next;
    });
    selectAnchorIndex.current = checked && pageIds.length > 0 ? 0 : null;
  }

  /** Windows-style: click toggles one row; Shift+click selects inclusive range from last anchor. */
  function handleRowSelectClick(index: number, e: ReactMouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy || index < 0 || index >= pageIds.length) return;

    if (e.shiftKey && selectAnchorIndex.current != null) {
      const from = Math.min(selectAnchorIndex.current, index);
      const to = Math.max(selectAnchorIndex.current, index);
      setSelected((prev) => {
        const next = new Set(prev);
        for (let i = from; i <= to; i++) next.add(pageIds[i]!);
        return next;
      });
      return;
    }

    const id = pageIds[index]!;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    selectAnchorIndex.current = index;
  }

  async function deleteOne() {
    if (deleteId == null) return;
    setBusy(true);
    try {
      const result = await api<LogDeleteResult>(`/admin/logs/${deleteId}`, { method: "DELETE" });
      toast.success(t("admin.logsDeleted", { count: result.deleted }));
      setDeleteId(null);
      if (detail?.id === deleteId) setDetail(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteId);
        return next;
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteFiltered() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (appCode) params.set("appCode", appCode);
      if (level) params.set("level", level);
      const qs = params.toString();
      const result = await api<LogDeleteResult>(`/admin/logs${qs ? `?${qs}` : ""}`, {
        method: "DELETE",
      });
      toast.success(t("admin.logsDeleted", { count: result.deleted }));
      setClearConfirm(false);
      setSelected(new Set());
      setPage(0);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const result = await api<LogDeleteResult>("/admin/logs/delete-by-ids", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      toast.success(t("admin.logsDeleted", { count: result.deleted }));
      setSelectedConfirm(false);
      setSelected(new Set());
      if (detail && ids.includes(detail.id)) setDetail(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const totalPages = Math.max(data?.totalPages ?? 0, 1);
  const totalElements = data?.totalElements ?? 0;

  const selectAllHeader = (
    <ZyCheckbox
      checked={allPageSelected}
      // indeterminate via ref would be nicer; some-selected without all is fine as unchecked+partial UX via aria
      aria-checked={allPageSelected ? "true" : somePageSelected ? "mixed" : "false"}
      aria-label={t("admin.selectAllPage")}
      onChange={(e) => toggleAllPage(e.target.checked)}
      disabled={busy || pageIds.length === 0}
    />
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
            <ScrollText size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.logs")}</h1>
            <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.logsHint")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedCount > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setSelectedConfirm(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
            >
              <Trash2 size={16} />
              {t("admin.deleteSelectedLogs")}
              <span className="tabular-nums">({faNum(selectedCount)})</span>
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy || totalElements === 0}
            onClick={() => setClearConfirm(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
          >
            <Trash2 size={16} />
            {hasFilter ? t("admin.deleteFilteredLogs") : t("admin.deleteAllLogs")}
          </button>
        </div>
      </div>

      <div className="glass-card-static mt-6 p-1">
        <div className="glass-inner !m-2 flex flex-wrap items-end gap-3 !p-4">
          <label className="block min-w-[9rem] flex-1 text-sm sm:max-w-[12rem]">
            <span className="text-[var(--zy-muted)]">{t("admin.filterApp")}</span>
            <GlassSelect
              className="mt-1"
              value={appCode}
              onChange={(v) => {
                setAppCode(v);
                setPage(0);
              }}
              options={APP_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            />
          </label>
          <label className="block min-w-[9rem] flex-1 text-sm sm:max-w-[12rem]">
            <span className="text-[var(--zy-muted)]">{t("admin.filterLevel")}</span>
            <GlassSelect
              className="mt-1"
              value={level}
              onChange={(v) => {
                setLevel(v);
                setPage(0);
              }}
              options={LEVEL_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            />
          </label>
          <label className="block min-w-[12rem] flex-[2] text-sm">
            <span className="text-[var(--zy-muted)]">{t("admin.search")}</span>
            <input
              className="zy-input mt-1 w-full text-sm outline-none"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("admin.logsSearchPlaceholder")}
            />
          </label>
        </div>
      </div>

      {loading && !data ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : logs.length === 0 ? (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <ScrollText size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("admin.emptyLogs")}</p>
          </div>
        </div>
      ) : (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 overflow-hidden !p-0">
            <div className="flex items-center gap-2 border-b border-[var(--zy-border)] px-3 py-2 md:hidden">
              <ZyCheckbox
                checked={allPageSelected}
                aria-label={t("admin.selectAllPage")}
                label={t("admin.selectAllPage")}
                onChange={(e) => toggleAllPage(e.target.checked)}
                disabled={busy}
              />
            </div>
            <div className="p-2 md:p-0">
              <ResponsiveRecords
                fitWidth
                columns={[
                  selectAllHeader,
                  t("admin.colTime"),
                  t("admin.colApp"),
                  t("admin.colLevel"),
                  t("admin.colMessage"),
                  t("admin.colPath"),
                ]}
                columnClassNames={[
                  "w-[2.75rem]",
                  "w-[7rem]",
                  "w-[5.5rem]",
                  "w-[5.5rem]",
                  "w-auto",
                  "w-[7.5rem]",
                ]}
                rows={logs.map((log, index) => {
                  const checked = selected.has(log.id);
                  const checkbox = (
                    <ZyCheckbox
                      checked={checked}
                      aria-label={`${t("admin.selectRow")} ${log.id}`}
                      disabled={busy}
                      onClick={(e) => handleRowSelectClick(index, e)}
                      onChange={() => {
                        /* selection handled in onClick for Shift+range support */
                      }}
                    />
                  );
                  const levelNode = (
                    <span className={clsx("zy-chip", levelChipClass(String(log.level)))}>
                      {levelLabel(String(log.level))}
                    </span>
                  );
                  const timeLabel = formatRelativeTime(log.createdAt) || faNum(log.createdAt);
                  const openDetail = (
                    <button
                      type="button"
                      onClick={() => setDetail(log)}
                      className="cursor-pointer text-start hover:text-accent-600 dark:hover:text-accent-400"
                    >
                      {truncate(log.message)}
                    </button>
                  );
                  return {
                    key: log.id,
                    cells: [
                      checkbox,
                      <span key="t" className="text-[var(--zy-muted)]">
                        {timeLabel}
                      </span>,
                      appNode(String(log.appCode)),
                      levelNode,
                      openDetail,
                      <span key="p" className="text-[var(--zy-muted)]" dir="ltr">
                        {log.path || "—"}
                      </span>,
                    ],
                    details: [
                      { label: t("admin.selectRow"), value: checkbox },
                      { label: t("admin.colTime"), value: timeLabel },
                      { label: t("admin.colApp"), value: appNode(String(log.appCode)) },
                      { label: t("admin.colLevel"), value: levelNode },
                      { label: t("admin.colMessage"), value: openDetail },
                      {
                        label: t("admin.colPath"),
                        value: log.path || "—",
                        dir: "ltr" as const,
                      },
                    ],
                    actions: (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setDetail(log)}
                          className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold text-accent-700 transition hover:bg-accent-500/10 dark:text-accent-300"
                        >
                          {t("admin.logDetail")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setDeleteId(log.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                        >
                          <Trash2 size={14} />
                          {t("common.delete")}
                        </button>
                      </div>
                    ),
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
              aside={t("admin.logsFileSize", { size: formatBytes(data?.totalBytes) })}
              onPageChange={(p) => setPage(Math.max(0, p - 1))}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(0);
              }}
            />
          </div>
        </div>
      )}

      <GlassDialog
        open={!!detail}
        onClose={() => setDetail(null)}
        title={t("admin.logDetail")}
        wide
      >
        {detail ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx("zy-chip", levelChipClass(String(detail.level)))}>
                {levelLabel(String(detail.level))}
              </span>
              <span className={clsx("zy-chip", appChipClass(String(detail.appCode)))}>
                {appLabel(String(detail.appCode))}
              </span>
              {detail.path ? (
                <span className="zy-chip" dir="ltr">
                  {detail.httpMethod ? `${detail.httpMethod} ` : ""}
                  {detail.path}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-[var(--zy-muted)]">
              {formatRelativeTime(detail.createdAt) || faNum(detail.createdAt)}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[var(--zy-ink)]">
              {detail.message}
            </p>
            {detail.stackTrace ? (
              <div>
                <p className="mb-1 text-xs font-medium text-[var(--zy-muted)]">
                  {t("admin.colStack")}
                </p>
                <pre
                  dir="ltr"
                  className="max-h-72 overflow-auto rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/60 p-3 text-start text-[11px] leading-5 text-[var(--zy-ink)]"
                >
                  {detail.stackTrace}
                </pre>
              </div>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeleteId(detail.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
            >
              <Trash2 size={16} />
              {t("admin.deleteLog")}
            </button>
          </div>
        ) : null}
      </GlassDialog>

      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        title={t("admin.deleteLog")}
        message={t("admin.deleteLogConfirm")}
        danger
        busy={busy}
        onConfirm={() => void deleteOne()}
      />

      <ConfirmDialog
        open={selectedConfirm}
        onClose={() => setSelectedConfirm(false)}
        title={t("admin.deleteSelectedLogs")}
        message={t("admin.deleteSelectedConfirm", { count: selectedCount })}
        danger
        busy={busy}
        onConfirm={() => void deleteSelected()}
      />

      <ConfirmDialog
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        title={hasFilter ? t("admin.deleteFilteredLogs") : t("admin.deleteAllLogs")}
        message={
          hasFilter ? t("admin.deleteLogsConfirmFiltered") : t("admin.deleteLogsConfirmAll")
        }
        danger
        busy={busy}
        onConfirm={() => void deleteFiltered()}
      />
    </div>
  );
}
