"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { CertificateUpload } from "@/components/ui/CertificateUpload";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ZyCheckbox } from "@/components/ui/ZyCheckbox";
import { api } from "@/lib/api";
import {
  OTHER,
  ELEMENTARY_GRADES,
  type EducationCatalog,
  detailsForLevel,
  educationDetailLabel,
  educationLevels,
  formLevelFromRow,
  highSchoolFields,
  institutionScope,
  institutionTypeLabelKey,
  institutionTypesForLevel,
  isElementaryLevel,
  isHawzaLevel,
  isPublicUniversityInstitution,
  isUniversityLevel,
  isValidNumericGrade,
  isValidYear,
  labelOf,
  needsFieldGroup,
  needsFieldOfStudy,
  schoolNameLabelKey,
  universityDegreeOptions,
  universityFieldGroups,
  universityFields,
} from "@/lib/education";
import {
  PUBLIC_UNIVERSITIES,
  PUBLIC_UNIVERSITY_OTHER,
  SYSTEM_UNI_LOGOS,
  educationLogoUrl,
} from "@/lib/iran-public-universities";
import { t, faNum } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { EducationHistory } from "@/types/account";

type Form = {
  schoolName: string;
  institutionType: string;
  publicUniversity: string;
  educationLevel: string;
  educationDetail: string;
  fieldGroup: string;
  fieldOfStudy: string;
  fieldOfStudyOther: string;
  specialization: string;
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
  publicUniversity: "",
  educationLevel: "",
  educationDetail: "",
  fieldGroup: "",
  fieldOfStudy: "",
  fieldOfStudyOther: "",
  specialization: "",
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

function resolvePublicUniversity(schoolName: string, institutionType?: string | null) {
  if (institutionType !== "public" || !schoolName) return "";
  const match = PUBLIC_UNIVERSITIES.find((u) => u.label === schoolName);
  return match?.value ?? PUBLIC_UNIVERSITY_OTHER;
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

  const levelOptions = useMemo(() => educationLevels(catalog), [catalog]);
  const isUni = isUniversityLevel(form.educationLevel, catalog);
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
    if (isUniversityLevel(form.educationLevel, catalog)) {
      return universityFields(catalog, form.fieldGroup, form.educationLevel);
    }
    return [];
  }, [catalog, form.educationLevel, form.fieldGroup]);

  const showField = needsFieldOfStudy(form.educationLevel, catalog);
  const showGroup = needsFieldGroup(form.educationLevel, catalog);
  const showDetail = Boolean(form.educationLevel) && !isUni;
  const showInstitution = institutionScope(form.educationLevel, catalog) != null;
  const isElementary = isElementaryLevel(form.educationLevel);
  const showOther =
    (isUni || form.educationLevel === "high") && form.fieldOfStudy === OTHER;
  const endYearRequired = !form.currentlyStudying;
  const isPublicUni = isUni && isPublicUniversityInstitution(form.institutionType);
  const showPublicOther = isPublicUni && form.publicUniversity === PUBLIC_UNIVERSITY_OTHER;
  const nameLabel = t(schoolNameLabelKey(form.educationLevel, form.institutionType, catalog));
  const typeLabel = t(institutionTypeLabelKey(form.educationLevel, catalog));

  const publicUniversityOptions = useMemo(
    () => [
      ...PUBLIC_UNIVERSITIES.map((u) => ({
        value: u.value,
        label: u.label,
        imageUrl: u.logo,
      })),
      { value: PUBLIC_UNIVERSITY_OTHER, label: "سایر" },
    ],
    [],
  );

  const unitLogo =
    form.institutionType === "azad" ||
    form.institutionType === "payame_noor" ||
    form.institutionType === "applied_science"
      ? SYSTEM_UNI_LOGOS[form.institutionType]
      : undefined;

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(row: EducationHistory) {
    setEditing(row);
    const level = formLevelFromRow(row.educationLevel, row.educationDetail, catalog);
    const fieldList =
      level === "high"
        ? highSchoolFields(catalog)
        : universityFields(catalog, row.fieldGroup || "", row.educationDetail || level);
    const fieldCode = codeForLabel(fieldList.filter((f) => !f.separator), row.fieldOfStudy);
    const institutionType = row.institutionType || "";
    const uni = isUniversityLevel(level, catalog);
    setForm({
      schoolName: row.schoolName,
      institutionType,
      publicUniversity: resolvePublicUniversity(row.schoolName, institutionType),
      educationLevel: level,
      educationDetail: uni ? level : row.educationDetail || "",
      fieldGroup: row.fieldGroup || "",
      fieldOfStudy: fieldCode || (row.fieldOfStudy ? OTHER : ""),
      fieldOfStudyOther: fieldCode ? "" : row.fieldOfStudy || "",
      specialization: row.specialization || "",
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
    const uni = isUniversityLevel(level, catalog);
    setForm((f) => ({
      ...f,
      educationLevel: level,
      educationDetail: uni ? level : "",
      institutionType: "",
      publicUniversity: "",
      schoolName: "",
      fieldGroup: "",
      fieldOfStudy: "",
      fieldOfStudyOther: "",
      specialization: "",
      grade: "",
    }));
  }

  function setInstitutionType(institutionType: string) {
    setForm((f) => ({
      ...f,
      institutionType,
      publicUniversity: "",
      schoolName: "",
    }));
  }

  function setPublicUniversity(value: string) {
    if (value === PUBLIC_UNIVERSITY_OTHER) {
      setForm((f) => ({
        ...f,
        publicUniversity: value,
        schoolName: "",
      }));
      return;
    }
    const uni = PUBLIC_UNIVERSITIES.find((u) => u.value === value);
    setForm((f) => ({
      ...f,
      publicUniversity: value,
      schoolName: uni?.label ?? "",
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (isPublicUni && isBlank(form.publicUniversity)) {
      toast.error(t("panel.publicUniversitySelect"));
      return;
    }
    if (isBlank(form.schoolName)) {
      toast.error(nameLabel);
      return;
    }
    if (!isValidYear(form.startYear)) {
      toast.error(t("panel.yearInvalid"));
      return;
    }
    if (endYearRequired) {
      if (isBlank(form.endYear)) {
        toast.error(t("panel.endYearRequired"));
        return;
      }
      if (!isValidYear(form.endYear)) {
        toast.error(t("panel.yearInvalid"));
        return;
      }
    } else if (form.endYear && !isValidYear(form.endYear)) {
      toast.error(t("panel.yearInvalid"));
      return;
    }
    if (!isElementary && form.grade.trim() && !isValidNumericGrade(form.grade)) {
      toast.error(t("panel.gradeInvalid"));
      return;
    }
    setBusy(true);
    try {
      const degree = isUni
        ? labelOf(universityDegreeOptions(catalog), form.educationLevel) ||
          labelOf(levelOptions, form.educationLevel)
        : labelOf(detailOptions, form.educationDetail) ||
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
        specialization: showGroup ? form.specialization.trim() || undefined : undefined,
        degree: degree || t("panel.degree"),
        educationLevel: isUni ? "university" : form.educationLevel || undefined,
        educationDetail: isUni ? form.educationLevel : form.educationDetail || undefined,
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

      <div className="mt-6 space-y-3">
        {rows.map((row) => {
          const logo = educationLogoUrl(row.institutionType, row.schoolName);
          const hasCert = Boolean(row.certificateUrl);
          const fieldLine = [row.degree, row.fieldOfStudy].filter(Boolean).join(" · ");
          const yearsLabel = row.currentlyStudying
            ? `از ${faNum(String(row.startYear))} ${t("panel.present")}`
            : `از ${faNum(String(row.startYear))} تا ${faNum(
                row.endYear != null ? String(row.endYear) : "",
              )}`;
          return (
            <div key={row.id} className="glass-card-static p-1">
              <div className="glass-inner !m-2 !p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/70 p-1.5 ring-1 ring-black/5 dark:bg-white/10">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <GraduationCap size={22} className="text-accent-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-bold leading-snug text-[var(--zy-ink)]">{row.schoolName}</p>
                      {fieldLine ? (
                        <p className="text-sm leading-snug text-[var(--zy-muted)]">{fieldLine}</p>
                      ) : null}
                      <p className="text-sm text-[var(--zy-muted)]" dir="rtl">
                        {t("panel.grade")}:{" "}
                        <span className="tabular-nums">
                          {row.grade?.trim() ? faNum(row.grade) : "—"}
                        </span>
                        <span className="mx-1.5 text-[var(--zy-muted)]/45" aria-hidden>
                          |
                        </span>
                        <span className="tabular-nums">{yearsLabel}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="cursor-pointer rounded-lg p-2 text-accent-600 hover:bg-accent-500/10"
                        aria-label={t("panel.editEducation")}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(row.id)}
                        className="cursor-pointer rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                        aria-label={t("common.delete")}
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
        title={editing ? t("panel.editEducation") : t("panel.addEducation")}
        wide
      >
        <form onSubmit={save} className="space-y-3">
          {/* Row 1: level + (detail | field group | high: پایه+رشته) */}
          <div
            className={`grid grid-cols-1 gap-3 ${
              form.educationLevel === "high"
                ? "sm:grid-cols-3"
                : showGroup || showDetail
                  ? "sm:grid-cols-2"
                  : ""
            }`}
          >
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

            {showGroup ? (
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
            ) : null}

            {showDetail ? (
              <label className="text-sm">
                <span className={fieldLabelClass(isBlank(form.educationDetail))}>
                  {educationDetailLabel(form.educationLevel, catalog)}
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
            ) : null}

            {form.educationLevel === "high" ? (
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
                  invalid={isBlank(form.fieldOfStudy)}
                />
              </label>
            ) : null}
          </div>

          {/* University: field + specialization */}
          {showGroup && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <label className="text-sm">
                <span className="text-[var(--zy-muted)]">
                  {t("panel.specialization")}{" "}
                  <span className="text-xs opacity-70">({t("common.optional")})</span>
                </span>
                <input
                  className={fieldInputClass(false)}
                  value={form.specialization}
                  onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                  placeholder={t("panel.specializationPlaceholder")}
                />
              </label>
            </div>
          )}

          {/* Other field — own row */}
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

          {/* Row: institution type + name / public university */}
          <div
            className={`grid grid-cols-1 gap-3 ${showInstitution && !isHawzaLevel(form.educationLevel) ? "sm:grid-cols-2" : ""}`}
          >
            {showInstitution && (
              <label className="text-sm">
                <span className={fieldLabelClass(isBlank(form.institutionType))}>{typeLabel}</span>
                <GlassSelect
                  value={form.institutionType}
                  onChange={setInstitutionType}
                  placeholder={t("panel.educationDetailSelect")}
                  options={institutionOptions}
                  invalid={isBlank(form.institutionType)}
                />
              </label>
            )}

            {isPublicUni ? (
              <label className="text-sm">
                <span className={fieldLabelClass(isBlank(form.publicUniversity))}>
                  {t("panel.publicUniversity")}
                </span>
                <GlassSelect
                  value={form.publicUniversity}
                  onChange={setPublicUniversity}
                  placeholder={t("panel.publicUniversitySelect")}
                  options={publicUniversityOptions}
                  searchable
                  invalid={isBlank(form.publicUniversity)}
                />
              </label>
            ) : (
              <label className="text-sm">
                <span className={fieldLabelClass(isBlank(form.schoolName))}>{nameLabel}</span>
                <div className="relative">
                  {unitLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={unitLogo}
                      alt=""
                      className="pointer-events-none absolute top-1/2 z-10 h-6 w-6 -translate-y-1/2 object-contain object-center"
                      style={{ insetInlineStart: "0.75rem" }}
                    />
                  ) : null}
                  <input
                    className={fieldInputClass(isBlank(form.schoolName))}
                    style={unitLogo ? { paddingInlineStart: "2.75rem" } : undefined}
                    value={form.schoolName}
                    onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                    required={!isPublicUni}
                  />
                </div>
              </label>
            )}
          </div>

          {showPublicOther && (
            <label className="block text-sm">
              <span className={fieldLabelClass(isBlank(form.schoolName))}>
                {t("panel.publicUniversityOther")}
              </span>
              <input
                className={fieldInputClass(isBlank(form.schoolName))}
                value={form.schoolName}
                onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                required
              />
            </label>
          )}

          {/* Years + GPA — one row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="min-w-0 text-sm">
              <span className={fieldLabelClass(isBlank(form.startYear) || !isValidYear(form.startYear))}>
                {t("panel.startYear")}
              </span>
              <input
                className={fieldInputClass(isBlank(form.startYear) || !isValidYear(form.startYear))}
                value={form.startYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                }
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                dir="ltr"
                required
              />
            </label>

            <label className="min-w-0 text-sm">
              <span
                className={fieldLabelClass(
                  endYearRequired && (isBlank(form.endYear) || !isValidYear(form.endYear)),
                )}
              >
                {t("panel.endYear")}
              </span>
              <input
                className={fieldInputClass(
                  endYearRequired && (isBlank(form.endYear) || !isValidYear(form.endYear)),
                )}
                value={form.endYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))
                }
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                dir="ltr"
                disabled={form.currentlyStudying}
              />
            </label>

            <label
              className={`min-w-0 text-sm ${
                isElementary ? "sm:w-[9.5rem]" : "sm:w-[6.75rem]"
              }`}
            >
              <span className="text-[var(--zy-muted)]">{t("panel.grade")}</span>
              {isElementary ? (
                <GlassSelect
                  value={form.grade}
                  onChange={(v) => setForm((f) => ({ ...f, grade: v }))}
                  placeholder={t("panel.gradeSelect")}
                  options={ELEMENTARY_GRADES}
                />
              ) : (
                <input
                  className={fieldInputClass(
                    Boolean(form.grade.trim()) && !isValidNumericGrade(form.grade),
                  )}
                  value={form.grade}
                  onChange={(e) => {
                    let v = e.target.value.replace(/[^\d.]/g, "");
                    const parts = v.split(".");
                    if (parts.length > 2) v = `${parts[0]}.${parts.slice(1).join("")}`;
                    if (parts[0] && parts[0].length > 2) {
                      v = `${parts[0].slice(0, 2)}${parts.length > 1 ? `.${parts.slice(1).join("")}` : ""}`;
                    }
                    setForm((f) => ({ ...f, grade: v }));
                  }}
                  inputMode="decimal"
                  autoComplete="off"
                  dir="ltr"
                  placeholder="0–20"
                />
              )}
            </label>
          </div>

          <ZyCheckbox
            label={t("panel.currentlyStudying")}
            checked={form.currentlyStudying}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                currentlyStudying: e.target.checked,
                endYear: e.target.checked ? "" : f.endYear,
              }))
            }
          />

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
