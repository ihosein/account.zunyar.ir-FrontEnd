"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import clsx from "clsx";
import { ImagePlus, Trash2 } from "lucide-react";
import { EmailRichEditor, insertIntoActiveRichEditor } from "@/components/admin/EmailRichEditor";
import { GlassSelect } from "@/components/ui/GlassSelect";
import {
  buildEmailPreviewHtml,
  EMAIL_BRAND_PRESETS,
  EMAIL_DEFAULTS,
  EMAIL_LOGO_LOCAL,
  type EmailBrandKey,
  type EmailComposeMode,
  type EmailTemplateFields,
} from "@/lib/email-template";
import { insertPlaceholder } from "@/lib/excel-params";
import { faNum, t } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { inputClass } from "@/lib/ui";

export type EmailComposerValue = EmailTemplateFields & {
  mode: EmailComposeMode;
};

type Props = {
  value: EmailComposerValue;
  onChange: (next: EmailComposerValue) => void;
  onInsertTargetChange?: (target: "subject" | "headline" | "body" | "footer") => void;
  insertTarget?: "subject" | "headline" | "body" | "footer";
  insertParamRef?: MutableRefObject<((name: string) => void) | null>;
};

const MAX_LOGO_BYTES = 220_000;

async function fileToLogoDataUri(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error(t("admin.emailBrandLogoInvalid"));
  }
  const bitmap = await createImageBitmap(file);
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(t("common.error"));
  ctx.clearRect(0, 0, size, size);
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  bitmap.close();
  let dataUri = canvas.toDataURL("image/png");
  if (dataUri.length > MAX_LOGO_BYTES) {
    dataUri = canvas.toDataURL("image/jpeg", 0.82);
  }
  if (dataUri.length > MAX_LOGO_BYTES) {
    throw new Error(t("admin.emailBrandLogoTooLarge"));
  }
  return dataUri;
}

export function EmailComposer({
  value,
  onChange,
  onInsertTargetChange,
  insertTarget = "body",
  insertParamRef,
}: Props) {
  const patch = (partial: Partial<EmailComposerValue>) => onChange({ ...value, ...partial });
  const logoInputRef = useRef<HTMLInputElement>(null);

  const previewHtml = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://account.zunyar.ir";
    return buildEmailPreviewHtml(
      value.mode,
      {
        brandKey: value.brandKey,
        subject: value.subject,
        headline: value.headline,
        body: value.body,
        footer: value.footer,
        brandName: value.brandName,
        brandSubtitle: value.brandSubtitle,
        brandLogo: value.brandLogo,
      },
      {
        imagesBase: `${origin}/images`,
        documentBaseHref: `${origin}/`,
      },
    );
  }, [value]);

  useEffect(() => {
    if (!insertParamRef) return;
    insertParamRef.current = (name: string) => {
      if (value.mode === "template" && insertTarget === "body") {
        if (insertIntoActiveRichEditor(`{${name}}`)) return;
        patch({ body: insertPlaceholder(value.body, name).slice(0, 20000) });
        return;
      }
      if (insertTarget === "subject") {
        patch({ subject: insertPlaceholder(value.subject, name).slice(0, 200) });
      } else if (insertTarget === "headline") {
        patch({ headline: insertPlaceholder(value.headline, name).slice(0, 200) });
      } else if (insertTarget === "footer") {
        patch({ footer: insertPlaceholder(value.footer, name).slice(0, 2000) });
      } else {
        patch({ body: insertPlaceholder(value.body, name).slice(0, 20000) });
      }
    };
    return () => {
      insertParamRef.current = null;
    };
  });

  function applyBrandKey(key: EmailBrandKey) {
    if (key === "custom") {
      patch({ brandKey: "custom" });
      return;
    }
    const preset = EMAIL_BRAND_PRESETS[key];
    patch({
      brandKey: key,
      brandName: preset.brandName,
      brandSubtitle: preset.brandSubtitle,
      brandLogo: undefined,
    });
  }

  async function onLogoSelected(file: File | null) {
    if (!file) return;
    try {
      const dataUri = await fileToLogoDataUri(file);
      patch({ brandLogo: dataUri });
      toast.success(t("admin.emailBrandLogoUploaded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  const brandOptions = [
    {
      value: "account",
      label: t("admin.emailBrandAccount"),
      imageUrl: EMAIL_LOGO_LOCAL.zunyar,
    },
    {
      value: "zunyar",
      label: t("admin.emailBrandZunyar"),
      imageUrl: EMAIL_LOGO_LOCAL.zunyar,
    },
    {
      value: "zunko",
      label: t("admin.emailBrandZunko"),
      imageUrl: EMAIL_LOGO_LOCAL.zunko,
    },
    {
      value: "custom",
      label: t("admin.emailBrandCustom"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (value.mode === "template") return;
            patch({
              mode: "template",
              body: value.body.trim() ? value.body : EMAIL_DEFAULTS.bodyHtml,
              footer: value.footer || EMAIL_DEFAULTS.footer,
              brandKey: value.brandKey || EMAIL_DEFAULTS.brandKey,
              brandName: value.brandName || EMAIL_DEFAULTS.brandName,
              brandSubtitle:
                value.brandKey === "custom"
                  ? value.brandSubtitle
                  : value.brandSubtitle || EMAIL_DEFAULTS.brandSubtitle,
            });
          }}
          className={clsx(
            "inline-flex cursor-pointer items-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
            value.mode === "template"
              ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
              : "border-[var(--zy-border)] text-[var(--zy-muted)] hover:bg-accent-500/10",
          )}
        >
          {t("admin.emailModeTemplate")}
        </button>
        <button
          type="button"
          onClick={() => patch({ mode: "raw" })}
          className={clsx(
            "inline-flex cursor-pointer items-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
            value.mode === "raw"
              ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
              : "border-[var(--zy-border)] text-[var(--zy-muted)] hover:bg-accent-500/10",
          )}
        >
          {t("admin.emailModeRaw")}
        </button>
      </div>
      <p className="text-[11px] text-[var(--zy-muted)]">
        {value.mode === "template" ? t("admin.emailModeTemplateHint") : t("admin.emailModeRawHint")}
      </p>

      {value.mode === "template" ? (
        <>
          <div className="block text-sm">
            <span className="mb-1 block text-[var(--zy-muted)]">{t("admin.emailBrand")}</span>
            <GlassSelect
              value={value.brandKey || "account"}
              onChange={(v) => applyBrandKey(v as EmailBrandKey)}
              options={brandOptions}
            />
          </div>

          {value.brandKey === "custom" ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block text-sm">
                <span className="text-[var(--zy-muted)]">{t("admin.emailBrandName")}</span>
                <input
                  className={inputClass}
                  value={value.brandName}
                  onChange={(e) => patch({ brandName: e.target.value.slice(0, 120) })}
                  maxLength={120}
                  placeholder={EMAIL_DEFAULTS.brandName}
                />
              </label>
              <label className="block text-sm">
                <span className="text-[var(--zy-muted)]">{t("admin.emailBrandSubtitle")}</span>
                <input
                  className={inputClass}
                  value={value.brandSubtitle}
                  onChange={(e) => patch({ brandSubtitle: e.target.value.slice(0, 200) })}
                  maxLength={200}
                  dir="ltr"
                />
              </label>
              <div className="flex items-center gap-2 pb-0.5">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => void onLogoSelected(e.target.files?.[0] ?? null)}
                />
                {value.brandLogo ? (
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={value.brandLogo} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  title={t("admin.emailBrandLogoUpload")}
                  aria-label={t("admin.emailBrandLogoUpload")}
                  className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 text-xs font-semibold text-[var(--zy-ink)] transition hover:bg-accent-500/10"
                >
                  <ImagePlus size={16} />
                  {t("admin.emailBrandLogoUpload")}
                </button>
                {value.brandLogo ? (
                  <button
                    type="button"
                    onClick={() => patch({ brandLogo: undefined })}
                    title={t("admin.emailBrandLogoRemove")}
                    aria-label={t("admin.emailBrandLogoRemove")}
                    className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-red-500/30 text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[var(--zy-muted)]">{t("admin.emailSubject")}</span>
              <input
                className={inputClass}
                value={value.subject}
                onChange={(e) => patch({ subject: e.target.value.slice(0, 200) })}
                onFocus={() => onInsertTargetChange?.("subject")}
                maxLength={200}
                required
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--zy-muted)]">{t("admin.emailHeadline")}</span>
              <input
                className={inputClass}
                value={value.headline}
                onChange={(e) => patch({ headline: e.target.value.slice(0, 200) })}
                onFocus={() => onInsertTargetChange?.("headline")}
                maxLength={200}
                placeholder={t("admin.emailHeadlinePlaceholder")}
              />
            </label>
          </div>

          <div className="block text-sm">
            <span className="mb-1.5 block text-[var(--zy-muted)]">{t("admin.emailBody")}</span>
            <EmailRichEditor
              value={value.body}
              onChange={(html) => patch({ body: html.slice(0, 20000) })}
              onFocus={() => onInsertTargetChange?.("body")}
            />
            <span className="mt-1 block text-xs text-[var(--zy-muted)]">
              {t("admin.emailCharCount", { count: faNum(value.body.length) })}
            </span>
          </div>

          <label className="block text-sm">
            <span className="text-[var(--zy-muted)]">{t("admin.emailFooter")}</span>
            <textarea
              className={clsx(inputClass, "min-h-[4.5rem] resize-y")}
              value={value.footer}
              onChange={(e) => patch({ footer: e.target.value.slice(0, 2000) })}
              onFocus={() => onInsertTargetChange?.("footer")}
              maxLength={2000}
              placeholder={EMAIL_DEFAULTS.footer}
            />
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm">
            <span className="text-[var(--zy-muted)]">{t("admin.emailSubject")}</span>
            <input
              className={inputClass}
              value={value.subject}
              onChange={(e) => patch({ subject: e.target.value.slice(0, 200) })}
              onFocus={() => onInsertTargetChange?.("subject")}
              maxLength={200}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--zy-muted)]">{t("admin.emailRawHtml")}</span>
            <textarea
              className={clsx(inputClass, "min-h-[14rem] resize-y font-mono text-xs")}
              value={value.body}
              onChange={(e) => patch({ body: e.target.value.slice(0, 20000) })}
              onFocus={() => onInsertTargetChange?.("body")}
              maxLength={20000}
              dir="ltr"
              required
              spellCheck={false}
            />
            <span className="mt-1 block text-xs text-[var(--zy-muted)]">
              {t("admin.emailCharCount", { count: faNum(value.body.length) })}
            </span>
          </label>
        </>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold text-[var(--zy-ink)]">{t("admin.emailPreview")}</p>
        <div className="overflow-hidden rounded-xl border border-[var(--zy-border)] bg-[#eef3f6]">
          <iframe
            title={t("admin.emailPreview")}
            srcDoc={previewHtml}
            className="h-[420px] w-full bg-white"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}

export function createDefaultEmailComposer(): EmailComposerValue {
  const preset = EMAIL_BRAND_PRESETS.account;
  return {
    mode: "template",
    brandKey: "account",
    subject: "",
    headline: "",
    body: EMAIL_DEFAULTS.bodyHtml,
    footer: EMAIL_DEFAULTS.footer,
    brandName: preset.brandName,
    brandSubtitle: preset.brandSubtitle,
    brandLogo: undefined,
  };
}
