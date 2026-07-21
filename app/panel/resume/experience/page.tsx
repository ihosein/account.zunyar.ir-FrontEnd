"use client";

import { FormEvent, useEffect, useState } from "react";
import { Briefcase, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { CertificateUpload } from "@/components/ui/CertificateUpload";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
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
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  description: string;
  certificateUrl?: string;
};

const EMPTY: Form = {
  companyName: "",
  title: "",
  employmentType: "FULL_TIME",
  location: "",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  description: "",
  certificateUrl: undefined,
};

function empLabel(code: string) {
  return t(EMP.find((e) => e.value === code)?.labelKey ?? "panel.empFullTime");
}

export default function ResumeExperiencePage() {
  const [rows, setRows] = useState<WorkExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkExperience | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
      startDate: row.startDate?.slice(0, 10) || "",
      endDate: row.endDate?.slice(0, 10) || "",
      currentlyWorking: row.currentlyWorking,
      description: row.description || "",
      certificateUrl: row.certificateUrl || undefined,
    });
    setOpen(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        companyName: form.companyName.trim(),
        title: form.title.trim(),
        employmentType: form.employmentType,
        location: form.location.trim() || undefined,
        startDate: form.startDate,
        endDate: form.currentlyWorking || !form.endDate ? null : form.endDate,
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
        {rows.map((row) => (
          <div key={row.id} className="glass-card-static p-1">
            <div className="glass-inner !m-2 flex flex-wrap items-start justify-between gap-3 !p-5">
              <div className="min-w-0">
                <p className="font-bold text-[var(--zy-ink)]">{row.title}</p>
                <p className="mt-0.5 text-sm text-[var(--zy-muted)]">
                  {row.companyName}
                  {row.location ? ` · ${row.location}` : ""}
                </p>
                <p className="mt-1 text-xs text-accent-700 dark:text-accent-300">
                  {empLabel(row.employmentType)}
                </p>
                <p className="mt-1 text-xs text-[var(--zy-muted)]" dir="ltr">
                  {row.startDate?.slice(0, 7)} –{" "}
                  {row.currentlyWorking ? t("panel.present") : row.endDate?.slice(0, 7) || ""}
                </p>
                {row.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--zy-ink)]/80">
                    {row.description}
                  </p>
                )}
                {row.certificateUrl && (
                  <a
                    href={row.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
                  >
                    <ExternalLink size={12} />
                    {t("panel.viewFile")}
                  </a>
                )}
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => openEdit(row)} className="rounded-lg p-2 text-accent-600 hover:bg-accent-500/10">
                  <Pencil size={16} />
                </button>
                <button type="button" onClick={() => setDeleteId(row.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
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
              <span className={fieldLabelClass(isBlank(form.startDate))}>{t("panel.startDate")}</span>
              <input
                type="date"
                className={fieldInputClass(isBlank(form.startDate))}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                required
              />
            </label>
            <label className="text-sm">
              <span className="text-[var(--zy-muted)]">{t("panel.endDate")}</span>
              <input
                type="date"
                className={fieldInputClass(false)}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                disabled={form.currentlyWorking}
              />
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--zy-ink)]">
            <input
              type="checkbox"
              className="zy-checkbox"
              checked={form.currentlyWorking}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currentlyWorking: e.target.checked,
                  endDate: e.target.checked ? "" : f.endDate,
                }))
              }
            />
            {t("panel.currentlyWorking")}
          </label>
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
            <button type="button" onClick={() => setOpen(false)} className="cursor-pointer rounded-xl px-4 py-2 text-sm">
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
