"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import clsx from "clsx";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { api } from "@/lib/api";
import { faNum, t } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { ApplicationLog, ApplicationLogPage, LogLevel } from "@/types/account";

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

const SIZE_OPTIONS = [
  { value: "20", label: faNum(20) },
  { value: "50", label: faNum(50) },
  { value: "100", label: faNum(100) },
];

function appLabel(code?: string | null) {
  if (!code) return "—";
  const key = `admin.app${code}` as const;
  const translated = t(key);
  return translated === key ? code : translated;
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
  const [size, setSize] = useState("20");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ApplicationLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ApplicationLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appCode) params.set("appCode", appCode);
      if (level) params.set("level", level);
      params.set("page", String(page));
      params.set("size", size);
      const result = await api<ApplicationLogPage>(`/admin/logs?${params.toString()}`);
      setData(result);
    } catch (err) {
      setData(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [appCode, level, page, size]);

  useEffect(() => {
    void load();
  }, [load]);

  const logs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const canPrev = page > 0;
  const canNext = totalPages > 0 && page < totalPages - 1;

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
          <ScrollText size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.logs")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.logsHint")}</p>
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
          <label className="block min-w-[7rem] flex-1 text-sm sm:max-w-[9rem]">
            <span className="text-[var(--zy-muted)]">{t("admin.pageSize")}</span>
            <GlassSelect
              className="mt-1"
              value={size}
              onChange={(v) => {
                setSize(v);
                setPage(0);
              }}
              options={SIZE_OPTIONS}
            />
          </label>
          {data ? (
            <p className="ms-auto text-xs text-[var(--zy-muted)]">
              {t("admin.totalLogs", { count: data.totalElements })}
            </p>
          ) : null}
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
          <div className="glass-inner !m-2 !p-2 md:!p-0">
            <ResponsiveRecords
              fitWidth
              columns={[
                t("admin.colTime"),
                t("admin.colApp"),
                t("admin.colLevel"),
                t("admin.colMessage"),
                t("admin.colPath"),
              ]}
              columnClassNames={[
                "w-[7.5rem]",
                "w-[5.5rem]",
                "w-[5.5rem]",
                "w-auto",
                "w-[8rem]",
              ]}
              rows={logs.map((log) => {
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
                    <span key="t" className="text-[var(--zy-muted)]">
                      {timeLabel}
                    </span>,
                    appLabel(String(log.appCode)),
                    levelNode,
                    openDetail,
                    <span key="p" className="text-[var(--zy-muted)]" dir="ltr">
                      {log.path || "—"}
                    </span>,
                  ],
                  details: [
                    { label: t("admin.colTime"), value: timeLabel },
                    { label: t("admin.colApp"), value: appLabel(String(log.appCode)) },
                    { label: t("admin.colLevel"), value: levelNode },
                    { label: t("admin.colMessage"), value: openDetail },
                    {
                      label: t("admin.colPath"),
                      value: log.path || "—",
                      dir: "ltr" as const,
                    },
                  ],
                  actions: (
                    <button
                      type="button"
                      onClick={() => setDetail(log)}
                      className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold text-accent-700 transition hover:bg-accent-500/10 dark:text-accent-300"
                    >
                      {t("admin.logDetail")}
                    </button>
                  ),
                };
              })}
            />
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={!canPrev || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-sm font-medium text-[var(--zy-ink)] transition hover:bg-accent-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={16} />
            {t("admin.prevPage")}
          </button>
          <p className="text-xs text-[var(--zy-muted)]">
            {t("admin.pageOf", { page: page + 1, total: totalPages })}
          </p>
          <button
            type="button"
            disabled={!canNext || loading}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-sm font-medium text-[var(--zy-ink)] transition hover:bg-accent-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("admin.nextPage")}
            <ChevronLeft size={16} />
          </button>
        </div>
      ) : null}

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
              <span className="zy-chip">{appLabel(String(detail.appCode))}</span>
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
          </div>
        ) : null}
      </GlassDialog>
    </div>
  );
}
