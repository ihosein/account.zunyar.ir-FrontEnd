/** Education catalog types + helpers (data comes from /api/resume/education-catalog). */

export type CatalogOption = {
  value: string;
  label: string;
  separator?: boolean;
  track?: string | null;
  groupCode?: string | null;
  scope?: string | null;
};

export type EducationCatalog = {
  levels: CatalogOption[];
  detailsByLevel: Record<string, CatalogOption[]>;
  institutionTypesByScope: Record<string, CatalogOption[]>;
  fieldGroups: CatalogOption[];
  fields: CatalogOption[];
};

export const OTHER = "other";

export function isSchoolLevel(level: string) {
  return level === "elementary" || level === "middle" || level === "high";
}

export function isUniversityLevel(level: string, catalog?: EducationCatalog | null) {
  if (
    level === "university" ||
    level === "university_student" || // legacy
    level === "university_graduate" // legacy
  ) {
    return true;
  }
  if (!catalog || !level) return false;
  return universityDegreeOptions(catalog).some((d) => d.value === level);
}

/** Qualitative grade options for elementary (دبستان) — no numeric GPA. */
export const ELEMENTARY_GRADES: CatalogOption[] = [
  { value: "نیاز به تلاش بیشتر", label: "نیاز به تلاش بیشتر" },
  { value: "قابل قبول (نیاز به آموز و تلاش)", label: "قابل قبول (نیاز به آموز و تلاش)" },
  { value: "خوب", label: "خوب" },
  { value: "خیلی خوب", label: "خیلی خوب" },
];

export function isElementaryLevel(level: string) {
  return level === "elementary";
}

/** University degree codes from catalog details (کارشناسی، ارشد، …). */
export function universityDegreeOptions(catalog: EducationCatalog | null): CatalogOption[] {
  if (!catalog) return [];
  const list =
    catalog.detailsByLevel.university ||
    catalog.detailsByLevel.university_graduate ||
    catalog.detailsByLevel.university_student ||
    [];
  return list.filter((d) => !d.separator);
}

/**
 * Top-level «مقطع تحصیلی» options:
 * school levels + حوزه, and after متوسطه دوم insert university degrees
 * (instead of a single «دانشگاه» entry).
 */
export function educationLevels(catalog: EducationCatalog | null): CatalogOption[] {
  if (!catalog) return [];
  const result: CatalogOption[] = [];
  let degreesInserted = false;
  const degrees = universityDegreeOptions(catalog);

  for (const level of catalog.levels) {
    if (
      level.value === "university" ||
      level.value === "university_student" ||
      level.value === "university_graduate"
    ) {
      continue;
    }
    if (level.value === "hawza") {
      result.push({ ...level, label: "حوزه" });
      continue;
    }
    result.push(level);
    if (level.value === "high" && !degreesInserted) {
      result.push(...degrees);
      degreesInserted = true;
    }
  }
  if (!degreesInserted && degrees.length) {
    result.push(...degrees);
  }
  return result;
}

/** Validate numeric معدل in range 0–20 (decimals allowed). */
export function isValidNumericGrade(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (!/^\d{1,2}(\.\d+)?$/.test(trimmed)) return false;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 && n <= 20;
}

/** Exactly 4 digit year (no separators). */
export function isValidYear(value: string) {
  return /^\d{4}$/.test(value.trim());
}

export function isHawzaLevel(level: string) {
  return level === "hawza";
}

export function needsFieldOfStudy(level: string, catalog?: EducationCatalog | null) {
  return level === "high" || isUniversityLevel(level, catalog);
}

export function needsFieldGroup(level: string, catalog?: EducationCatalog | null) {
  return isUniversityLevel(level, catalog);
}

export function institutionScope(
  level: string,
  catalog?: EducationCatalog | null,
): "school" | "university" | null {
  if (isSchoolLevel(level)) return "school";
  if (isUniversityLevel(level, catalog)) return "university";
  return null;
}

export function schoolNameLabelKey(
  level: string,
  institutionType?: string,
  catalog?: EducationCatalog | null,
): string {
  if (isHawzaLevel(level)) return "panel.schoolNameHawza";
  if (isUniversityLevel(level, catalog)) {
    if (
      institutionType === "azad" ||
      institutionType === "payame_noor" ||
      institutionType === "applied_science"
    ) {
      return "panel.schoolNameUnit";
    }
    return "panel.schoolNameUniversity";
  }
  if (isSchoolLevel(level)) return "panel.schoolNameSchool";
  return "panel.schoolName";
}

/** Institution types that use a free-text «نام واحد» instead of university name. */
export function isUnitInstitution(institutionType: string) {
  return (
    institutionType === "azad" ||
    institutionType === "payame_noor" ||
    institutionType === "applied_science"
  );
}

export function isPublicUniversityInstitution(institutionType: string) {
  return institutionType === "public";
}

export function institutionTypeLabelKey(level: string, catalog?: EducationCatalog | null): string {
  if (isUniversityLevel(level, catalog)) return "panel.institutionTypeUniversity";
  if (isSchoolLevel(level)) return "panel.institutionTypeSchool";
  return "panel.institutionType";
}

export function educationDetailLabel(level: string, catalog?: EducationCatalog | null) {
  if (isSchoolLevel(level)) return "پایه";
  if (isUniversityLevel(level, catalog)) return "مقطع";
  if (isHawzaLevel(level)) return "سطح";
  return "مقطع";
}

export function normalizeLevel(level?: string | null) {
  if (
    level === "university" ||
    level === "university_student" ||
    level === "university_graduate"
  ) {
    return "university";
  }
  return level || "";
}

/** Value for the top-level level select when editing a saved row. */
export function formLevelFromRow(
  educationLevel: string | null | undefined,
  educationDetail: string | null | undefined,
  catalog: EducationCatalog | null,
) {
  const level = normalizeLevel(educationLevel);
  if (level === "university" && educationDetail) return educationDetail;
  if (isUniversityLevel(level, catalog)) return level;
  return level;
}

function scopeMatches(scope: string | null | undefined, token: string) {
  if (!scope) return true;
  return scope
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(token);
}

export function labelOf(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function detailsForLevel(catalog: EducationCatalog | null, level: string) {
  if (!catalog || !level) return [];
  // Degree codes are themselves the «مقطع» — no nested detail list.
  if (
    level !== "university" &&
    level !== "university_student" &&
    level !== "university_graduate" &&
    universityDegreeOptions(catalog).some((d) => d.value === level)
  ) {
    return [];
  }
  const key = normalizeLevel(level);
  if (key === "university") {
    return (
      catalog.detailsByLevel.university ||
      catalog.detailsByLevel.university_graduate ||
      catalog.detailsByLevel.university_student ||
      []
    );
  }
  return catalog.detailsByLevel[key] || catalog.detailsByLevel[level] || [];
}

export function institutionTypesForLevel(catalog: EducationCatalog | null, level: string) {
  const scope = institutionScope(level, catalog);
  if (!catalog || !scope) return [];
  return (catalog.institutionTypesByScope[scope] || []).filter(
    (o) => o.value !== "campus" && o.value !== "international",
  );
}

/** High-school fields with separators (no "other"). */
export function highSchoolFields(catalog: EducationCatalog | null): CatalogOption[] {
  if (!catalog) return [];
  return catalog.fields.filter(
    (f) => f.separator || scopeMatches(f.scope, "high") || f.scope === "high",
  );
}

/** University field groups. */
export function universityFieldGroups(catalog: EducationCatalog | null) {
  if (!catalog) return [];
  return catalog.fieldGroups;
}

/** Fields for a university group + selected degree detail. */
export function universityFields(
  catalog: EducationCatalog | null,
  groupCode: string,
  detailCode: string,
): CatalogOption[] {
  if (!catalog || !groupCode) return [];
  return catalog.fields.filter((f) => {
    if (f.separator) return false;
    if (f.groupCode !== groupCode) return false;
    if (!detailCode) return true;
    return scopeMatches(f.scope, detailCode);
  });
}
