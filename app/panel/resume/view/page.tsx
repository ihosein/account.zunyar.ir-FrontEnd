"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  RESUME_PUBLIC_HOST,
  isResumeSlugAvailable,
  isValidResumeSlug,
  loadStoredResumeSlug,
  normalizeResumeSlug,
  publicResumeUrl,
  saveStoredResumeSlug,
  slugFromUserName,
} from "@/lib/resume-public";
import { t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";

export default function ResumeViewSettingsPage() {
  const { user } = useAuth();
  const [slug, setSlug] = useState("");
  const [saved, setSaved] = useState("");
  /** Loaded / last-saved value — availability success only after user changes away from this. */
  const [baseline, setBaseline] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const existing = loadStoredResumeSlug();
    if (existing) {
      setSlug(existing);
      setSaved(existing);
      setBaseline(existing);
      return;
    }
    if (!user) return;
    const fromName = slugFromUserName(user.firstName, user.lastName, user.fullName);
    if (fromName) {
      setSlug(fromName);
      setBaseline(fromName);
    }
  }, [user]);

  const normalized = useMemo(() => normalizeResumeSlug(slug), [slug]);
  const valid = isValidResumeSlug(normalized);
  const slugChanged = Boolean(normalized) && normalized !== baseline;

  useEffect(() => {
    if (!normalized || !valid || !slugChanged) {
      setAvailable(null);
      setChecking(false);
      return;
    }
    setChecking(true);
    const id = window.setTimeout(() => {
      setAvailable(isResumeSlugAvailable(normalized, saved));
      setChecking(false);
    }, 350);
    return () => window.clearTimeout(id);
  }, [normalized, valid, saved, slugChanged]);

  function save() {
    if (!valid || available === false) return;
    const n = saveStoredResumeSlug(normalized);
    setSaved(n);
    setSlug(n);
    setBaseline(n);
    toast.success(t("panel.resumeSlugSaved"));
  }

  async function copyLink() {
    if (!saved) {
      toast.error(t("panel.resumeSlugRequired"));
      return;
    }
    try {
      await navigator.clipboard.writeText(publicResumeUrl(saved, true));
      toast.success(t("panel.linkCopied"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  function openPublic() {
    if (!saved) {
      toast.error(t("panel.resumeSlugRequired"));
      return;
    }
    window.open(publicResumeUrl(saved), "_blank", "noopener,noreferrer");
  }

  const slugStatus =
    !normalized || isBlank(slug) ? null : !valid ? (
      <span className="inline-flex items-center gap-1 text-xs text-red-500">
        <X size={12} />
        {t("panel.resumeSlugInvalid")}
      </span>
    ) : !slugChanged ? null : checking ? (
      <span className="inline-flex items-center gap-1 text-xs text-[var(--zy-muted)]">
        <Loader2 size={12} className="animate-spin" />
        {t("panel.resumeSlugChecking")}
      </span>
    ) : available === null ? null : available ? (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
        <Check size={12} />
        {t("panel.resumeSlugAvailable")}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-red-500">
        <X size={12} />
        {t("panel.resumeSlugTaken")}
      </span>
    );

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.resumeView")}</h1>
        <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.resumeViewHint")}</p>
      </div>

      <section className="glass-card-static mt-6 p-1">
        <div className="glass-inner !m-2 space-y-4 !p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-[var(--zy-ink)]">{t("panel.resumeSlugTitle")}</h2>
              <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.resumeSlugHint")}</p>
            </div>
            <button
              type="button"
              onClick={openPublic}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-600 transition hover:border-emerald-500/50 hover:bg-emerald-500/15 active:scale-[0.97] dark:text-emerald-400"
            >
              <ExternalLink size={16} />
              {t("panel.viewResume")}
            </button>
          </div>

          <label className="block text-sm">
            <span
              className={
                !valid && slug.length > 0
                  ? fieldLabelClass(true)
                  : "font-medium text-[var(--zy-ink)]"
              }
            >
              {t("panel.resumeSlug")}
            </span>
            {/* Mobile: slug full-width, then Save+Copy below. Desktop (md+): one row. */}
            <div className="mt-1.5 flex w-full flex-col gap-2 md:flex-row md:items-stretch" dir="ltr">
              <div className="flex min-w-0 w-full flex-1 overflow-hidden rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)] focus-within:border-accent-500 focus-within:shadow-[0_0_0_3px_var(--zy-glow-soft)]">
                <span
                  className="flex max-w-[42%] shrink-0 items-center truncate border-e border-[var(--zy-border)] bg-accent-500/10 px-2.5 text-[11px] font-semibold text-accent-700 dark:text-accent-300 sm:max-w-none sm:px-3 sm:text-xs"
                  title={`${RESUME_PUBLIC_HOST}/`}
                >
                  {RESUME_PUBLIC_HOST}/
                </span>
                <input
                  className="min-w-0 flex-1 bg-transparent px-2.5 py-2.5 text-base font-medium text-[var(--zy-ink)] outline-none sm:px-3 sm:text-sm sm:font-normal"
                  value={slug}
                  onChange={(e) => setSlug(normalizeResumeSlug(e.target.value))}
                  placeholder="my-name"
                  dir="ltr"
                  spellCheck={false}
                  aria-label={t("panel.resumeSlug")}
                />
              </div>
              <div className="flex w-full gap-2 md:w-auto md:shrink-0">
                <button
                  type="button"
                  disabled={!valid || available === false || checking}
                  onClick={save}
                  className={`${dialogPrimaryBtnClass} flex-1 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none`}
                >
                  {t("common.save")}
                </button>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-4 py-2.5 text-sm font-semibold md:flex-none"
                >
                  <Copy size={16} />
                  {t("panel.copyLink")}
                </button>
              </div>
            </div>
            {slugStatus ? <div className="mt-1.5 flex justify-end">{slugStatus}</div> : null}
            <p className="mt-2 text-xs leading-relaxed text-[var(--zy-muted)]">
              {t("panel.resumeSlugEnglishHint")}
            </p>
          </label>
        </div>
      </section>
    </div>
  );
}
