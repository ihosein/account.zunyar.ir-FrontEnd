"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import clsx from "clsx";

export type ToastVariant = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  leaving?: boolean;
};

type ToastApi = {
  show: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

type Listener = (item: Omit<ToastItem, "id" | "leaving">) => void;
const listeners = new Set<Listener>();

function emit(message: string, variant: ToastVariant = "info") {
  const payload = { message, variant };
  listeners.forEach((fn) => fn(payload));
}

/** Imperative toast API — usable outside React components. */
export const toast: ToastApi = {
  show: (message, variant = "info") => emit(message, variant),
  success: (message) => emit(message, "success"),
  error: (message) => emit(message, "error"),
  info: (message) => emit(message, "info"),
  warning: (message) => emit(message, "warning"),
};

const VARIANT_UI: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; tone: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    tone: "zy-toast--success",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: XCircle,
    tone: "zy-toast--error",
    iconClass: "text-red-500",
  },
  info: {
    icon: Info,
    tone: "zy-toast--info",
    iconClass: "text-accent-600 dark:text-accent-400",
  },
  warning: {
    icon: AlertCircle,
    tone: "zy-toast--warning",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
};

const AUTO_MS = 4200;
const EXIT_MS = 320;

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const ui = VARIANT_UI[item.variant];
  const Icon = ui.icon;

  return (
    <div
      role="status"
      className={clsx(
        "zy-toast pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3.5",
        "text-[var(--zy-ink)]",
        item.leaving ? "zy-toast--out" : "zy-toast--in",
        ui.tone,
      )}
    >
      <Icon size={18} className={clsx("mt-0.5 shrink-0", ui.iconClass)} />
      <p className="min-w-0 flex-1 text-sm leading-relaxed">{item.message}</p>
      <button
        type="button"
        aria-label="close"
        onClick={() => onDismiss(item.id)}
        className="shrink-0 rounded-lg p-1 text-[var(--zy-muted)] transition hover:bg-black/5 hover:text-[var(--zy-ink)] dark:hover:bg-white/10"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[900] flex flex-col items-center gap-2.5 px-4 pb-5 pt-2 sm:pb-7"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t != null) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const remove = useCallback(
    (id: string) => {
      clearTimer(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setItems((prev) => {
        const target = prev.find((t) => t.id === id);
        if (!target || target.leaving) return prev;
        return prev.map((t) => (t.id === id ? { ...t, leaving: true } : t));
      });
      const exitTimer = window.setTimeout(() => remove(id), EXIT_MS);
      timers.current.set(id, exitTimer);
    },
    [clearTimer, remove],
  );

  const push = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const text = message.trim();
      if (!text) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [...prev.filter((t) => !t.leaving).slice(-4), { id, message: text, variant }]);
      const autoTimer = window.setTimeout(() => dismiss(id), AUTO_MS);
      timers.current.set(id, autoTimer);
    },
    [dismiss],
  );

  useEffect(() => {
    const listener: Listener = ({ message, variant }) => push(message, variant);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current.clear();
    };
  }, [push]);

  const api = useMemo<ToastApi>(
    () => ({
      show: (message, variant = "info") => push(message, variant),
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      info: (message) => push(message, "info"),
      warning: (message) => push(message, "warning"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) return toast;
  return ctx;
}
