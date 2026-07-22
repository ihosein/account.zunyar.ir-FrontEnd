"use client";

import { useMemo, useState } from "react";
import { Clock3, Play, Video } from "lucide-react";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { t } from "@/lib/i18n";
import {
  hasPlayableSource,
  TUTORIAL_VIDEOS,
  type TutorialVideo,
} from "@/lib/tutorials";

function durationLabel(minutes: number | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  return t("tutorials.duration", { minutes });
}

function VideoThumb({ video }: { video: TutorialVideo }) {
  const playable = hasPlayableSource(video);
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-accent-500/10">
      {video.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={video.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-accent-600/70 dark:text-accent-400/70">
          <Video size={32} strokeWidth={1.5} />
          {!playable ? (
            <span className="text-[11px] font-medium text-[var(--zy-muted)]">
              {t("tutorials.placeholderThumb")}
            </span>
          ) : null}
        </div>
      )}
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/35 via-transparent to-transparent"
        aria-hidden
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white shadow-lg backdrop-blur-sm">
          <Play size={18} className="ms-0.5" fill="currentColor" />
        </span>
      </span>
    </div>
  );
}

function VideoPlayer({ video }: { video: TutorialVideo }) {
  if (video.source.kind === "embed") {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          title={t(video.titleKey)}
          src={video.source.url}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (video.source.kind === "local") {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <video
          className="h-full w-full"
          controls
          playsInline
          poster={video.thumbnailUrl}
          src={video.source.path}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-accent-500/10 text-center">
      <Video size={36} className="text-accent-500" strokeWidth={1.5} />
      <p className="max-w-xs px-4 text-sm text-[var(--zy-muted)]">{t("tutorials.notReady")}</p>
    </div>
  );
}

export default function TutorialsPage() {
  const videos = useMemo(() => TUTORIAL_VIDEOS, []);
  const [active, setActive] = useState<TutorialVideo | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("tutorials.pageTitle")}</h1>
      <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("tutorials.pageHint")}</p>

      {videos.length === 0 ? (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Video size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("tutorials.empty")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {videos.map((video) => {
            const duration = durationLabel(video.durationMinutes);
            return (
              <article key={video.id} className="glass-card p-1">
                <div className="glass-inner !m-2 !p-3">
                  <button
                    type="button"
                    onClick={() => setActive(video)}
                    className="group w-full cursor-pointer text-start"
                  >
                    <VideoThumb video={video} />
                    <div className="mt-3 space-y-1.5 px-1 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-bold text-[var(--zy-ink)] transition group-hover:text-accent-700 dark:group-hover:text-accent-300">
                          {t(video.titleKey)}
                        </h2>
                        {duration ? (
                          <span className="zy-chip shrink-0 !px-2 !py-0.5 text-[11px]">
                            <Clock3 size={12} />
                            {duration}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm leading-6 text-[var(--zy-muted)]">
                        {t(video.descriptionKey)}
                      </p>
                    </div>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <GlassDialog
        open={Boolean(active)}
        onClose={() => setActive(null)}
        title={active ? t(active.titleKey) : t("tutorials.pageTitle")}
        wide
      >
        {active ? (
          <div className="space-y-3">
            <VideoPlayer video={active} />
            <p className="text-sm leading-6 text-[var(--zy-muted)]">
              {t(active.descriptionKey)}
            </p>
          </div>
        ) : null}
      </GlassDialog>
    </div>
  );
}
