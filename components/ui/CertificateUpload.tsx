"use client";

import { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { isUploadLimitError, prepareUpload } from "@/lib/image-upload";
import { t } from "@/lib/i18n";
import { toast } from "@/lib/toast";

/** Optional certificate/document picker — images are compressed; max 512KB. */
export function CertificateUpload({
  value,
  onChange,
  label,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

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
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <div className="text-sm">
      <span className="text-[var(--zy-muted)]">
        {label || t("panel.certificate")}{" "}
        <span className="text-xs opacity-70">({t("common.optional")})</span>
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <input
          ref={ref}
          type="file"
          accept="image/*,.pdf,application/pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-sm text-[var(--zy-ink)] hover:bg-accent-500/10 disabled:opacity-50"
        >
          <Paperclip size={14} />
          {busy ? t("common.loading") : value ? t("panel.changeFile") : t("panel.uploadFile")}
        </button>
        {value && (
          <>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-accent-600 hover:underline"
            >
              {t("panel.viewFile")}
            </a>
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                if (ref.current) ref.current.value = "";
              }}
              className="cursor-pointer rounded-lg p-1.5 text-red-500 hover:bg-red-500/10"
              title={t("common.delete")}
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
      <p className="mt-1 text-[11px] text-[var(--zy-muted)]">{t("common.uploadLimitHint")}</p>
    </div>
  );
}
