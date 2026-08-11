"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Cpu,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Server,
  ShieldAlert,
} from "lucide-react";
import clsx from "clsx";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ZunkoLogo } from "@/components/brand/ZunkoLogo";
import { PostgresLogo } from "@/components/brand/PostgresLogo";
import { api } from "@/lib/api";
import { faNum, t } from "@/lib/i18n";
import { formatRelativeTime } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type {
  AppResource,
  DatabaseResource,
  HostResource,
  OrgChildResource,
  OrgResource,
  ServerMonitor,
  ServiceStatus,
} from "@/types/account";

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

/** نمایش رم سرویس همیشه به مگابایت */
function formatMb(bytes?: number | null): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n < 0) return `${faNum(0)} MB`;
  const mb = Math.round((n / (1024 * 1024)) * 10) / 10;
  return `${faNum(mb)} MB`;
}

function formatMhz(value?: number | null): string {
  const n = Number(value || 0);
  if (!n) return "—";
  return `${faNum(Math.round(n))} ${t("admin.mhz")}`;
}

/** بج CPU/RAM/DISK — اندازه یکسان، استثناً چپ‌چین داخل پروژه RTL */
function ResourceChip({ children }: { children: ReactNode }) {
  return (
    <span className="zy-chip inline-flex h-7 items-center !text-xs tabular-nums text-left" dir="ltr">
      {children}
    </span>
  );
}

/** ردیف بج‌های منبع — همیشه LTR و چپ‌چین، بدون اسکرول افقی */
function ResourceChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2 text-left" dir="ltr">
      {children}
    </div>
  );
}

/** بایت برای بج‌های LTR با رقم لاتین (بدون شکستن سطر) */
function formatBytesLtr(bytes?: number | null): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

function formatMbLtr(bytes?: number | null): string {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n < 0) return "0 MB";
  const mb = Math.round((n / (1024 * 1024)) * 10) / 10;
  return `${mb} MB`;
}

function appTitle(app: AppResource): string {
  if (app.labelFa?.trim()) return app.labelFa.trim();
  const key = `admin.app${app.appCode}` as const;
  const translated = t(key);
  return translated === key ? app.appCode : translated;
}

function AppIcon({ app }: { app: AppResource }) {
  if (app.icon?.trim()) {
    return (
      <MonitorIcon
        src={app.icon}
        fallback="/images/org/placeholder.svg"
        alt={appTitle(app)}
        size={52}
      />
    );
  }
  if (app.appCode === "ZUNKO") {
    return <ZunkoLogo height={36} className="max-h-[140%] max-w-[140%] scale-110" />;
  }
  if (app.appCode === "HAREKATDN") {
    return (
      <MonitorIcon
        src="/images/harekatdn.ico"
        fallback="/images/org/placeholder.svg"
        alt={appTitle(app)}
        size={52}
      />
    );
  }
  return <BrandLogo height={28} className="max-h-full max-w-full" />;
}

function MonitorIcon({
  src,
  fallback = "/images/org/placeholder.svg",
  alt,
  size = 28,
}: {
  src?: string | null;
  fallback?: string;
  alt: string;
  size?: number;
}) {
  const [current, setCurrent] = useState(src || fallback);
  useEffect(() => {
    setCurrent(src || fallback);
  }, [src, fallback]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current || fallback}
      alt={alt}
      width={size}
      height={size}
      className="h-full w-full max-h-full max-w-full object-contain"
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}

function OrgChildRow({ child }: { child: OrgChildResource }) {
  const services = child.services || [];
  return (
    <div className="rounded-xl border border-[var(--zy-border)] bg-[var(--zy-bg)]/40 px-3 py-2.5">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-500/10 p-0.5">
          <MonitorIcon src={child.icon} alt={child.labelFa} size={44} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--zy-ink)]">{child.labelFa}</p>
          {child.domain ? (
            <p className="mt-0.5 truncate text-[11px] text-[var(--zy-muted)]" dir="ltr">
              {child.domain}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-2">
        <ResourceChipRow>
          <ResourceChip>
            {t("admin.appDiskUsage")}: {child.pathExists ? formatBytesLtr(child.diskBytes) : "—"}
          </ResourceChip>
          <ResourceChip>
            {t("admin.serviceRam")}:{" "}
            {child.processRamBytes != null ? formatMbLtr(child.processRamBytes) : "—"}
          </ResourceChip>
          <ResourceChip>
            {t("admin.serviceCpu")}:{" "}
            {child.processCpuPercent != null ? `${child.processCpuPercent}%` : "—"}
          </ResourceChip>
        </ResourceChipRow>
      </div>
      <div className="mt-2 space-y-2">
        {services.length ? (
          services.map((svc) => <ServiceBadge key={svc.unit} svc={svc} />)
        ) : (
          <p className="text-[11px] text-[var(--zy-muted)]">{t("admin.noServicesConfigured")}</p>
        )}
      </div>
    </div>
  );
}

function OrgCard({ org, host }: { org: OrgResource; host: HostResource }) {
  const [open, setOpen] = useState(false);
  const children = org.children || [];
  const selfDisk = org.pathExists ? Number(org.diskBytes || 0) : 0;
  const childrenDisk = children.reduce(
    (sum, c) => sum + (c.pathExists ? Number(c.diskBytes || 0) : 0),
    0,
  );
  const totalDisk = selfDisk + childrenDisk;

  const ramParts = [
    org.processRamBytes,
    ...children.map((c) => c.processRamBytes),
  ].filter((v): v is number => v != null && Number.isFinite(v));
  const cpuParts = [
    org.processCpuPercent,
    ...children.map((c) => c.processCpuPercent),
  ].filter((v): v is number => v != null && Number.isFinite(v));
  const totalRam = ramParts.length ? ramParts.reduce((a, b) => a + b, 0) : null;
  const totalCpu = cpuParts.length
    ? Math.round(cpuParts.reduce((a, b) => a + b, 0) * 10) / 10
    : null;

  return (
    <div className="glass-card-static p-1">
      <div className="glass-inner !m-2 space-y-4 !p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--zy-ink)]">{org.labelFa}</h2>
            <p className="mt-0.5 text-[11px] text-[var(--zy-muted)]">{t("admin.orgSharedDbHint")}</p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--zy-muted)]" dir="ltr" title={org.path}>
              {org.pathExists ? org.path : t("admin.pathMissing")}
            </p>
          </div>
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-teal-500/15 p-0.5">
            <MonitorIcon
              src={org.icon || "/images/iHossein.ico"}
              fallback="/images/iHossein.svg"
              alt={org.labelFa}
              size={60}
            />
          </span>
        </div>

        {/* دسکتاپ RTL: مترها سمت راست (۷۰٪)، وضعیت سرویس ihosein سمت چپ (۳۰٪) — بدون آکاردئون */}
        <div className="grid gap-4 border-t border-[var(--zy-border)] pt-3 lg:grid-cols-[7fr_3fr] lg:items-start">
          <div className="min-w-0 space-y-3">
            <HostMeters host={host} tone="sky" />
            <ResourceChipRow>
              <p className="text-sm font-semibold tabular-nums text-[var(--zy-ink)]">
                <span className="font-medium text-[var(--zy-muted)]">{t("admin.orgDiskSelf")}:</span>{" "}
                {org.pathExists ? formatBytesLtr(selfDisk) : t("admin.pathMissing")}
              </p>
              <span className="hidden h-4 w-px shrink-0 self-center bg-[var(--zy-border)] sm:inline-block" aria-hidden />
              <p className="text-sm font-semibold tabular-nums text-[var(--zy-ink)]">
                <span className="font-medium text-[var(--zy-muted)]">{t("admin.orgDiskTotal")}:</span>{" "}
                {formatBytesLtr(totalDisk)}
              </p>
              <span className="hidden h-4 w-px shrink-0 self-center bg-[var(--zy-border)] sm:inline-block" aria-hidden />
              <ResourceChip>
                {t("admin.orgRamTotal")}: {totalRam != null ? formatMbLtr(totalRam) : "—"}
              </ResourceChip>
              <ResourceChip>
                {t("admin.orgCpuTotal")}: {totalCpu != null ? `${totalCpu}%` : "—"}
              </ResourceChip>
            </ResourceChipRow>
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold text-[var(--zy-ink)]">{t("admin.servicesTitle")}</p>
            {(org.services || []).length ? (
              (org.services || []).map((svc) => <ServiceBadge key={svc.unit} svc={svc} />)
            ) : (
              <p className="text-[11px] text-[var(--zy-muted)]">{t("admin.noServicesConfigured")}</p>
            )}
          </div>
        </div>

        {children.length > 0 ? (
          <div className="border-t border-[var(--zy-border)] pt-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--zy-border)] px-3 py-2.5 text-sm font-semibold text-[var(--zy-ink)] transition hover:bg-accent-500/10"
              aria-expanded={open}
            >
              <span>
                {open ? t("admin.orgChildrenHide") : t("admin.orgChildrenToggle")}
                <span className="ms-2 text-[var(--zy-muted)]">({faNum(children.length)})</span>
              </span>
              <ChevronDown
                size={18}
                className={clsx("shrink-0 transition-transform", open && "rotate-180")}
              />
            </button>
            {open ? (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {children.map((child) => (
                  <OrgChildRow key={child.key} child={child} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function serviceStateLabel(svc: ServiceStatus): string {
  if (svc.failed || svc.activeState === "failed" || svc.loadState === "not-found") {
    if (svc.loadState === "not-found" || svc.activeState === "not-found") {
      return t("admin.serviceNotFound");
    }
    return t("admin.serviceFailed");
  }
  if (svc.running || svc.activeState === "active") return t("admin.serviceRunning");
  if (svc.activeState === "activating" || svc.activeState === "reloading") {
    return t("admin.serviceActivating");
  }
  if (svc.activeState === "inactive" || svc.activeState === "deactivating") {
    return t("admin.serviceInactive");
  }
  if (svc.activeState === "unavailable") return t("admin.serviceUnavailable");
  return t("admin.serviceUnknown");
}

function ServiceBadge({ svc }: { svc: ServiceStatus }) {
  const unhealthy = svc.failed || (!svc.running && svc.activeState !== "activating");
  const activating = svc.activeState === "activating" || svc.activeState === "reloading";
  return (
    <div
      className={clsx(
        "rounded-xl border px-3 py-2",
        unhealthy
          ? "border-red-500/35 bg-red-500/10"
          : activating
            ? "border-amber-500/35 bg-amber-500/10"
            : "border-emerald-500/30 bg-emerald-500/10",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--zy-ink)]">
            {svc.labelFa || svc.unit}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--zy-muted)]" dir="ltr" title={svc.unit}>
            {t("admin.serviceUnit", { unit: svc.unit })}
          </p>
          {svc.version ? (
            <p className="mt-1 text-[11px] font-semibold tabular-nums text-accent-700 dark:text-accent-300" dir="ltr">
              {t("admin.serviceVersion", { version: svc.version })}
            </p>
          ) : null}
        </div>
        <span
          className={clsx(
            "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold",
            unhealthy
              ? "bg-red-500/15 text-red-700 dark:text-red-300"
              : activating
                ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          )}
        >
          {unhealthy ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
          {serviceStateLabel(svc)}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[var(--zy-muted)]">
        <span dir="ltr">{svc.activeState}{svc.subState ? `/${svc.subState}` : ""}</span>
        {svc.mainPid != null ? <span>{t("admin.servicePid", { pid: faNum(svc.mainPid) })}</span> : null}
        {svc.unitFileState ? <span dir="ltr">{svc.unitFileState}</span> : null}
      </div>
      {(svc.processRamBytes != null || svc.processCpuPercent != null) && (
        <div className="mt-2">
          <ResourceChipRow>
            {svc.processRamBytes != null ? (
              <ResourceChip>
                {t("admin.serviceRam")}: {formatMbLtr(svc.processRamBytes)}
              </ResourceChip>
            ) : null}
            {svc.processCpuPercent != null ? (
              <ResourceChip>
                {t("admin.serviceCpu")}: {svc.processCpuPercent}%
              </ResourceChip>
            ) : null}
          </ResourceChipRow>
        </div>
      )}
      {svc.lastError ? (
        <div className="mt-2 rounded-lg border border-red-500/20 bg-[var(--zy-bg)]/60 p-2">
          <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
            <AlertTriangle size={12} />
            {t("admin.serviceLastError")}
          </p>
          <pre
            className="max-h-24 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-[var(--zy-muted)]"
            dir="ltr"
          >
            {svc.lastError}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function ServicesBlock({
  title,
  services,
  defaultOpen = false,
}: {
  title: string;
  services?: ServiceStatus[] | null;
  defaultOpen?: boolean;
}) {
  const list = services || [];
  const [open, setOpen] = useState(defaultOpen);
  if (list.length === 0) return null;
  const bad = list.filter((s) => s.failed || (!s.running && s.activeState !== "activating")).length;
  return (
    <div className="border-t border-[var(--zy-border)] pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--zy-border)] px-3 py-2.5 text-start transition hover:bg-accent-500/10"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--zy-ink)]">{title}</p>
          <p
            className={clsx(
              "mt-0.5 text-[10px] font-semibold",
              bad > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {bad > 0
              ? t("admin.servicesUnhealthy", { count: faNum(bad) })
              : t("admin.servicesHealthy")}
            <span className="ms-1 font-medium text-[var(--zy-muted)]">({faNum(list.length)})</span>
          </p>
        </div>
        <ChevronDown
          size={18}
          className={clsx("shrink-0 text-[var(--zy-muted)] transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          {list.map((svc) => (
            <ServiceBadge key={svc.unit} svc={svc} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Meter({
  label,
  percent,
  detail,
  icon,
  tone = "accent",
}: {
  label: string;
  percent: number;
  detail: string;
  icon: ReactNode;
  tone?: "accent" | "orange" | "sky" | "violet";
}) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const bar =
    tone === "orange"
      ? "bg-orange-500"
      : tone === "sky"
        ? "bg-sky-500"
        : tone === "violet"
          ? "bg-violet-500"
          : "bg-accent-500";
  return (
    <div dir="ltr">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--zy-ink)]">
          {icon}
          {label}
        </span>
        <span className="tabular-nums text-[var(--zy-muted)]">{faNum(pct)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--zy-border)]/70">
        <div className={clsx("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-[var(--zy-muted)]">{detail}</p>
    </div>
  );
}

function HostMeters({ host, tone }: { host: HostResource; tone?: "accent" | "orange" | "sky" | "violet" }) {
  return (
    <div className="space-y-3">
      <Meter
        label={t("admin.cpu")}
        percent={host.cpuUsagePercent}
        icon={<Cpu size={14} className="text-accent-600 dark:text-accent-400" />}
        tone={tone}
        detail={`${formatMhz(host.cpuMhz)}${
          host.cpuMaxMhz ? ` / ${formatMhz(host.cpuMaxMhz)}` : ""
        } · ${t("admin.cores", { count: host.cpuCores })}`}
      />
      <Meter
        label={t("admin.ram")}
        percent={host.ramUsagePercent}
        icon={<MemoryStick size={14} className="text-accent-600 dark:text-accent-400" />}
        tone={tone}
        detail={`${t("admin.usedOfTotal", {
          used: formatBytes(host.ramUsedBytes),
          total: formatBytes(host.ramTotalBytes),
        })} · ${t("admin.available", { value: formatBytes(host.ramAvailableBytes) })}`}
      />
      <Meter
        label={t("admin.disk")}
        percent={host.diskUsagePercent}
        icon={<HardDrive size={14} className="text-accent-600 dark:text-accent-400" />}
        tone={tone}
        detail={`${t("admin.usedOfTotal", {
          used: formatBytes(host.diskUsedBytes),
          total: formatBytes(host.diskTotalBytes),
        })} · ${t("admin.available", { value: formatBytes(host.diskFreeBytes) })}`}
      />
    </div>
  );
}

function AppCard({ app, host }: { app: AppResource; host: HostResource }) {
  const tone =
    app.appCode === "ZUNKO"
      ? "orange"
      : app.appCode === "ACCOUNT"
        ? "sky"
        : app.appCode === "HAREKATDN"
          ? "violet"
          : "accent";
  return (
    <div className="glass-card-static p-1">
      <div className="glass-inner !m-2 space-y-4 !p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--zy-ink)]">{appTitle(app)}</h2>
            <p className="mt-0.5 truncate text-[11px] text-[var(--zy-muted)]" dir="ltr" title={app.path}>
              {app.path}
            </p>
          </div>
          <span
            className={clsx(
              "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl p-0.5",
              tone === "orange"
                ? "bg-orange-500/15"
                : tone === "sky"
                  ? "bg-sky-500/15"
                  : tone === "violet"
                    ? "bg-violet-500/15"
                    : "bg-accent-500/10",
            )}
          >
            <AppIcon app={app} />
          </span>
        </div>

        <HostMeters host={host} tone={tone} />

        <ServicesBlock title={t("admin.servicesTitle")} services={app.services} />

        <div className="border-t border-[var(--zy-border)] pt-3">
          <p className="text-sm font-semibold tabular-nums text-[var(--zy-ink)] text-left" dir="ltr">
            <span className="font-medium text-[var(--zy-muted)]">{t("admin.appDiskUsage")}:</span>{" "}
            {app.pathExists ? formatBytesLtr(app.diskBytes) : t("admin.pathMissing")}
          </p>
          {(app.processRamBytes != null || app.processCpuPercent != null) && (
            <div className="mt-2">
              <ResourceChipRow>
                {app.processRamBytes != null ? (
                  <ResourceChip>
                    {t("admin.appProcessRam")}: {formatBytesLtr(app.processRamBytes)}
                  </ResourceChip>
                ) : null}
                {app.processCpuPercent != null ? (
                  <ResourceChip>
                    {t("admin.appProcessCpu")}: {app.processCpuPercent}%
                  </ResourceChip>
                ) : null}
              </ResourceChipRow>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DatabaseDbRow({ db }: { db: DatabaseResource }) {
  const name = db.databaseName || db.labelFa || db.key || "—";
  return (
    <div
      className="rounded-xl border border-[var(--zy-border)] bg-[var(--zy-bg)]/40 px-3 py-2.5 text-left"
      dir="ltr"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-[var(--zy-ink)]" title={name}>
          {name}
        </p>
        <ResourceChip>
          {t("admin.appDiskUsage")}: {db.reachable ? formatBytesLtr(db.databaseBytes) : "—"}
        </ResourceChip>
      </div>
      {db.services?.length ? (
        <div className="mt-2 space-y-2" dir="rtl">
          {db.services.map((svc) => (
            <ServiceBadge key={svc.unit} svc={svc} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DatabaseCard({
  db,
  host,
  extras = [],
}: {
  db: DatabaseResource;
  host: HostResource;
  extras?: DatabaseResource[];
}) {
  const [open, setOpen] = useState(false);
  const title = db.labelFa?.trim() || t("admin.databaseCard");
  const totalDiskBytes = Number(db.allDatabasesBytes ?? db.databaseBytes ?? 0);
  const allDbDiskPct =
    host.diskTotalBytes > 0
      ? Math.round((totalDiskBytes / host.diskTotalBytes) * 1000) / 10
      : 0;
  const processRamPct =
    host.ramTotalBytes > 0 && db.processRamBytes != null
      ? Math.round((Number(db.processRamBytes) / host.ramTotalBytes) * 1000) / 10
      : null;

  return (
    <div className="glass-card-static p-1">
      <div className="glass-inner !m-2 space-y-4 !p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--zy-ink)]">{title}</h2>
            <p className="mt-0.5 text-[11px] text-[var(--zy-muted)]">{t("admin.databaseSharedHint")}</p>
            {db.databaseName ? (
              <p className="mt-0.5 truncate text-[10px] text-[var(--zy-muted)]" dir="ltr" title={db.databaseName}>
                {db.databaseName}
              </p>
            ) : null}
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#336791]/15 p-1">
            <PostgresLogo height={44} />
          </span>
        </div>

        <HostMeters host={host} tone="violet" />

        <ServicesBlock title={t("admin.servicesTitle")} services={db.services} />

        <div className="border-t border-[var(--zy-border)] pt-3 space-y-3">
          {!db.reachable ? (
            <p className="text-sm text-[var(--zy-muted)]">{t("admin.databaseUnreachable")}</p>
          ) : (
            <>
              <p className="text-sm font-semibold tabular-nums text-[var(--zy-ink)] text-left" dir="ltr">
                <span className="font-medium text-[var(--zy-muted)]">{t("admin.databaseSize")}:</span>{" "}
                {formatBytesLtr(totalDiskBytes)}
                {host.diskTotalBytes > 0 ? (
                  <span className="ms-2 text-sm font-semibold text-[var(--zy-muted)]">
                    · {allDbDiskPct}%
                  </span>
                ) : null}
              </p>
              {(db.processCount != null || db.processRamBytes != null || db.processCpuPercent != null) && (
                <ResourceChipRow>
                  {db.processCount != null ? (
                    <ResourceChip>
                      {t("admin.databaseProcesses", { count: db.processCount })}
                    </ResourceChip>
                  ) : null}
                  {db.processRamBytes != null ? (
                    <ResourceChip>
                      {t("admin.databaseProcessRam")}: {formatBytesLtr(db.processRamBytes)}
                      {processRamPct != null ? ` · ${processRamPct}%` : ""}
                    </ResourceChip>
                  ) : null}
                  {db.processCpuPercent != null ? (
                    <ResourceChip>
                      {t("admin.databaseProcessCpu")}: {db.processCpuPercent}%
                    </ResourceChip>
                  ) : null}
                </ResourceChipRow>
              )}
            </>
          )}
        </div>

        {extras.length > 0 ? (
          <div className="border-t border-[var(--zy-border)] pt-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--zy-border)] px-3 py-2.5 text-sm font-semibold text-[var(--zy-ink)] transition hover:bg-accent-500/10"
              aria-expanded={open}
            >
              <span>
                {open ? t("admin.databaseListHide") : t("admin.databaseListToggle")}
                <span className="ms-2 text-[var(--zy-muted)]">({faNum(extras.length)})</span>
              </span>
              <ChevronDown
                size={18}
                className={clsx("shrink-0 transition-transform", open && "rotate-180")}
              />
            </button>
            {open ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-[var(--zy-muted)]">{t("admin.databaseListTitle")}</p>
                {extras.map((extra) => (
                  <DatabaseDbRow
                    key={extra.key || extra.databaseName || extra.labelFa || "extra"}
                    db={extra}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SharedServicesCard({ services }: { services: ServiceStatus[] }) {
  if (!services.length) return null;
  const bad = services.filter(
    (s) => s.failed || (!s.running && s.activeState !== "activating"),
  ).length;
  return (
    <div className="glass-card-static p-1">
      <div className="glass-inner !m-2 space-y-4 !p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--zy-ink)]">{t("admin.sharedServicesTitle")}</h2>
            <p className="mt-0.5 text-[11px] text-[var(--zy-muted)]">
              {bad > 0
                ? t("admin.servicesUnhealthy", { count: faNum(bad) })
                : t("admin.servicesHealthy")}
            </p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-500/15 text-slate-600 dark:text-slate-300">
            <Server size={22} />
          </span>
        </div>

        <div className="space-y-2">
          {services.map((svc) => (
            <ServiceBadge key={svc.unit} svc={svc} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminServerMonitorPage() {
  const [data, setData] = useState<ServerMonitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setBusy(true);
    try {
      const result = await api<ServerMonitor>("/admin/server-monitor");
      setData(result);
    } catch (err) {
      if (!silent) setData(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
            <Server size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.serverMonitor")}</h1>
            <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.serverMonitorHint")}</p>
            {data ? (
              <p className="mt-1 text-xs text-[var(--zy-muted)]">
                {t("admin.hostLabel", { name: data.host.hostname || "—" })}
                {" · "}
                {t("admin.collectedAt", {
                  time: formatRelativeTime(data.collectedAt) || faNum(data.collectedAt),
                })}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          disabled={loading || busy}
          onClick={() => void load(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-sm font-semibold text-accent-700 transition hover:bg-accent-500/10 disabled:opacity-50 dark:text-accent-300"
        >
          <RefreshCw size={16} className={busy ? "animate-spin" : undefined} />
          {t("admin.refreshMonitor")}
        </button>
      </div>

      {loading && !data ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : data ? (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.apps.map((app) => (
              <AppCard key={app.appCode} app={app} host={data.host} />
            ))}
            {data.database ? (
              <DatabaseCard
                db={data.database}
                host={data.host}
                extras={data.extraDatabases || []}
              />
            ) : null}
            {data.sharedServices?.length ? (
              <SharedServicesCard services={data.sharedServices} />
            ) : null}
          </div>
          {(data.organizations || []).length > 0 ? (
            <div className="space-y-4">
              {(data.organizations || []).map((org) => (
                <OrgCard key={org.key} org={org} host={data.host} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
