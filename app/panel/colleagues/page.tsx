"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  MessageSquare,
  Pencil,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { InputOTP } from "@/components/ui/InputOTP";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { api } from "@/lib/api";
import { isProductAppCode } from "@/lib/apps";
import { getOtpCooldownRemaining, startOtpCooldown } from "@/lib/otp-cooldown";
import { t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { Colleague } from "@/types/account";

const ROLE_OPTIONS = [
  { value: "teacher", label: "مدرس" },
  { value: "assistant", label: "دستیار" },
  { value: "admin", label: "مدیر پنل" },
  { value: "accountant", label: "حسابدار" },
  { value: "coworker", label: "همکار" },
];

type ManagedPanel = {
  id: string;
  panelId?: number;
  appSlug: string;
  appName: string;
  panelName: string;
};

type AssignForm = {
  panelId: string;
  role: string;
};

const EMPTY_ASSIGN: AssignForm = { panelId: "", role: "" };

const ACTION_BTN_CLASS =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent-600 hover:bg-accent-500/10 dark:text-accent-400";

const DANGER_BTN_CLASS =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10";

const APP_NAME: Record<string, string> = {
  ZUNYAR: "زانیار",
  ZUNKO: "زانکو",
  ACCOUNT: "زانیار اکانت",
};

function roleLabel(code: string) {
  return ROLE_OPTIONS.find((r) => r.value === code)?.label ?? code;
}

function splitName(full?: string | null): { firstName: string; lastName: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "—", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

type ApiColleagueLink = {
  id: number;
  managerPhone?: string;
  managerName?: string;
  memberPhone?: string;
  memberName?: string;
  appCode?: string;
  panelId?: number;
  tenantName?: string;
  roleCode?: string;
  roleLabelFa?: string;
  status?: string;
};

function mapLink(link: ApiColleagueLink, relation: "manager" | "employee"): Colleague {
  const name =
    relation === "manager"
      ? splitName(link.memberName)
      : splitName(link.managerName);
  const appSlug = (link.appCode || "").toUpperCase();
  return {
    id: link.id,
    firstName: name.firstName,
    lastName: name.lastName,
    phone: (relation === "manager" ? link.memberPhone : link.managerPhone) || "",
    appSlug,
    appName: APP_NAME[appSlug] || appSlug,
    panelName: link.tenantName || "—",
    role: link.roleLabelFa || roleLabel(link.roleCode || "") || "—",
    relation,
  };
}

export default function ColleaguesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Colleague[]>([]);
  const [managedPanels, setManagedPanels] = useState<ManagedPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editTarget, setEditTarget] = useState<Colleague | null>(null);
  const [assignForm, setAssignForm] = useState<AssignForm>(EMPTY_ASSIGN);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const [roleTarget, setRoleTarget] = useState<Colleague | null>(null);
  const [roleValue, setRoleValue] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<Colleague | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [data, apps] = await Promise.all([
          api<{ asManager?: ApiColleagueLink[]; asEmployee?: ApiColleagueLink[] }>("/colleagues"),
          api<
            Array<{
              code: string;
              nameFa?: string;
              memberships?: Array<{
                membershipId: number;
                tenantName?: string;
                roleLabelFa?: string;
                roleCode?: string;
                panelId?: number;
              }>;
            }>
          >("/apps/connected").catch(() => []),
        ]);
        if (!active) return;
        const mapped: Colleague[] = [
          ...(data.asManager || []).map((l) => mapLink(l, "manager")),
          ...(data.asEmployee || []).map((l) => mapLink(l, "employee")),
        ];
        setRows(mapped);

        const panels: ManagedPanel[] = [];
        for (const app of apps || []) {
          const code = (app.code || "").toUpperCase();
          if (!isProductAppCode(code)) continue;
          for (const m of app.memberships || []) {
            const label = m.roleLabelFa?.trim();
            const role = m.roleCode?.trim().toUpperCase();
            const isManager =
              label === "مدیر" ||
              role === "MANAGER" ||
              role === "ADMIN" ||
              role === "OWNER";
            if (!isManager) continue;
            const panelName = m.tenantName || "—";
            panels.push({
              id: String(m.panelId ?? m.membershipId),
              panelId: m.panelId,
              appSlug: code,
              appName: APP_NAME[code] || app.nameFa || code,
              panelName,
            });
          }
        }
        setManagedPanels(panels);
      } catch {
        if (active) {
          setRows([]);
          setManagedPanels([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!otpOpen || !editTarget) return;
    setCooldown(getOtpCooldownRemaining(editTarget.phone));
    const id = window.setInterval(() => {
      setCooldown(getOtpCooldownRemaining(editTarget.phone));
    }, 500);
    return () => window.clearInterval(id);
  }, [otpOpen, editTarget]);

  const visibleRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          isProductAppCode(r.appSlug) ||
          r.appName === "زانیار" ||
          r.appName === "زانکو",
      ),
    [rows],
  );

  const managedByMe = useMemo(
    () => visibleRows.filter((r) => r.relation === "manager"),
    [visibleRows],
  );
  const myManagers = useMemo(
    () => visibleRows.filter((r) => r.relation === "employee"),
    [visibleRows],
  );

  /** Panels I manage that this person is not already on. */
  const assignablePanels = useMemo(() => {
    if (!editTarget) return [];
    const already = new Set(
      rows
        .filter(
          (r) =>
            r.relation === "manager" &&
            r.phone === editTarget.phone &&
            isProductAppCode(r.appSlug),
        )
        .map((r) => `${r.appSlug}::${r.panelName}`),
    );
    return managedPanels
      .filter((p) => !already.has(`${p.appSlug}::${p.panelName}`))
      .map((p) => ({
        value: p.id,
        label: `${p.appName} · ${p.panelName}`,
      }));
  }, [editTarget, rows, managedPanels]);

  function openMessage(row: Colleague) {
    const name = `${row.firstName} ${row.lastName}`;
    const params = new URLSearchParams({
      colleague: name,
      relatedId: String(row.id),
    });
    router.push(`/panel/support?${params.toString()}`);
  }

  function openEdit(row: Colleague) {
    setEditTarget(row);
    setAssignForm(EMPTY_ASSIGN);
  }

  async function startAssignConfirm() {
    if (!editTarget || !assignForm.panelId || !assignForm.role) return;
    setBusy(true);
    try {
      if (getOtpCooldownRemaining(editTarget.phone) <= 0) {
        await api("/colleagues/request-otp", {
          method: "POST",
          body: JSON.stringify({ phone: editTarget.phone }),
        });
        startOtpCooldown(editTarget.phone);
      }
      setOtp("");
      setOtpOpen(true);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmAssignWithOtp() {
    if (!editTarget || otp.length !== 5) return;
    const panel = managedPanels.find((p) => p.id === assignForm.panelId);
    if (!panel) return;
    setBusy(true);
    try {
      const created = await api<ApiColleagueLink>("/colleagues", {
        method: "POST",
        body: JSON.stringify({
          phone: editTarget.phone,
          appCode: panel.appSlug,
          panelId: panel.panelId ?? null,
          roleCode: assignForm.role,
          roleLabelFa: roleLabel(assignForm.role),
          otp,
        }),
      });
      setRows((prev) => [mapLink(created, "manager"), ...prev]);
      setOtpOpen(false);
      setEditTarget(null);
      setAssignForm(EMPTY_ASSIGN);
      toast.success(t("panel.settingsSaved"));
    } catch {
      toast.error(t("auth.otpWrong"));
    } finally {
      setBusy(false);
    }
  }

  async function saveRole() {
    if (!roleTarget || !roleValue) return;
    setBusy(true);
    try {
      await api(`/colleagues/${roleTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          roleCode: roleValue,
          roleLabelFa: roleLabel(roleValue),
        }),
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === roleTarget.id ? { ...r, role: roleLabel(roleValue) } : r,
        ),
      );
      setRoleTarget(null);
      toast.success(t("panel.settingsSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      await api(`/colleagues/${revokeTarget.id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.id !== revokeTarget.id));
      setRevokeTarget(null);
      toast.success(t("common.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function rowActions(row: Colleague, iManage: boolean) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {row.resumeSlug ? (
          <Link
            href={`/${row.resumeSlug}`}
            target="_blank"
            className={ACTION_BTN_CLASS}
            title={t("panel.viewResume")}
          >
            <Eye size={14} />
            <span className="md:hidden">{t("panel.viewResume")}</span>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => openMessage(row)}
          className={ACTION_BTN_CLASS}
          title={t("panel.sendMessage")}
        >
          <MessageSquare size={14} />
          <span className="md:hidden">{t("panel.sendMessage")}</span>
        </button>
        {iManage ? (
          <>
            <button
              type="button"
              onClick={() => openEdit(row)}
              className={ACTION_BTN_CLASS}
              title={t("panel.editColleague")}
            >
              <Pencil size={14} />
              <span className="md:hidden">{t("panel.editColleague")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleTarget(row);
                setRoleValue(ROLE_OPTIONS.find((o) => o.label === row.role)?.value || "coworker");
              }}
              className={ACTION_BTN_CLASS}
              title={t("panel.roleChange")}
            >
              <UserCog size={14} />
              <span className="md:hidden">{t("panel.roleChange")}</span>
            </button>
            <button
              type="button"
              onClick={() => setRevokeTarget(row)}
              className={DANGER_BTN_CLASS}
              title={t("panel.roleRevoke")}
            >
              <Trash2 size={14} />
              <span className="md:hidden">{t("panel.roleRevoke")}</span>
            </button>
          </>
        ) : null}
      </div>
    );
  }

  function colleagueTableRows(list: Colleague[], iManage: boolean) {
    return list.map((row) => {
      const nameNode = (
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-xs font-bold text-accent-600 dark:text-accent-400">
            {row.firstName.charAt(0)}
            {row.lastName.charAt(0)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-[var(--zy-ink)]">
              {row.firstName} {row.lastName}
            </span>
            <span
              className="mt-0.5 block truncate text-[11px] text-[var(--zy-muted)]"
              dir="ltr"
            >
              {row.phone}
            </span>
          </span>
        </span>
      );

      const roleNode = row.role ? <span className="zy-chip">{row.role}</span> : "—";
      const actions = rowActions(row, iManage);

      return {
        key: row.id,
        cells: [
          nameNode,
          <span key="app" className="break-words">
            {row.appName}
          </span>,
          <span key="panel" className="break-words">
            {row.panelName}
          </span>,
          roleNode,
          actions,
        ],
        details: [
          { label: t("panel.colName"), value: `${row.firstName} ${row.lastName}` },
          { label: t("panel.colPhone"), value: row.phone, dir: "ltr" as const },
          { label: t("panel.colApp"), value: row.appName },
          { label: t("panel.colPanel"), value: row.panelName },
          { label: t("panel.colRole"), value: roleNode },
        ],
        actions,
      };
    });
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.colleagues")}</h1>
        <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.colleaguesHint")}</p>
      </div>

      {!loading && visibleRows.length === 0 ? (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Users size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.colleaguesEmpty")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {managedByMe.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-[var(--zy-ink)]">
                {t("panel.colleaguesIManage")}
              </h2>
              <div className="glass-card-static p-1">
                <div className="glass-inner !m-1 !p-2 md:!p-0">
                  <ResponsiveRecords
                    fitWidth
                    columnClassNames={[
                      "w-[22%]",
                      "w-[14%]",
                      "w-[20%]",
                      "w-[14%]",
                      "w-[30%]",
                    ]}
                    columns={[
                      t("panel.colName"),
                      t("panel.colApp"),
                      t("panel.colPanel"),
                      t("panel.colRole"),
                      t("panel.colActions"),
                    ]}
                    rows={colleagueTableRows(managedByMe, true)}
                  />
                </div>
              </div>
            </section>
          )}
          {myManagers.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold text-[var(--zy-ink)]">
                {t("panel.myManagers")}
              </h2>
              <div className="glass-card-static p-1">
                <div className="glass-inner !m-1 !p-2 md:!p-0">
                  <ResponsiveRecords
                    fitWidth
                    columnClassNames={[
                      "w-[22%]",
                      "w-[14%]",
                      "w-[20%]",
                      "w-[14%]",
                      "w-[30%]",
                    ]}
                    columns={[
                      t("panel.colName"),
                      t("panel.colApp"),
                      t("panel.colPanel"),
                      t("panel.colRole"),
                      t("panel.colActions"),
                    ]}
                    rows={colleagueTableRows(myManagers, false)}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Assign to another managed panel */}
      <GlassDialog
        open={!!editTarget && !otpOpen}
        onClose={() => setEditTarget(null)}
        title={t("panel.editColleague")}
      >
        {editTarget && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--zy-muted)]">
              {editTarget.firstName} {editTarget.lastName} · {editTarget.phone}
            </p>
            <p className="text-xs text-[var(--zy-muted)]">{t("panel.assignPanelHint")}</p>
            {assignablePanels.length === 0 ? (
              <p className="rounded-xl border border-[var(--zy-border)] px-3 py-3 text-sm text-[var(--zy-muted)]">
                {t("panel.noManagedPanelsLeft")}
              </p>
            ) : (
              <>
                <label className="block text-sm">
                  <span className={fieldLabelClass(isBlank(assignForm.panelId))}>
                    {t("panel.selectPanel")}
                  </span>
                  <GlassSelect
                    value={assignForm.panelId}
                    onChange={(v) => setAssignForm((f) => ({ ...f, panelId: v }))}
                    placeholder={t("panel.selectPanel")}
                    options={assignablePanels}
                    invalid={isBlank(assignForm.panelId)}
                  />
                </label>
                <label className="block text-sm">
                  <span className={fieldLabelClass(isBlank(assignForm.role))}>
                    {t("panel.selectRole")}
                  </span>
                  <GlassSelect
                    value={assignForm.role}
                    onChange={(v) => setAssignForm((f) => ({ ...f, role: v }))}
                    placeholder={t("panel.selectRole")}
                    options={ROLE_OPTIONS}
                    invalid={isBlank(assignForm.role)}
                  />
                </label>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={busy || !assignForm.panelId || !assignForm.role}
                    className={`${dialogPrimaryBtnClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    onClick={() => void startAssignConfirm()}
                  >
                    {t("panel.confirmWithOtp")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </GlassDialog>

      <GlassDialog open={otpOpen} onClose={() => setOtpOpen(false)} title={t("panel.confirmWithOtp")}>
        <div className="space-y-4">
          <p className="text-center text-sm text-[var(--zy-muted)]">{t("panel.otpConfirmHint")}</p>
          <InputOTP
            value={otp}
            onChange={setOtp}
            length={5}
            autoFocus
            disabled={busy}
            invalid={otp.length < 5}
          />
          <button
            type="button"
            disabled={cooldown > 0 || busy || !editTarget}
            onClick={() => {
              if (!editTarget) return;
              startOtpCooldown(editTarget.phone);
              setCooldown(getOtpCooldownRemaining(editTarget.phone));
            }}
            className="w-full cursor-pointer text-center text-sm font-medium text-accent-600 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-accent-400"
          >
            {cooldown > 0 ? t("auth.otpResendWait", { seconds: cooldown }) : t("auth.otpResend")}
          </button>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={busy || otp.length !== 5}
              className={`${dialogPrimaryBtnClass} disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => void confirmAssignWithOtp()}
            >
              {t("common.confirm")}
            </button>
          </div>
        </div>
      </GlassDialog>

      <GlassDialog open={!!roleTarget} onClose={() => setRoleTarget(null)} title={t("panel.roleChange")}>
        {roleTarget && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--zy-muted)]">
              {roleTarget.firstName} {roleTarget.lastName} · {roleTarget.appName} ·{" "}
              {roleTarget.panelName}
            </p>
            <GlassSelect
              value={roleValue}
              onChange={setRoleValue}
              options={ROLE_OPTIONS}
              invalid={isBlank(roleValue)}
            />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={busy || !roleValue}
                className={`${dialogPrimaryBtnClass} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => void saveRole()}
              >
                {t("common.save")}
              </button>
            </div>
          </div>
        )}
      </GlassDialog>

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => void revoke()}
        title={t("panel.revokeColleagueTitle")}
        message={t("panel.revokeColleagueMsg")}
        confirmLabel={t("panel.roleRevoke")}
        danger
        busy={busy}
      />
    </div>
  );
}
