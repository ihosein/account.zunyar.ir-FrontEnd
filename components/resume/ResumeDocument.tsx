"use client";

import Image from "next/image";
import {
  Briefcase,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import type { PublicResumeDemo } from "@/lib/resume-public";
import { t } from "@/lib/i18n";

type Props = {
  resume: PublicResumeDemo;
  className?: string;
};

export function ResumeDocument({ resume, className }: Props) {
  return (
    <article className={className ?? "glass-card-static p-1"}>
      <div className="glass-inner !m-2 space-y-8 !p-6 sm:!p-8">
        <header className="border-b border-[var(--zy-border)] pb-6">
          <div className="flex flex-wrap items-start gap-4">
            {resume.avatar ? (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-[var(--zy-border)] bg-accent-500/10">
                <Image
                  src={resume.avatar}
                  alt={resume.fullName}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black tracking-tight">{resume.fullName}</h1>
              {resume.title ? (
                <p className="mt-1 text-lg text-accent-700 dark:text-accent-300">{resume.title}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--zy-muted)]">
                {resume.city ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} />
                    {resume.city}
                  </span>
                ) : null}
                {resume.phone ? (
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    <Phone size={14} />
                    {resume.phone}
                  </span>
                ) : null}
                {resume.email ? (
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    <Mail size={14} />
                    {resume.email}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          {resume.about ? (
            <p className="mt-4 text-sm leading-7 text-[var(--zy-ink)]/85">{resume.about}</p>
          ) : null}
        </header>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <GraduationCap size={16} className="text-accent-500" />
            {t("panel.resumeEducation")}
          </h2>
          {resume.education.length === 0 ? (
            <p className="text-sm text-[var(--zy-muted)]">—</p>
          ) : (
            <ul className="space-y-3">
              {resume.education.map((e, i) => (
                <li key={i} className="border-s-2 border-accent-500/40 ps-3">
                  <p className="font-semibold">{e.school}</p>
                  <p className="text-sm text-[var(--zy-muted)]">
                    {[e.degree, e.field].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--zy-muted)]" dir="ltr">
                    {e.years}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Briefcase size={16} className="text-accent-500" />
            {t("panel.resumeExperience")}
          </h2>
          {resume.experience.length === 0 ? (
            <p className="text-sm text-[var(--zy-muted)]">—</p>
          ) : (
            <ul className="space-y-3">
              {resume.experience.map((e, i) => (
                <li key={i} className="border-s-2 border-accent-500/40 ps-3">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-[var(--zy-muted)]">{e.company}</p>
                  <p className="mt-0.5 text-xs text-[var(--zy-muted)]" dir="ltr">
                    {e.years}
                  </p>
                  {e.description ? (
                    <p className="mt-1 text-sm text-[var(--zy-ink)]/80">{e.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
            <Sparkles size={16} className="text-accent-500" />
            {t("panel.resumeSkills")}
          </h2>
          {resume.skills.length === 0 ? (
            <p className="text-sm text-[var(--zy-muted)]">—</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {resume.skills.map((s, i) => (
                <li key={i} className="zy-chip">
                  {s.name}
                  <span className="opacity-60">· {s.level}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  );
}
