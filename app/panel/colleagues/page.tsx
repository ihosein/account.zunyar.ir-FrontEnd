"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { InputOTP } from "@/components/ui/InputOTP";
import { api } from "@/lib/api";
import { getOtpCooldownRemaining, startOtpCooldown } from "@/lib/otp-cooldown";
import { t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { Colleague } from "@/types/account";

const ROLE_OPTIONS = [
  { value: "teacher", label: "مدرس" },
  { value: "assistant", label: "دستیار" },
  { value: "admin", label: "مدیر پنل" },
  { value: "accountant", label: "حسابدار" },
  { value: "coworker", label: "همکار" },
];

type AddForm = {
  appSlug: string;
  panelName: string;
  phone: string;
  role: string;
};

const EMPTY_ADD: AddForm = { appSlug: "", panelName: "", phone: "", role: "" };

export default function ColleaguesPage() {
  const [rows, setRows] = useState<Colleague[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
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
        const data = await api<Colleague[]>("/account/colleagues");
        if (active) setRows(data);
      } catch {
        // backend not available yet — keep empty state
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!otpOpen) return;
    setCooldown(getOtpCooldownRemaining(addForm.phone));
    const id = window.setInterval(() => {
      setCooldown(getOtpCooldownRemaining(addForm.phone));
    }, 500);
    return () => window.clearInterval(id);
  }, [otpOpen, addForm.phone]);

  const appOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) if (!seen.has(r.appSlug)) seen.set(r.appSlug, r.appName);
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [rows]);

  async function startAddConfirm() {
    if (!addForm.phone.trim() || !addForm.appSlug || !addForm.role) return;
    setBusy(true);
    try {
      if (getOtpCooldownRemaining(addForm.phone) <= 0) {
        await api("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone: addForm.phone }) });
        startOtpCooldown(addForm.phone);
      }
    } catch {
      // continue to OTP step regardless — backend may not exist yet
    } finally {
      setBusy(false);
      setOtp("");
      setAddOpen(false);
      setOtpOpen(true);
    }
  }

  async function confirmAddWithOtp() {
    if (otp.length !== 5) return;
    setBusy(true);
    try {
      const created = await api<Colleague>("/account/colleagues", {
        method: "POST",
        body: JSON.stringify({ ...addForm, otp }),
      });
      setRows((prev) => [created, ...prev]);
      setOtpOpen(false);
      setAddForm(EMPTY_ADD);
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
      await api(`/account/colleagues/${roleTarget.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: roleValue }),
      });
      setRows((prev) =>
        prev.map((r) => (r.id === roleTarget.id ? { ...r, role: roleValue } : r)),
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
      await api(`/account/colleagues/${revokeTarget.id}/revoke`, { method: "POST" });
      setRows((prev) => prev.filter((r) => r.id !== revokeTarget.id));
      setRevokeTarget(null);
      toast.success(t("common.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.colleagues")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.colleaguesHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
        >
          <Plus size={16} />
          {t("panel.addToAnother")}
        </button>
      </div>

      {!loading && rows.length === 0 ? (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Users size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.colleaguesEmpty")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((row) => {
            const isManager = row.relation === "manager";
            return (
              <div key={row.id} className="glass-card-static w-full p-1">
                <div className="glass-inner !m-1 flex flex-wrap items-center justify-between gap-4 !p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-sm font-bold text-accent-600 dark:text-accent-400">
                      {row.firstName.charAt(0)}
                      {row.lastName.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[var(--zy-ink)]">
                        {row.firstName} {row.lastName}
                      </p>
                      <p className="truncate text-xs text-[var(--zy-muted)]" dir="ltr">
                        {row.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs">
                    <span className="zy-chip">{row.appName}</span>
                    <span className="zy-chip">{row.panelName}</span>
                    <span className="zy-chip !border-accent-500/40 !bg-accent-500/15">
                      {row.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        isManager ? "text-accent-600 dark:text-accent-400" : "text-[var(--zy-muted)]"
                      }`}
                    >
                      {isManager ? <ShieldCheck size={14} /> : <Users size={14} />}
                      {isManager ? t("panel.relationManager") : t("panel.relationEmployee")}
                    </span>
                  </div>

                  {isManager ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRoleTarget(row);
                          setRoleValue(row.role);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-accent-600 hover:bg-accent-500/10 dark:text-accent-400"
                      >
                        <UserCog size={14} />
                        {t("panel.roleChange")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                        {t("panel.roleRevoke")}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--zy-muted)]">{t("panel.readOnlyNotice")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add colleague to another app/panel */}
      <GlassDialog open={addOpen} onClose={() => setAddOpen(false)} title={t("panel.addToAnother")}>
        <div className="space-y-3">
          <label className="field-label">
            <span className={fieldLabelClass(isBlank(addForm.appSlug))}>{t("panel.selectService")}</span>
            <div className="mt-1">
              <GlassSelect
                value={addForm.appSlug}
                onChange={(v) => setAddForm((f) => ({ ...f, appSlug: v }))}
                placeholder={t("panel.selectService")}
                options={appOptions}
                invalid={isBlank(addForm.appSlug)}
              />
            </div>
          </label>
          <label className="field-label">
            <span className="text-[var(--zy-muted)]">{t("panel.selectPanel")}</span>
            <input
              className={fieldInputClass(false)}
              value={addForm.panelName}
              onChange={(e) => setAddForm((f) => ({ ...f, panelName: e.target.value }))}
            />
          </label>
          <label className="field-label">
            <span className={fieldLabelClass(isBlank(addForm.phone))}>{t("panel.phone")}</span>
            <input
              className={fieldInputClass(isBlank(addForm.phone))}
              value={addForm.phone}
              onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
              dir="ltr"
              inputMode="numeric"
            />
          </label>
          <label className="field-label">
            <span className={fieldLabelClass(isBlank(addForm.role))}>{t("panel.selectRole")}</span>
            <div className="mt-1">
              <GlassSelect
                value={addForm.role}
                onChange={(v) => setAddForm((f) => ({ ...f, role: v }))}
                placeholder={t("panel.selectRole")}
                options={ROLE_OPTIONS}
                invalid={isBlank(addForm.role)}
              />
            </div>
          </label>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={busy || !addForm.phone.trim() || !addForm.appSlug || !addForm.role}
              className={`${dialogPrimaryBtnClass} disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => void startAddConfirm()}
            >
              {t("panel.confirmWithOtp")}
            </button>
          </div>
        </div>
      </GlassDialog>

      {/* OTP confirmation */}
      <GlassDialog open={otpOpen} onClose={() => setOtpOpen(false)} title={t("panel.confirmWithOtp")}>
        <div className="space-y-4">
          <p className="text-center text-sm text-[var(--zy-muted)]">
            {t("panel.otpConfirmHint")}
          </p>
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
            disabled={cooldown > 0 || busy}
            onClick={() => {
              startOtpCooldown(addForm.phone);
              setCooldown(getOtpCooldownRemaining(addForm.phone));
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
              onClick={() => void confirmAddWithOtp()}
            >
              {t("common.confirm")}
            </button>
          </div>
        </div>
      </GlassDialog>

      {/* Change role */}
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
