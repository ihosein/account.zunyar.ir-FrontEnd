"use client";

import { useCallback, useEffect, useRef } from "react";
import clsx from "clsx";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { t } from "@/lib/i18n";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  className?: string;
  minHeightClass?: string;
};

function exec(cmd: string, value?: string) {
  try {
    document.execCommand(cmd, false, value);
  } catch {
    // ignore
  }
}

/** ویرایشگر ساده HTML برای بدنه ایمیل (بولد، تراز، اندازه، لیست). */
export function EmailRichEditor({
  value,
  onChange,
  onFocus,
  className,
  minHeightClass = "min-h-[10rem]",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== lastEmitted.current && el.innerHTML !== value) {
      el.innerHTML = value || "";
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = el.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  const run = (cmd: string, val?: string) => {
    ref.current?.focus();
    exec(cmd, val);
    emit();
  };

  const setSize = (px: string) => {
    ref.current?.focus();
    exec("fontSize", "3");
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll('font[size="3"]').forEach((node) => {
      const span = document.createElement("span");
      span.style.fontSize = px;
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
    emit();
  };

  /** درج متن در محل نشانگر (برای پارامترها). */
  const insertText = useCallback(
    (text: string) => {
      ref.current?.focus();
      exec("insertText", text);
      emit();
    },
    [emit],
  );

  // expose insert via dataset for parent optional use — parent uses ref callback instead
  useEffect(() => {
    const el = ref.current as (HTMLDivElement & { __insertText?: (t: string) => void }) | null;
    if (el) el.__insertText = insertText;
  }, [insertText]);

  const btnClass =
    "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-[var(--zy-border)] text-[var(--zy-ink)] transition hover:bg-accent-500/10 disabled:opacity-40";

  return (
    <div className={clsx("overflow-hidden rounded-xl border border-[var(--zy-border)]", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--zy-border)] bg-[var(--zy-surface)]/50 p-1.5">
        <button type="button" className={btnClass} title={t("admin.emailFmtBold")} onClick={() => run("bold")}>
          <Bold size={14} />
        </button>
        <button type="button" className={btnClass} title={t("admin.emailFmtItalic")} onClick={() => run("italic")}>
          <Italic size={14} />
        </button>
        <button
          type="button"
          className={btnClass}
          title={t("admin.emailFmtUnderline")}
          onClick={() => run("underline")}
        >
          <Underline size={14} />
        </button>
        <span className="mx-0.5 h-5 w-px bg-[var(--zy-border)]" />
        <button
          type="button"
          className={btnClass}
          title={t("admin.emailFmtAlignRight")}
          onClick={() => run("justifyRight")}
        >
          <AlignRight size={14} />
        </button>
        <button
          type="button"
          className={btnClass}
          title={t("admin.emailFmtAlignCenter")}
          onClick={() => run("justifyCenter")}
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          className={btnClass}
          title={t("admin.emailFmtAlignLeft")}
          onClick={() => run("justifyLeft")}
        >
          <AlignLeft size={14} />
        </button>
        <span className="mx-0.5 h-5 w-px bg-[var(--zy-border)]" />
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[var(--zy-border)] px-2 text-[11px] font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10"
          onClick={() => setSize("12px")}
        >
          {t("admin.emailFmtSizeS")}
        </button>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[var(--zy-border)] px-2 text-[12px] font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10"
          onClick={() => setSize("14px")}
        >
          {t("admin.emailFmtSizeM")}
        </button>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-[var(--zy-border)] px-2 text-[13px] font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10"
          onClick={() => setSize("18px")}
        >
          {t("admin.emailFmtSizeL")}
        </button>
        <span className="mx-0.5 h-5 w-px bg-[var(--zy-border)]" />
        <button type="button" className={btnClass} title={t("admin.emailFmtList")} onClick={() => run("insertUnorderedList")}>
          <List size={14} />
        </button>
        <button
          type="button"
          className={btnClass}
          title={t("admin.emailFmtOrderedList")}
          onClick={() => run("insertOrderedList")}
        >
          <ListOrdered size={14} />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir="rtl"
        className={clsx(
          "email-rich-editor max-h-[20rem] overflow-y-auto bg-[var(--zy-surface)]/30 px-3 py-2.5 text-sm leading-relaxed text-[var(--zy-ink)] outline-none",
          minHeightClass,
        )}
        onInput={emit}
        onFocus={onFocus}
        onBlur={emit}
      />
    </div>
  );
}

export type EmailRichEditorHandle = {
  insertText: (text: string) => void;
};

/** درج پارامتر در ویرایشگر فعال (اگر فوکوس روی contentEditable باشد). */
export function insertIntoActiveRichEditor(text: string): boolean {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const node = sel.anchorNode;
  const el =
    node instanceof HTMLElement
      ? node.closest(".email-rich-editor")
      : node?.parentElement?.closest(".email-rich-editor");
  if (!el) return false;
  try {
    document.execCommand("insertText", false, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}
