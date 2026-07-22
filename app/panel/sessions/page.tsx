"use client";

import { useEffect, useState } from "react";
import { Laptop, LogOut, Radio, ShieldOff, Smartphone } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { api } from "@/lib/api";
import { isProductAppCode } from "@/lib/apps";
import { t, faNum } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { formatRelativeTime } from "@/lib/ui";
import type { AppSession } from "@/types/account";

type RawSession = {
  id: number;
  appCode?: string;
  appName?: string;
  deviceLabel?: string;
  ipAddress?: string;
  userAgent?: string;
  lastSeenAt?: string;
  active?: boolean;
  current?: boolean;
};

type RawApp = { code: string; name?: string; nameFa?: string };

function mapSession(raw: RawSession): AppSession {
  return {
    id: raw.id,
    appCode: raw.appCode,
    appName: raw.appName,
    device: raw.deviceLabel || "دستگاه ناشناس",
    ip: raw.ipAddress,
    userAgent: raw.userAgent,
    lastActiveAt: raw.lastSeenAt || "",
    active: raw.active,
    current: raw.current,
  };
}

function DeviceIcon({ device }: { device: string }) {
  const isMobile = /mobile|android|iphone|ios/i.test(device);
  return isMobile ? <Smartphone size={18} /> : <Laptop size={18} />;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<AppSession[]>([]);
  const [appOptions, setAppOptions] = useState<{ value: string; label: string }[]>([]);
  const [appFilter, setAppFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [revokeId, setRevokeId] = useState<number | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load(filter: string) {
    setLoading(true);
    try {
      const query = filter ? `?appCode=${encodeURIComponent(filter)}` : "";
      const data = await api<RawSession[]>(`/sessions${query}`);
      setSessions(data.map(mapSession));
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(appFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appFilter]);

  useEffect(() => {
    (async () => {
      try {
        const apps = await api<RawApp[]>("/sessions/apps");
        const order = ["ACCOUNT", "ZUNYAR", "ZUNKO"];
        const mapped = apps
          .filter((a) => a.code === "ACCOUNT" || isProductAppCode(a.code))
          .map((a) => ({ value: a.code, label: a.name || a.nameFa || a.code }));
        mapped.sort(
          (a, b) =>
            order.indexOf(a.value.toUpperCase()) - order.indexOf(b.value.toUpperCase()),
        );
        setAppOptions(mapped);
      } catch {
        setAppOptions([]);
      }
    })();
  }, []);

  async function revoke(id: number) {
    setBusy(true);
    try {
      await api(`/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setRevokeId(null);
      toast.success(t("common.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function revokeAll() {
    setBusy(true);
    try {
      await api("/sessions/revoke-all", { method: "POST" });
      setSessions([]);
      setRevokeAllOpen(false);
      toast.success(t("common.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.sessions")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.sessionsHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => setRevokeAllOpen(true)}
          disabled={sessions.length === 0}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
        >
          <ShieldOff size={16} />
          <span className="whitespace-nowrap">{t("panel.revokeAllSessions")}</span>
        </button>
      </div>

      <div className="glass-card-static mt-6 p-1">
        <div className="glass-inner !m-2 flex flex-wrap items-center gap-3 !p-4">
          <span className="text-sm font-medium text-[var(--zy-muted)]">{t("panel.filterByApp")}</span>
          <div className="w-full sm:w-56">
            <GlassSelect
              value={appFilter}
              onChange={setAppFilter}
              placeholder={t("panel.allApps")}
              options={[{ value: "", label: t("panel.allApps") }, ...appOptions]}
            />
          </div>
        </div>
      </div>

      {!loading && sessions.length === 0 ? (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Radio size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.sessionsEmpty")}</p>
          </div>
        </div>
      ) : (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 !p-2 md:!p-0">
            <ResponsiveRecords
              columns={[
                t("panel.colApp"),
                t("panel.colDevice"),
                t("panel.colIp"),
                t("panel.colLastActive"),
                t("panel.colStatus"),
                t("panel.colActions"),
              ]}
              rows={sessions.map((session) => {
                const statusNode = session.current ? (
                  <span className="zy-chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400">
                    {t("panel.sessionCurrent")}
                  </span>
                ) : session.active === false ? (
                  <span className="zy-chip !border-red-500/30 !bg-red-500/10 !text-red-600 dark:!text-red-400">
                    {t("panel.sessionInactive")}
                  </span>
                ) : (
                  <span className="zy-chip !border-accent-500/30 !bg-accent-500/10 !text-accent-600 dark:!text-accent-400">
                    {t("panel.sessionActive")}
                  </span>
                );

                const deviceNode = (
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/12 text-accent-600 dark:text-accent-400">
                      <DeviceIcon device={session.device} />
                    </span>
                    {session.device}
                  </span>
                );

                const revokeBtn = (
                  <button
                    type="button"
                    onClick={() => setRevokeId(session.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
                  >
                    <LogOut size={13} />
                    {t("panel.revokeSession")}
                  </button>
                );

                return {
                  key: session.id,
                  cells: [
                    session.appName || "—",
                    deviceNode,
                    <span key="ip" className="text-[var(--zy-muted)]" dir="ltr">
                      {session.ip || "—"}
                    </span>,
                    <span key="last" className="text-[var(--zy-muted)]">
                      {formatRelativeTime(session.lastActiveAt) || faNum(session.lastActiveAt)}
                    </span>,
                    statusNode,
                    revokeBtn,
                  ],
                  details: [
                    { label: t("panel.colApp"), value: session.appName || "—" },
                    { label: t("panel.colDevice"), value: deviceNode },
                    { label: t("panel.colIp"), value: session.ip || "—", dir: "ltr" },
                    {
                      label: t("panel.colLastActive"),
                      value: formatRelativeTime(session.lastActiveAt) || faNum(session.lastActiveAt),
                    },
                    { label: t("panel.colStatus"), value: statusNode },
                  ],
                  actions: revokeBtn,
                };
              })}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={revokeId != null}
        onClose={() => setRevokeId(null)}
        onConfirm={() => revokeId != null && void revoke(revokeId)}
        title={t("panel.revokeConfirmTitle")}
        message={t("panel.revokeConfirmMsg")}
        confirmLabel={t("panel.revokeSession")}
        danger
        busy={busy}
      />

      <ConfirmDialog
        open={revokeAllOpen}
        onClose={() => setRevokeAllOpen(false)}
        onConfirm={() => void revokeAll()}
        title={t("panel.revokeAllConfirmTitle")}
        message={t("panel.revokeAllConfirmMsg")}
        confirmLabel={t("panel.revokeAllSessions")}
        danger
        busy={busy}
      />
    </div>
  );
}
