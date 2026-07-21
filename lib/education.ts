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

export function isUniversityLevel(level: string) {
  return (
    level === "university_student" ||
    level === "university_graduate" ||
    level === "university" // legacy
  );
}

export function isHawzaLevel(level: string) {
  return level === "hawza";
}

export function needsFieldOfStudy(level: string) {
  return level === "high" || isUniversityLevel(level);
}

export function needsFieldGroup(level: string) {
  return isUniversityLevel(level);
}

export function institutionScope(level: string): "school" | "university" | null {
  if (isSchoolLevel(level)) return "school";
  if (isUniversityLevel(level)) return "university";
  return null;
}

export function schoolNameLabelKey(level: string): string {
  if (isHawzaLevel(level)) return "panel.schoolNameHawza";
  if (isUniversityLevel(level)) return "panel.schoolNameUniversity";
  if (isSchoolLevel(level)) return "panel.schoolNameSchool";
  return "panel.schoolName";
}

export function institutionTypeLabelKey(level: string): string {
  if (isUniversityLevel(level)) return "panel.institutionTypeUniversity";
  if (isSchoolLevel(level)) return "panel.institutionTypeSchool";
  return "panel.institutionType";
}

export function educationDetailLabel(level: string) {
  if (isSchoolLevel(level)) return "پایه / مدرک";
  if (isUniversityLevel(level)) return "مقطع / مدرک";
  if (isHawzaLevel(level)) return "سطح";
  return "مقطع / مدرک";
}

export function normalizeLevel(level?: string | null) {
  if (level === "university") return "university_graduate";
  return level || "";
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
  const key = normalizeLevel(level);
  return catalog.detailsByLevel[key] || catalog.detailsByLevel[level] || [];
}

export function institutionTypesForLevel(catalog: EducationCatalog | null, level: string) {
  const scope = institutionScope(level);
  if (!catalog || !scope) return [];
  return catalog.institutionTypesByScope[scope] || [];
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
