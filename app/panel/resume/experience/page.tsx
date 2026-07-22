"use client";

import { FormEvent, useEffect, useState } from "react";
import { Briefcase, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { CertificateUpload } from "@/components/ui/CertificateUpload";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ZyCheckbox } from "@/components/ui/ZyCheckbox";
import { api } from "@/lib/api";
import { t, faNum } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { WorkExperience } from "@/types/account";

const EMP = [
  { value: "FULL_TIME", labelKey: "panel.empFullTime" },
  { value: "PART_TIME", labelKey: "panel.empPartTime" },
  { value: "CONTRACT", labelKey: "panel.empContract" },
  { value: "INTERN", labelKey: "panel.empIntern" },
  { value: "FREELANCE", labelKey: "panel.empFreelance" },
] as const;

type Form = {
  companyName: string;
  title: string;
  employmentType: string;
  location: string;
  startYear: string;
  endYear: string;
  currentlyWorking: boolean;
  description: string;
  certificateUrl?: string;
};

const EMPTY: Form = {
  companyName: "",
  title: "",
  employmentType: "FULL_TIME",
  location: "",
  startYear: "",
  endYear: "",
  currentlyWorking: false,
  description: "",
  certificateUrl: undefined,
};

function empLabel(code: string) {
  return t(EMP.find((e) => e.value === code)?.labelKey ?? "panel.empFullTime");
}

/** Extract 4-digit year from ISO date or bare year string. */
function yearFromDate(value?: string | null): string {
  if (!value) return "";
  const m = String(value).match(/(\d{4})/);
  return m?.[1] ?? "";
}

/** Backend still stores LocalDate — encode year as YYYY-01-01. */
function yearToDate(year: string): string {
  return `${year}-01-01`;
}

export default function ResumeExperiencePage() {
  const [rows, setRows] = useState<WorkExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkExperience | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const endYearRequired = !form.currentlyWorking;

  async function load() {
    try {
      setRows(await api<WorkExperience[]>("/resume/experience"));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(row: WorkExperience) {
    setEditing(row);
    setForm({
      companyName: row.companyName,
      title: row.title,
      employmentType: row.employmentType,
      location: row.location || "",
      startYear: yearFromDate(row.startDate),
      endYear: yearFromDate(row.endDate),
      currentlyWorking: row.currentlyWorking,
      description: row.description || "",
      certificateUrl: row.certificateUrl || undefined,
    });
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (isBlank(form.startYear)) {
      toast.error(t("panel.startYear"));
      return;
    }
    if (endYearRequired && isBlank(form.endYear)) {
      toast.error(t("panel.endYearRequiredWork"));
      return;
    }
    setBusy(true);
    try {
      const body = {
        companyName: form.companyName.trim(),
        title: form.title.trim(),
        employmentType: form.employmentType,
        location: form.location.trim() || undefined,
        startDate: yearToDate(form.startYear),
        endDate: form.currentlyWorking || !form.endYear ? null : yearToDate(form.endYear),
        currentlyWorking: form.currentlyWorking,
        description: form.description.trim() || undefined,
        certificateUrl: form.certificateUrl || undefined,
      };
      if (editing) {
        await api(`/resume/experience/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/resume/experience", { method: "POST", body: JSON.stringify(body) });
      }
      setOpen(false);
      await load();
      toast.success(t("panel.settingsSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (deleteId == null) return;
    setBusy(true);
    try {
      await api(`/resume/experience/${deleteId}`, { method: "DELETE" });
      setDeleteId(null);
      await load();
      toast.success(t("common.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.resumeExperience")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.resumeExperienceHint")}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          <Plus size={16} />
          {t("panel.addExperience")}
        </button>
      </div>

      {!loading && rows.length === 0 && (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Briefcase size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.resumeEmpty")}</p>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {rows.map((row) => {
          const hasCert = Boolean(row.certificateUrl);
          const yearsLabel = row.currentlyWorking
            ? `از ${faNum(yearFromDate(row.startDate))} ${t("panel.present")}`
            : `از ${faNum(yearFromDate(row.startDate))} تا ${faNum(yearFromDate(row.endDate))}`;
          return (
            <div key={row.id} className="glass-card-static p-1">
              <div className="glass-inner !m-2 !p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-bold text-[var(--zy-ink)]">{row.title}</p>
                    <p className="text-sm text-[var(--zy-muted)]">
                      {row.companyName}
                      {row.location ? ` · ${row.location}` : ""}
                    </p>
                    <p className="text-xs text-accent-700 dark:text-accent-300" dir="rtl">
                      {empLabel(row.employmentType)}
                      <span className="mx-1.5 text-[var(--zy-muted)]/45" aria-hidden>
                        |
                      </span>
                      <span className="tabular-nums text-[var(--zy-muted)]">{yearsLabel}</span>
                    </p>
                    {row.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--zy-ink)]/80">
                        {row.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="cursor-pointer rounded-lg p-2 text-accent-600 hover:bg-accent-500/10"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(row.id)}
                        className="cursor-pointer rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {hasCert ? (
                      <a
                        href={row.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="zy-chip !border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300"
                      >
                        <ExternalLink size={12} />
                        {t("panel.certificateUploaded")}
                      </a>
                    ) : (
                      <span className="zy-chip !border-red-500/30 !bg-red-500/10 !text-red-600 dark:!text-red-400">
                        {t("panel.certificateMissing")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <GlassDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("panel.editExperience") : t("panel.addExperience")}
        wide
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(form.title))}>{t("panel.jobTitle")}</span>
            <input
              className={fieldInputClass(isBlank(form.title))}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </label>
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(form.companyName))}>{t("panel.companyName")}</span>
            <input
              className={fieldInputClass(isBlank(form.companyName))}
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className={fieldLabelClass(isBlank(form.employmentType))}>
                {t("panel.employmentType")}
              </span>
              <GlassSelect
                value={form.employmentType}
                onChange={(v) => setForm((f) => ({ ...f, employmentType: v }))}
                options={EMP.map((e) => ({ value: e.value, label: t(e.labelKey) }))}
                invalid={isBlank(form.employmentType)}
              />
            </label>
            <label className="text-sm">
              <span className="text-[var(--zy-muted)]">{t("panel.location")}</span>
              <input
                className={fieldInputClass(false)}
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className={fieldLabelClass(isBlank(form.startYear))}>{t("panel.startYear")}</span>
              <input
                className={fieldInputClass(isBlank(form.startYear))}
                value={form.startYear}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    startYear: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
                inputMode="numeric"
                dir="ltr"
                maxLength={4}
                required
              />
            </label>
            <label className="text-sm">
              <span className={fieldLabelClass(endYearRequired && isBlank(form.endYear))}>
                {t("panel.endYear")}
              </span>
              <input
                className={fieldInputClass(endYearRequired && isBlank(form.endYear))}
                value={form.endYear}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    endYear: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
                inputMode="numeric"
                dir="ltr"
                maxLength={4}
                disabled={form.currentlyWorking}
              />
            </label>
          </div>
          <ZyCheckbox
            label={t("panel.currentlyWorking")}
            checked={form.currentlyWorking}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                currentlyWorking: e.target.checked,
                endYear: e.target.checked ? "" : f.endYear,
              }))
            }
          />
          <label className="block text-sm">
            <span className="text-[var(--zy-muted)]">{t("panel.description")}</span>
            <textarea
              className={fieldInputClass(false, "min-h-28")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="شرح مسئولیت‌ها و دستاوردها..."
            />
          </label>
          <CertificateUpload
            value={form.certificateUrl}
            onChange={(url) => setForm((f) => ({ ...f, certificateUrl: url }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm"
            >
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={busy} className={dialogPrimaryBtnClass}>
              {busy ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </GlassDialog>

      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        title={t("panel.deleteConfirm")}
        message={t("panel.deleteConfirm")}
        danger
        busy={busy}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
