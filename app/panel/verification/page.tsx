"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  ScrollText,
  Upload,
  XCircle,
} from "lucide-react";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { InputOTP } from "@/components/ui/InputOTP";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isUploadLimitError, prepareUpload } from "@/lib/image-upload";
import { t, tWithLtr } from "@/lib/i18n";
import { dialogPrimaryBtnClass } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { VerificationStatus } from "@/types/account";

type VerificationApiStatus = {
  phoneVerified?: boolean;
  emailVerified?: boolean;
  nationalIdVerified?: boolean;
  email?: string | null;
  nationalIdStatus?: VerificationStatus;
  birthCertStatus?: VerificationStatus;
  nationalIdReviewNote?: string | null;
  birthCertReviewNote?: string | null;
  nationalIdDocUrl?: string | null;
  birthCertDocUrl?: string | null;
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const meta: Record<
    VerificationStatus,
    { label: string; className: string; icon: typeof CheckCircle2 }
  > = {
    approved: {
      label: t("panel.statusApproved"),
      className: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    pending: {
      label: t("panel.statusPending"),
      className: "text-amber-500",
      icon: Clock,
    },
    rejected: {
      label: t("panel.statusRejected"),
      className: "text-red-500",
      icon: XCircle,
    },
    none: {
      label: t("panel.statusNone"),
      className: "text-red-500",
      icon: XCircle,
    },
  };
  const { label, className, icon: Icon } = meta[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold ${className}`}
    >
      <Icon size={16} className="shrink-0" />
      {label}
    </span>
  );
}

function DocumentUploader({
  status,
  onUpload,
}: {
  status: VerificationStatus;
  onUpload: (dataUrl: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const canUpload = status === "none" || status === "rejected";

  if (!canUpload) return null;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await prepareUpload(file);
      await onUpload(prepared.dataUrl);
    } catch (err) {
      if (isUploadLimitError(err)) {
        toast.error(t("common.uploadTooLarge"));
      } else if (err instanceof Error && err.message && err.message !== t("common.error")) {
        toast.error(err.message);
      } else {
        toast.error(t("common.uploadFailed"));
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        disabled={busy}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-accent-500/30 px-3 py-1.5 text-xs font-semibold text-accent-600 transition hover:bg-accent-500/10 disabled:opacity-50 dark:text-accent-400"
      >
        <Upload size={14} />
        {busy
          ? t("common.loading")
          : status === "none"
            ? t("panel.uploadDocument")
            : t("panel.reuploadDocument")}
      </button>
    </>
  );
}

export default function VerificationPage() {
  const { user, updateUser, refresh } = useAuth();
  const [status, setStatus] = useState<VerificationApiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [emailDebug, setEmailDebug] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<VerificationApiStatus>("/verification/status");
      setStatus(data);
      updateUser({
        email: data.email || user?.email,
        emailVerified: Boolean(data.emailVerified),
        phoneVerified: Boolean(data.phoneVerified),
        nationalIdStatus: data.nationalIdStatus || "none",
        birthCertificateStatus: data.birthCertStatus || "none",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [updateUser, user?.email]);

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phoneVerified = Boolean(status?.phoneVerified ?? user?.phone);
  const emailVerified = Boolean(status?.emailVerified ?? user?.emailVerified);
  const email = status?.email || user?.email || "";
  const nationalIdStatus: VerificationStatus = status?.nationalIdStatus || "none";
  const birthCertStatus: VerificationStatus = status?.birthCertStatus || "none";

  async function submitDoc(
    kind: "nationalIdDocUrl" | "birthCertDocUrl",
    dataUrl: string,
  ) {
    const body =
      kind === "nationalIdDocUrl"
        ? { nationalIdDocUrl: dataUrl }
        : { birthCertDocUrl: dataUrl };
    const data = await api<VerificationApiStatus>("/verification/documents", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setStatus(data);
    updateUser({
      nationalIdStatus: data.nationalIdStatus || "none",
      birthCertificateStatus: data.birthCertStatus || "none",
    });
    toast.success(t("panel.documentSubmitted"));
  }

  async function requestEmailOtp() {
    if (!email || !email.includes("@")) {
      toast.error(t("panel.verifyEmailMissing"));
      return;
    }
    setEmailBusy(true);
    try {
      const res = await api<{ debugCode?: string }>("/verification/email/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setEmailDebug(res.debugCode || "");
      setEmailOtp("");
      setEmailOpen(true);
      toast.success(t("panel.verifyEmailSent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setEmailBusy(false);
    }
  }

  async function confirmEmailOtp(code?: string) {
    const otp = (code ?? emailOtp).trim();
    if (otp.length !== 5) return;
    setEmailBusy(true);
    try {
      const data = await api<VerificationApiStatus>("/verification/email/confirm", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      setStatus(data);
      updateUser({ email: data.email || email, emailVerified: true });
      await refresh().catch(() => undefined);
      toast.success(t("panel.verifyEmailConfirmed"));
      setEmailOpen(false);
    } catch {
      toast.error(t("auth.otpWrong"));
      setEmailOtp("");
    } finally {
      setEmailBusy(false);
    }
  }

  useEffect(() => {
    if (emailOpen && emailOtp.length === 5 && !emailBusy) {
      void confirmEmailOtp(emailOtp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailOtp, emailOpen]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.verification")}</h1>
      <p className="mt-1 text-sm text-justify text-[var(--zy-muted)]">{t("panel.verificationHint")}</p>
      <p className="mt-2 text-xs text-[var(--zy-muted)]">{t("panel.uploadImageOnly")}</p>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="glass-card p-1">
            <div className="glass-inner !m-2 flex items-center justify-between gap-3 !p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-400">
                  <Phone size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-[var(--zy-ink)]">{t("panel.verifyPhone")}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--zy-muted)]" dir="ltr">
                    {user?.phone}
                  </p>
                </div>
              </div>
              <StatusBadge status={phoneVerified ? "approved" : "none"} />
            </div>
          </div>

          <div className="glass-card p-1">
            <div className="glass-inner !m-2 flex items-center justify-between gap-3 !p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-400">
                  <Mail size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-[var(--zy-ink)]">{t("panel.verifyEmail")}</p>
                  <p className="mt-0.5 truncate text-xs text-[var(--zy-muted)]" dir="ltr">
                    {email || t("panel.verifyEmailMissing")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge status={emailVerified ? "approved" : "none"} />
                {!emailVerified && email && (
                  <button
                    type="button"
                    disabled={emailBusy}
                    onClick={() => void requestEmailOtp()}
                    className="text-xs font-semibold whitespace-nowrap text-accent-600 hover:underline disabled:opacity-50 dark:text-accent-400"
                  >
                    {emailBusy ? t("common.loading") : t("panel.verifyEmailAction")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="glass-card p-1">
            <div className="glass-inner !m-2 space-y-3 !p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-400">
                    <BadgeCheck size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--zy-ink)]">{t("panel.verifyNationalId")}</p>
                    <p className="mt-0.5 text-xs text-justify text-[var(--zy-muted)]">
                      {t("panel.teacherOnboardingHint")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={nationalIdStatus} />
                  <DocumentUploader
                    status={nationalIdStatus}
                    onUpload={(url) => submitDoc("nationalIdDocUrl", url)}
                  />
                </div>
              </div>
              {nationalIdStatus === "rejected" && status?.nationalIdReviewNote && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  <span className="font-semibold">{t("panel.documentRejectReason")}: </span>
                  {status.nationalIdReviewNote}
                </p>
              )}
            </div>
          </div>

          <div className="glass-card p-1">
            <div className="glass-inner !m-2 space-y-3 !p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600 dark:text-accent-400">
                    <ScrollText size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--zy-ink)]">
                      {t("panel.verifyBirthCertificate")}
                    </p>
                    <p className="mt-0.5 text-xs text-justify text-[var(--zy-muted)]">
                      {t("panel.teacherOnboardingHint")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={birthCertStatus} />
                  <DocumentUploader
                    status={birthCertStatus}
                    onUpload={(url) => submitDoc("birthCertDocUrl", url)}
                  />
                </div>
              </div>
              {birthCertStatus === "rejected" && status?.birthCertReviewNote && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                  <span className="font-semibold">{t("panel.documentRejectReason")}: </span>
                  {status.birthCertReviewNote}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <GlassDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title={t("panel.verifyEmailOtpTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--zy-muted)]">
            {tWithLtr("auth.otpHint", "phone", email)}
          </p>
          <InputOTP
            value={emailOtp}
            onChange={setEmailOtp}
            length={5}
            autoFocus
            disabled={emailBusy}
            invalid={emailOtp.length < 5}
          />
          {emailDebug && (
            <p className="text-center text-xs text-accent-600" dir="ltr">
              {t("auth.otpDebug", { code: emailDebug })}
            </p>
          )}
          <button
            type="button"
            disabled={emailBusy || emailOtp.length !== 5}
            onClick={() => void confirmEmailOtp()}
            className={`${dialogPrimaryBtnClass} w-full`}
          >
            {emailBusy ? t("common.loading") : t("common.confirm")}
          </button>
        </div>
      </GlassDialog>
    </div>
  );
}
