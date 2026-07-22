"use client";

import { useRef, useState } from "react";
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
import { useAuth } from "@/lib/auth";
import { isUploadLimitError, prepareUpload } from "@/lib/image-upload";
import { t } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import type { VerificationStatus } from "@/types/account";

function StatusBadge({ status }: { status: VerificationStatus }) {
  const meta: Record<VerificationStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
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
  onUpload: (dataUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await prepareUpload(file);
      onUpload(prepared.dataUrl);
    } catch (err) {
      toast.error(
        isUploadLimitError(err) ? t("common.uploadTooLarge") : t("common.uploadFailed"),
      );
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
        accept="image/*,application/pdf"
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
  const { user } = useAuth();
  const [nationalIdStatus, setNationalIdStatus] = useState<VerificationStatus>(
    user?.nationalIdStatus || "none",
  );
  const [birthCertStatus, setBirthCertStatus] = useState<VerificationStatus>(
    user?.birthCertificateStatus || "none",
  );
  const [emailSent, setEmailSent] = useState(false);

  const phoneVerified = Boolean(user?.phone);
  const emailVerified = Boolean(user?.emailVerified);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.verification")}</h1>
      <p className="mt-1 text-sm text-justify text-[var(--zy-muted)]">{t("panel.verificationHint")}</p>

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
                  {user?.email || t("panel.verifyEmailMissing")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <StatusBadge status={emailVerified ? "approved" : "none"} />
              {!emailVerified && user?.email && (
                <button
                  type="button"
                  disabled={emailSent}
                  onClick={() => setEmailSent(true)}
                  className="text-xs font-semibold whitespace-nowrap text-accent-600 hover:underline disabled:opacity-50 dark:text-accent-400"
                >
                  {emailSent ? t("common.loading") : t("panel.verifyEmailAction")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card p-1">
          <div className="glass-inner !m-2 flex items-center justify-between gap-3 !p-5">
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
                onUpload={() => setNationalIdStatus("pending")}
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-1">
          <div className="glass-inner !m-2 flex items-center justify-between gap-3 !p-5">
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
                onUpload={() => setBirthCertStatus("pending")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
