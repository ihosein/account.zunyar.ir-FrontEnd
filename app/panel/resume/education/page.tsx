"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { CertificateUpload } from "@/components/ui/CertificateUpload";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { api } from "@/lib/api";
import {
  OTHER,
  type EducationCatalog,
  detailsForLevel,
  educationDetailLabel,
  highSchoolFields,
  institutionScope,
  institutionTypeLabelKey,
  institutionTypesForLevel,
  isHawzaLevel,
  isUniversityLevel,
  labelOf,
  needsFieldGroup,
  needsFieldOfStudy,
  normalizeLevel,
  schoolNameLabelKey,
  universityFieldGroups,
  universityFields,
} from "@/lib/education";
import { t, faNum } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { EducationHistory } from "@/types/account";

type Form = {
  schoolName: string;
  institutionType: string;
  educationLevel: string;
  educationDetail: string;
  fieldGroup: string;
  fieldOfStudy: string;
  fieldOfStudyOther: string;
  startYear: string;
  endYear: string;
  currentlyStudying: boolean;
  description: string;
  grade: string;
  certificateUrl?: string;
};

const EMPTY: Form = {
  schoolName: "",
  institutionType: "",
  educationLevel: "",
  educationDetail: "",
  fieldGroup: "",
  fieldOfStudy: "",
  fieldOfStudyOther: "",
  startYear: "",
  endYear: "",
  currentlyStudying: false,
  description: "",
  grade: "",
  certificateUrl: undefined,
};

function codeForLabel(options: { value: string; label: string }[], label: string | undefined) {
  if (!label) return "";
  return options.find((o) => o.label === label)?.value ?? "";
}

export default function ResumeEducationPage() {
  const [rows, setRows] = useState<EducationHistory[]>([]);
  const [catalog, setCatalog] = useState<EducationCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EducationHistory | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function load() {
    try {
      const [edu, cat] = await Promise.all([
        api<EducationHistory[]>("/resume/education"),
        api<EducationCatalog>("/resume/education-catalog"),
      ]);
      setRows(edu);
      setCatalog(cat);
    } catch {
      setRows([]);
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const levelOptions = catalog?.levels ?? [];
  const detailOptions = useMemo(
    () => detailsForLevel(catalog, form.educationLevel),
    [catalog, form.educationLevel],
  );
  const institutionOptions = useMemo(
    () => institutionTypesForLevel(catalog, form.educationLevel),
    [catalog, form.educationLevel],
  );
  const fieldGroupOptions = useMemo(() => universityFieldGroups(catalog), [catalog]);
  const fieldOptions = useMemo(() => {
    if (form.educationLevel === "high") return highSchoolFields(catalog);
    if (isUniversityLevel(form.educationLevel)) {
      return universityFields(catalog, form.fieldGroup, form.educationDetail);
    }
    return [];
  }, [catalog, form.educationLevel, form.fieldGroup, form.educationDetail]);

  const showField = needsFieldOfStudy(form.educationLevel);
  const showGroup = needsFieldGroup(form.educationLevel);
  const showInstitution = institutionScope(form.educationLevel) != null;
  const showOther = isUniversityLevel(form.educationLevel) && form.fieldOfStudy === OTHER;
  const nameLabel = t(schoolNameLabelKey(form.educationLevel));
  const typeLabel = t(institutionTypeLabelKey(form.educationLevel));

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(row: EducationHistory) {
    setEditing(row);
    const level = normalizeLevel(row.educationLevel);
    const fieldList =
      level === "high"
        ? highSchoolFields(catalog)
        : universityFields(catalog, row.fieldGroup || "", row.educationDetail || "");
    const fieldCode = codeForLabel(fieldList.filter((f) => !f.separator), row.fieldOfStudy);
    setForm({
      schoolName: row.schoolName,
      institutionType: row.institutionType || "",
      educationLevel: level,
      educationDetail: row.educationDetail || "",
      fieldGroup: row.fieldGroup || "",
      fieldOfStudy: fieldCode || (row.fieldOfStudy ? OTHER : ""),
      fieldOfStudyOther: fieldCode ? "" : row.fieldOfStudy || "",
      startYear: String(row.startYear ?? ""),
      endYear: row.endYear != null ? String(row.endYear) : "",
      currentlyStudying: row.currentlyStudying,
      description: row.description || "",
      grade: row.grade || "",
      certificateUrl: row.certificateUrl || undefined,
    });
    setOpen(true);
  }

  function setLevel(level: string) {
    setForm((f) => ({
      ...f,
      educationLevel: level,
      educationDetail: "",
      institutionType: "",
      fieldGroup: "",
      fieldOfStudy: "",
      fieldOfStudyOther: "",
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const degree =
        labelOf(detailOptions, form.educationDetail) ||
        labelOf(levelOptions, form.educationLevel);
      let fieldOfStudy: string | undefined;
      if (showField) {
        if (form.fieldOfStudy === OTHER) {
          fieldOfStudy = form.fieldOfStudyOther.trim() || undefined;
        } else {
          fieldOfStudy =
            labelOf(
              fieldOptions.filter((o) => !o.separator),
              form.fieldOfStudy,
            ) || undefined;
        }
      }
      const body = {
        schoolName: form.schoolName.trim(),
        institutionType: showInstitution ? form.institutionType || undefined : undefined,
        fieldGroup: showGroup ? form.fieldGroup || undefined : undefined,
        fieldOfStudy,
        degree: degree || t("panel.degree"),
        educationLevel: form.educationLevel || undefined,
        educationDetail: form.educationDetail || undefined,
        startYear: Number(form.startYear),
        endYear: form.currentlyStudying || !form.endYear ? null : Number(form.endYear),
        currentlyStudying: form.currentlyStudying,
        description: form.description.trim() || undefined,
        grade: form.grade.trim() || undefined,
        certificateUrl: form.certificateUrl || undefined,
      };
      if (editing) {
        await api(`/resume/education/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/resume/education", { method: "POST", body: JSON.stringify(body) });
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
      await api(`/resume/education/${deleteId}`, { method: "DELETE" });
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
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("panel.resumeEducation")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("panel.resumeEducationHint")}</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
        >
          <Plus size={16} />
          {t("panel.addEducation")}
        </button>
      </div>

      {!loading && rows.length === 0 && (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <GraduationCap size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("panel.resumeEmpty")}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {rows.map((row) => (
          <div key={row.id} className="glass-card-static p-1">
            <div className="glass-inner !m-2 flex items-start justify-between gap-3 !p-4">
              <div className="min-w-0">
                <p className="font-bold text-[var(--zy-ink)]">{row.schoolName}</p>
                <p className="mt-1 text-sm text-[var(--zy-muted)]">
                  {[row.degree, row.fieldOfStudy].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-[var(--zy-muted)]" dir="ltr">
                  {faNum(row.startYear)}
                  {" – "}
                  {row.currentlyStudying ? t("panel.present") : faNum(row.endYear)}
                </p>
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
            </div>
          </div>
        ))}
      </div>

      <GlassDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("panel.editEducation") : t("panel.addEducation")}
        wide
      >
        <form onSubmit={save} className="space-y-3">
          {/* Row 1: level + detail */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className={fieldLabelClass(isBlank(form.educationLevel))}>
                {t("panel.educationLevel")}
              </span>
              <GlassSelect
                value={form.educationLevel}
                onChange={setLevel}
                placeholder={t("panel.educationLevelSelect")}
                options={levelOptions}
                invalid={isBlank(form.educationLevel)}
              />
            </label>
            <label className="text-sm">
              <span className={fieldLabelClass(isBlank(form.educationDetail))}>
                {form.educationLevel ? educationDetailLabel(form.educationLevel) : t("panel.degree")}
              </span>
              <GlassSelect
                value={form.educationDetail}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    educationDetail: v,
                    fieldOfStudy: "",
                    fieldOfStudyOther: "",
                  }))
                }
                placeholder={t("panel.educationDetailSelect")}
                options={detailOptions}
                disabled={!form.educationLevel}
                invalid={isBlank(form.educationDetail)}
              />
            </label>
          </div>

          {/* University: group + field */}
          {showGroup && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className={fieldLabelClass(isBlank(form.fieldGroup))}>{t("panel.fieldGroup")}</span>
                <GlassSelect
                  value={form.fieldGroup}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      fieldGroup: v,
                      fieldOfStudy: "",
                      fieldOfStudyOther: "",
                    }))
                  }
                  placeholder={t("panel.fieldGroupSelect")}
                  options={fieldGroupOptions}
                  searchable
                  invalid={isBlank(form.fieldGroup)}
                />
              </label>
              <label className="text-sm">
                <span
                  className={fieldLabelClass(
                    isBlank(form.fieldOfStudy) ||
                      (form.fieldOfStudy === OTHER && isBlank(form.fieldOfStudyOther)),
                  )}
                >
                  {t("panel.fieldOfStudy")}
                </span>
                <GlassSelect
                  value={form.fieldOfStudy}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      fieldOfStudy: v,
                      fieldOfStudyOther: v === OTHER ? f.fieldOfStudyOther : "",
                    }))
                  }
                  placeholder={t("panel.educationDetailSelect")}
                  options={fieldOptions}
                  searchable
                  disabled={!form.fieldGroup}
                  invalid={isBlank(form.fieldOfStudy)}
                />
              </label>
            </div>
          )}

          {/* High school: field only */}
          {form.educationLevel === "high" && (
            <label className="block text-sm">
              <span className={fieldLabelClass(isBlank(form.fieldOfStudy))}>
                {t("panel.fieldOfStudy")}
              </span>
              <GlassSelect
                value={form.fieldOfStudy}
                onChange={(v) => setForm((f) => ({ ...f, fieldOfStudy: v }))}
                placeholder={t("panel.educationDetailSelect")}
                options={fieldOptions}
                searchable
                invalid={isBlank(form.fieldOfStudy)}
              />
            </label>
          )}

          {/* Other field — own row; stacks under lg */}
          {showOther && (
            <label className="block text-sm lg:max-w-full">
              <span className={fieldLabelClass(isBlank(form.fieldOfStudyOther))}>
                {t("panel.fieldOfStudy")} (سایر)
              </span>
              <input
                className={fieldInputClass(isBlank(form.fieldOfStudyOther))}
                value={form.fieldOfStudyOther}
                onChange={(e) => setForm((f) => ({ ...f, fieldOfStudyOther: e.target.value }))}
                placeholder={t("panel.fieldOfStudy")}
              />
            </label>
          )}

          {/* Row: institution type + name (swapped below level/detail) */}
          <div
            className={`grid grid-cols-1 gap-3 ${showInstitution && !isHawzaLevel(form.educationLevel) ? "sm:grid-cols-2" : ""}`}
          >
            {showInstitution && (
              <label className="text-sm">
                <span className={fieldLabelClass(isBlank(form.institutionType))}>{typeLabel}</span>
                <GlassSelect
                  value={form.institutionType}
                  onChange={(v) => setForm((f) => ({ ...f, institutionType: v }))}
                  placeholder={t("panel.educationDetailSelect")}
                  options={institutionOptions}
                  invalid={isBlank(form.institutionType)}
                />
              </label>
            )}
            <label className="text-sm">
              <span className={fieldLabelClass(isBlank(form.schoolName))}>{nameLabel}</span>
              <input
                className={fieldInputClass(isBlank(form.schoolName))}
                value={form.schoolName}
                onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                required
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className={fieldLabelClass(isBlank(form.startYear))}>{t("panel.startYear")}</span>
              <input
                className={fieldInputClass(isBlank(form.startYear))}
                value={form.startYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                }
                inputMode="numeric"
                dir="ltr"
                required
              />
            </label>
            <label className="text-sm">
              <span className="text-[var(--zy-muted)]">{t("panel.endYear")}</span>
              <input
                className={fieldInputClass(false)}
                value={form.endYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                }
                inputMode="numeric"
                dir="ltr"
                disabled={form.currentlyStudying}
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--zy-ink)]">
            <input
              type="checkbox"
              className="zy-checkbox"
              checked={form.currentlyStudying}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currentlyStudying: e.target.checked,
                  endYear: e.target.checked ? "" : f.endYear,
                }))
              }
            />
            {t("panel.currentlyStudying")}
          </label>

          <label className="block text-sm">
            <span className="text-[var(--zy-muted)]">{t("panel.grade")}</span>
            <input
              className={fieldInputClass(false)}
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--zy-muted)]">{t("panel.description")}</span>
            <textarea
              className={fieldInputClass(false, "min-h-24")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
