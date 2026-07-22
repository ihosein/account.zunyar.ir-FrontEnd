"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Trash2 } from "lucide-react";
import clsx from "clsx";
import { isUploadLimitError, prepareUpload } from "@/lib/image-upload";
import { t } from "@/lib/i18n";
import { toast } from "@/lib/toast";

export const DEFAULT_AVATAR = "/images/default-avatar.svg";

type ProfileAvatarProps = {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  className?: string;
};

export function ProfileAvatar({ value, onChange, className }: ProfileAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const src = value || DEFAULT_AVATAR;
  const hasCustom = Boolean(value);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const prepared = await prepareUpload(file);
      onChange(prepared.dataUrl);
    } catch (err) {
      toast.error(
        isUploadLimitError(err) ? t("common.uploadTooLarge") : t("common.uploadFailed"),
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={clsx("flex flex-col items-center gap-3", className)}>
      <div className="relative">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="group relative h-36 w-36 overflow-hidden rounded-full border-2 border-[var(--zy-border)] bg-accent-500/10 shadow-sm transition hover:border-accent-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 sm:h-40 sm:w-40"
          title={hasCustom ? t("panel.changePhoto") : t("panel.uploadPhoto")}
        >
          <Image
            src={src}
            alt={t("panel.profilePhoto")}
            fill
            unoptimized
            className="object-cover"
            sizes="160px"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
            <span className="flex items-center gap-1.5 rounded-full bg-[var(--zy-surface-solid)]/95 px-3 py-1.5 text-xs font-semibold text-[var(--zy-ink)] opacity-0 shadow transition group-hover:opacity-100">
              <Camera size={14} className="text-accent-600 dark:text-accent-400" />
              {hasCustom ? t("panel.changePhoto") : t("panel.uploadPhoto")}
            </span>
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-accent-500/35 bg-accent-500/10 px-3 py-1.5 text-xs font-semibold text-accent-700 transition hover:bg-accent-500/15 dark:text-accent-300"
        >
          <Camera size={14} />
          {hasCustom ? t("panel.changePhoto") : t("panel.uploadPhoto")}
        </button>
        {hasCustom ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              onChange(undefined);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
          >
            <Trash2 size={14} />
            {t("panel.removePhoto")}
          </button>
        ) : null}
      </div>
      <p className="whitespace-pre-line text-center text-[11px] leading-relaxed text-[var(--zy-muted)]">
        {t("panel.profilePhotoHint")}
      </p>
    </div>
  );
}
