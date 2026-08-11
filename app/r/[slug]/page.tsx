"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Copy, Printer } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ResumeDocument } from "@/components/resume/ResumeDocument";
import { api, getToken } from "@/lib/api";
import {
  buildResumeFromProfile,
  getPublicResume,
  loadStoredResumeSlug,
  normalizeResumeSlug,
  publicResumeUrl,
  saveStoredResumeProfile,
  type PublicResumeDemo,
} from "@/lib/resume-public";
import { t } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import type { EducationHistory, Skill, User, WorkExperience } from "@/types/account";

export default function PublicResumePage() {
  const params = useParams<{ slug: string }>();
  const rawSlug = typeof params?.slug === "string" ? params.slug : "";
  const slug = normalizeResumeSlug(rawSlug);
  const [resume, setResume] = useState<PublicResumeDemo | null>(() =>
    getPublicResume(slug),
  );

  useEffect(() => {
    const n = normalizeResumeSlug(rawSlug);
    setResume(getPublicResume(n));

    const own = loadStoredResumeSlug();
    if (!n || !own || own !== n || !getToken()) return;

    let cancelled = false;
    async function refreshOwn() {
      try {
        const [me, education, skills, experience] = await Promise.all([
          api<User>("/auth/me"),
          api<EducationHistory[]>("/resume/education").catch(() => [] as EducationHistory[]),
          api<Skill[]>("/resume/skills").catch(() => [] as Skill[]),
          api<WorkExperience[]>("/resume/experience").catch(() => [] as WorkExperience[]),
        ]);
        if (cancelled) return;
        const built = buildResumeFromProfile(n, me, education, skills, experience);
        saveStoredResumeProfile(built);
        setResume(built);
      } catch {
        // keep cached / placeholder
      }
    }
    void refreshOwn();
    return () => {
      cancelled = true;
    };
  }, [rawSlug]);

  if (!resume) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <BrandLogo height={36} />
        <p className="text-sm text-[var(--zy-muted)]">{t("panel.resumeNotFound")}</p>
      </div>
    );
  }

  const shareUrl =
    typeof window !== "undefined"
      ? publicResumeUrl(resume.slug, true)
      : publicResumeUrl(resume.slug, true);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("panel.linkCopied"));
    } catch {
      toast.error(t("common.error"));
    }
  }

  return (
    <div className="zy-resume-public min-h-screen bg-[var(--zy-bg)] px-4 py-8 text-[var(--zy-ink)]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <BrandLogo height={28} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)] px-3 py-2 text-xs font-semibold hover:border-accent-500/40"
            >
              <Printer size={14} />
              {t("panel.printResume")}
            </button>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)] px-3 py-2 text-xs font-semibold hover:border-accent-500/40"
            >
              <Copy size={14} />
              {t("panel.copyLink")}
            </button>
          </div>
        </div>

        <ResumeDocument resume={resume} />
      </div>
    </div>
  );
}
