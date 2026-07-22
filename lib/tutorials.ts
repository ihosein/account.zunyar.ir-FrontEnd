/**
 * Educational / tutorial videos catalog for the account panel.
 * Replace placeholder entries with real embedUrl / thumbnailUrl / src when videos are ready.
 */

export type TutorialVideoSource =
  | { kind: "embed"; url: string }
  | { kind: "local"; path: string }
  | { kind: "none" };

export type TutorialVideo = {
  id: string;
  /** i18n key for title (under tutorials.*) */
  titleKey: string;
  /** i18n key for short description */
  descriptionKey: string;
  /** Optional duration in minutes */
  durationMinutes?: number;
  /** Optional poster / thumbnail image URL */
  thumbnailUrl?: string;
  /**
   * Video source:
   * - embed: YouTube/Vimeo (or similar) iframe URL
   * - local: path under /public or CDN file URL
   * - none: placeholder until a real video is plugged in
   */
  source: TutorialVideoSource;
};

/** Placeholder tutorials — swap `source` / thumbnails when real videos are available. */
export const TUTORIAL_VIDEOS: TutorialVideo[] = [
  {
    id: "account-login",
    titleKey: "tutorials.itemLoginTitle",
    descriptionKey: "tutorials.itemLoginDesc",
    durationMinutes: 3,
    source: { kind: "none" },
  },
  {
    id: "profile-complete",
    titleKey: "tutorials.itemProfileTitle",
    descriptionKey: "tutorials.itemProfileDesc",
    durationMinutes: 5,
    source: { kind: "none" },
  },
  {
    id: "apps-connect",
    titleKey: "tutorials.itemAppsTitle",
    descriptionKey: "tutorials.itemAppsDesc",
    durationMinutes: 4,
    source: { kind: "none" },
  },
  {
    id: "wallet-finance",
    titleKey: "tutorials.itemFinanceTitle",
    descriptionKey: "tutorials.itemFinanceDesc",
    durationMinutes: 6,
    source: { kind: "none" },
  },
];

export function hasPlayableSource(video: TutorialVideo): boolean {
  if (video.source.kind === "embed") return Boolean(video.source.url.trim());
  if (video.source.kind === "local") return Boolean(video.source.path.trim());
  return false;
}
