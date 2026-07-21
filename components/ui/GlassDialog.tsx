"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function GlassDialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="close-backdrop"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`glass-card relative z-10 w-full max-h-[90vh] overflow-hidden ${wide ? "max-w-3xl" : "max-w-lg"}`}
      >
        <div className="glass-inner !m-2 !p-0 max-h-[calc(90vh-1rem)] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-[var(--zy-border)] px-5 py-4">
            <h2 className="text-lg font-bold text-[var(--zy-ink)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-[var(--zy-muted)] hover:bg-accent-500/10"
            >
              <X size={18} />
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
