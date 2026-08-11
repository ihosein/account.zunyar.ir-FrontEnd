/** Public resume slug helpers + profile snapshot (local until public API exists). */

import { faNum, t } from "@/lib/i18n";
import type { EducationHistory, Skill, User, WorkExperience } from "@/types/account";

const STORAGE_KEY = "zy-resume-slug";
const PROFILE_STORAGE_KEY = "zy-resume-profile";

/** Reserved system slugs — cannot be claimed. */
export const TAKEN_RESUME_SLUGS = new Set([
  "admin",
  "support",
  "panel",
  "api",
  "login",
]);

export const RESUME_PUBLIC_HOST = "account.zunyar.ir";

export function normalizeResumeSlug(raw: string): string {
  let value = raw.trim();
  try {
    if (/%[0-9A-Fa-f]{2}/.test(value)) {
      value = decodeURIComponent(value);
    }
  } catch {
    // keep original
  }
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06ff-]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

/** Prefill slug from user name (sanitized for URL). */
export function slugFromUserName(
  firstName?: string | null,
  lastName?: string | null,
  fullName?: string | null,
): string {
  const fromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
  const source = fromParts || (fullName || "").trim();
  return normalizeResumeSlug(source);
}

export function isValidResumeSlug(slug: string): boolean {
  if (!slug || slug.length < 3) return false;
  return /^[a-z0-9\u0600-\u06ff]+(?:-[a-z0-9\u0600-\u06ff]+)*$/i.test(slug);
}

export function loadStoredResumeSlug(): string {
  if (typeof window === "undefined") return "";
  try {
    return normalizeResumeSlug(localStorage.getItem(STORAGE_KEY) || "");
  } catch {
    return "";
  }
}

export function saveStoredResumeSlug(slug: string) {
  const n = normalizeResumeSlug(slug);
  localStorage.setItem(STORAGE_KEY, n);
  return n;
}

export function isResumeSlugAvailable(slug: string, currentOwn?: string): boolean {
  const n = normalizeResumeSlug(slug);
  if (!n) return false;
  if (currentOwn && n === normalizeResumeSlug(currentOwn)) return true;
  return !TAKEN_RESUME_SLUGS.has(n);
}

/**
 * Public resume path. Non-ASCII namaks are percent-encoded so browsers,
 * messengers, and reverse proxies don't break the link.
 */
export function publicResumeUrl(slug: string, absolute = false): string {
  const n = normalizeResumeSlug(slug);
  const path = `/${encodeURIComponent(n)}`;
  if (!absolute) return path;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return `https://${RESUME_PUBLIC_HOST}${path}`;
}

export type PublicResumeDemo = {
  slug: string;
  fullName: string;
  title: string;
  city?: string;
  phone?: string;
  email?: string;
  about?: string;
  avatar?: string;
  education: { school: string; degree: string; field?: string; years: string }[];
  experience: { company: string; title: string; years: string; description?: string }[];
  skills: { name: string; level: string }[];
};

const PROF_LABEL: Record<string, string> = {
  BEGINNER: "panel.profBeginner",
  INTERMEDIATE: "panel.profIntermediate",
  ADVANCED: "panel.profAdvanced",
  EXPERT: "panel.profExpert",
};

function yearFromDate(value?: string | null): string {
  if (!value) return "";
  const m = String(value).match(/(\d{4})/);
  return m?.[1] ?? "";
}

function skillLevelLabel(code: string): string {
  const key = PROF_LABEL[code];
  return key ? t(key) : code;
}

function displayFullName(user: User | null | undefined): string {
  if (!user) return "";
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.fullName?.trim() ||
    ""
  );
}

/** Build public resume payload from auth user + resume API rows. */
export function buildResumeFromProfile(
  slug: string,
  user: User | null | undefined,
  education: EducationHistory[],
  skills: Skill[],
  experience: WorkExperience[],
): PublicResumeDemo {
  const n = normalizeResumeSlug(slug);
  const fullName = displayFullName(user) || n.replace(/-/g, " ");
  const headline =
    experience[0]?.title ||
    user?.educationDetail ||
    user?.educationLevel ||
    t("panel.resume");

  return {
    slug: n,
    fullName,
    title: headline,
    city: user?.city || undefined,
    phone: user?.phone || undefined,
    email: user?.email || undefined,
    avatar: user?.avatar || undefined,
    about: undefined,
    education: education.map((e) => ({
      school: e.schoolName,
      degree: e.degree || e.educationLevel || "",
      field: e.fieldOfStudy || e.educationDetail || undefined,
      years: `${faNum(String(e.startYear))} – ${
        e.currentlyStudying
          ? t("panel.present")
          : faNum(e.endYear != null ? String(e.endYear) : "")
      }`,
    })),
    experience: experience.map((e) => ({
      company: e.companyName,
      title: e.title,
      years: `${faNum(yearFromDate(e.startDate))} – ${
        e.currentlyWorking ? t("panel.present") : faNum(yearFromDate(e.endDate))
      }`,
      description: e.description || undefined,
    })),
    skills: skills.map((s) => ({
      name: s.name,
      level: skillLevelLabel(s.proficiency),
    })),
  };
}

export function saveStoredResumeProfile(profile: PublicResumeDemo) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // quota / private mode
  }
}

export function loadStoredResumeProfile(): PublicResumeDemo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicResumeDemo;
    if (!parsed?.slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getPublicResume(slug: string, fallbackName?: string): PublicResumeDemo | null {
  const n = normalizeResumeSlug(slug);
  if (!n) return null;

  const own = loadStoredResumeSlug();
  if (own && own === n) {
    const stored = loadStoredResumeProfile();
    if (stored && normalizeResumeSlug(stored.slug) === n) {
      return {
        ...stored,
        fullName: fallbackName || stored.fullName,
      };
    }
    return {
      slug: n,
      fullName: fallbackName || "کاربر زانیار",
      title: t("panel.resume"),
      education: [],
      experience: [],
      skills: [],
    };
  }

  // Unknown but valid-looking slug — empty shell (no junk demo)
  if (isValidResumeSlug(n)) {
    return {
      slug: n,
      fullName: fallbackName || n.replace(/-/g, " "),
      title: t("panel.resume"),
      about: undefined,
      education: [],
      experience: [],
      skills: [],
    };
  }
  return null;
}
