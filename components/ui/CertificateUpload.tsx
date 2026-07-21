"use client";

import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { t } from "@/lib/i18n";

/** Optional certificate/document picker — stores a data-URL or clears. */
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
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange(String(reader.result || ""));
            reader.readAsDataURL(file);
          }}
        />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-sm text-[var(--zy-ink)] hover:bg-accent-500/10"
        >
          <Paperclip size={14} />
          {value ? t("panel.changeFile") : t("panel.uploadFile")}
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
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10"
              title={t("common.delete")}
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
