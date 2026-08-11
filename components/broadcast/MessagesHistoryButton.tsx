"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Eye, Mail } from "lucide-react";
import clsx from "clsx";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { levelBadgeClass, levelLabel } from "@/components/broadcast/InboxMessageCard";
import {
  archiveInboxMessages,
  loadAllStoredMessageIds,
  loadInboxMessages,
  loadUserArchivedMessages,
  pruneMissingMessages,
  setMessagesUserArchived,
  type ArchivedInboxMessage,
} from "@/lib/broadcast-inbox";
import { api } from "@/lib/api";
import { faNum, t } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import type { InboxMessage } from "@/types/account";

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return faNum(d.toLocaleString("fa-IR"));
}

type Folder = "inbox" | "archived";

type Props = {
  /** floating = icon next to theme; tile = settings sheet cell */
  variant?: "floating" | "tile" | "button";
  className?: string;
};

/** لیست پیام‌های کاربر: مشاهده متن و بایگانی (بدون حذف). */
export function MessagesHistoryButton({ variant = "floating", className }: Props) {
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState<Folder>("inbox");
  const [inboxItems, setInboxItems] = useState<ArchivedInboxMessage[]>([]);
  const [archivedItems, setArchivedItems] = useState<ArchivedInboxMessage[]>([]);
  const [view, setView] = useState<ArchivedInboxMessage | null>(null);
  const [loading, setLoading] = useState(false);

  const reloadLocal = useCallback(() => {
    setInboxItems(loadInboxMessages());
    setArchivedItems(loadUserArchivedMessages());
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const codes = ["ACCOUNT", "ZUNYAR", "ZUNKO"] as const;
      const lists = await Promise.all(
        codes.map(async (code) => {
          try {
            return await api<InboxMessage[]>(`/messages/inbox?app=${code}`);
          } catch {
            return [] as InboxMessage[];
          }
        }),
      );
      const merged = new Map<number, InboxMessage>();
      for (const list of lists) {
        for (const m of list) {
          if (m?.id != null) merged.set(m.id, m);
        }
      }
      archiveInboxMessages([...merged.values()]);

      const localIds = [
        ...new Set([...loadAllStoredMessageIds(), ...merged.keys()]),
      ].filter((id) => Number.isFinite(id));

      if (localIds.length > 0) {
        try {
          const result = await api<{ ids: number[] }>("/messages/existing-ids", {
            method: "POST",
            body: JSON.stringify({ ids: localIds }),
          });
          pruneMissingMessages(result?.ids || []);
        } catch {
          // ignore
        }
      }

      reloadLocal();
    } catch {
      reloadLocal();
    } finally {
      setLoading(false);
    }
  }, [reloadLocal]);

  useEffect(() => {
    if (!open) return;
    setFolder("inbox");
    void refresh();
  }, [open, refresh]);

  const items = folder === "inbox" ? inboxItems : archivedItems;

  function archiveOne(id: number, archived: boolean) {
    setMessagesUserArchived([id], archived);
    reloadLocal();
    toast.success(archived ? t("panel.messagesArchived") : t("panel.messagesUnarchived"));
  }

  const trigger =
    variant === "tile" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "group flex min-h-[5.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/60 px-1.5 py-2.5 text-center transition-all duration-200 hover:scale-[1.03] hover:border-accent-500/40 hover:bg-accent-500/10 active:scale-[0.96]",
          className,
        )}
      >
        <Mail size={26} strokeWidth={1.75} className="text-accent-600 dark:text-accent-400" />
        <span className="text-[11px] font-semibold leading-tight text-[var(--zy-ink)]">
          {t("panel.myMessages")}
        </span>
      </button>
    ) : variant === "button" ? (
      <button
        type="button"
        aria-label={t("panel.myMessages")}
        onClick={() => setOpen(true)}
        className={clsx(
          "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-sm font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10",
          className,
        )}
      >
        <Mail size={16} />
        <span>{t("panel.myMessages")}</span>
      </button>
    ) : (
      <button
        type="button"
        aria-label={t("panel.myMessages")}
        title={t("panel.myMessages")}
        onClick={() => setOpen(true)}
        className={clsx(
          "theme-toggle group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border transition-all duration-300",
          "border-accent-500/30 bg-white/80 text-accent-700 hover:border-accent-500 hover:bg-accent-50",
          "dark:border-white/10 dark:bg-charcoal-soft/80 dark:text-accent-400 dark:hover:border-accent-500 dark:hover:bg-charcoal-soft",
          "dark:shadow-[0_0_16px_rgba(20,184,166,0.22)]",
          className,
        )}
      >
        <Mail size={18} />
      </button>
    );

  return (
    <>
      {trigger}

      <GlassDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("panel.myMessages")}
        wide
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFolder("inbox")}
            className={clsx(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
              folder === "inbox"
                ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
                : "border-[var(--zy-border)] text-[var(--zy-muted)] hover:bg-accent-500/10",
            )}
          >
            <Mail size={14} />
            {t("panel.messagesFolderInbox")}
            <span className="tabular-nums opacity-80">({faNum(inboxItems.length)})</span>
          </button>
          <button
            type="button"
            onClick={() => setFolder("archived")}
            className={clsx(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
              folder === "archived"
                ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
                : "border-[var(--zy-border)] text-[var(--zy-muted)] hover:bg-accent-500/10",
            )}
          >
            <Archive size={14} />
            {t("panel.messagesFolderArchived")}
            <span className="tabular-nums opacity-80">({faNum(archivedItems.length)})</span>
          </button>
        </div>

        {loading && items.length === 0 ? (
          <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--zy-muted)]">
            {folder === "archived"
              ? t("panel.myMessagesArchivedEmpty")
              : t("panel.myMessagesEmpty")}
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <ResponsiveRecords
              fitWidth
              columns={[
                t("panel.colMessageTitle"),
                t("panel.colMessageSentAt"),
                t("panel.colMessageSeenAt"),
                t("common.actions"),
              ]}
              rows={items.map((row) => {
                const sent = row.createdAt || row.receivedAt;
                const iconBtn =
                  "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition";
                const actions = (
                  <div className="flex flex-nowrap items-center gap-1.5">
                    <button
                      type="button"
                      title={t("admin.viewMessageText")}
                      aria-label={t("admin.viewMessageText")}
                      onClick={() => setView(row)}
                      className={clsx(
                        iconBtn,
                        "border-accent-500/30 text-accent-700 hover:bg-accent-500/10 dark:text-accent-300",
                      )}
                    >
                      <Eye size={15} />
                    </button>
                    {folder === "inbox" ? (
                      <button
                        type="button"
                        title={t("panel.messagesArchive")}
                        aria-label={t("panel.messagesArchive")}
                        onClick={() => archiveOne(row.id, true)}
                        className={clsx(
                          iconBtn,
                          "border-[var(--zy-border)] text-[var(--zy-ink)] hover:bg-accent-500/10",
                        )}
                      >
                        <Archive size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title={t("panel.messagesUnarchive")}
                        aria-label={t("panel.messagesUnarchive")}
                        onClick={() => archiveOne(row.id, false)}
                        className={clsx(
                          iconBtn,
                          "border-[var(--zy-border)] text-[var(--zy-ink)] hover:bg-accent-500/10",
                        )}
                      >
                        <ArchiveRestore size={14} />
                      </button>
                    )}
                  </div>
                );
                return {
                  key: row.id,
                  cells: [
                    <div key="t" className="min-w-0">
                      <p className="truncate font-medium text-[var(--zy-ink)]">{row.title}</p>
                      <span className={clsx("mt-1 inline-flex", levelBadgeClass(row.level))}>
                        {levelLabel(row.level)}
                      </span>
                    </div>,
                    <span key="s" className="text-xs tabular-nums text-[var(--zy-muted)]">
                      {formatWhen(sent)}
                    </span>,
                    <span key="v" className="text-xs tabular-nums text-[var(--zy-muted)]">
                      {row.seenAt ? formatWhen(row.seenAt) : t("panel.messageNotSeenYet")}
                    </span>,
                    actions,
                  ],
                  details: [
                    { label: t("panel.colMessageTitle"), value: row.title },
                    { label: t("panel.colMessageSentAt"), value: formatWhen(sent) },
                    {
                      label: t("panel.colMessageSeenAt"),
                      value: row.seenAt ? formatWhen(row.seenAt) : t("panel.messageNotSeenYet"),
                    },
                  ],
                  actions,
                };
              })}
            />
          </div>
        )}
      </GlassDialog>

      <GlassDialog
        open={view != null}
        onClose={() => setView(null)}
        title={view?.title || t("admin.viewMessageTitle")}
      >
        {view ? (
          <div className="space-y-3">
            <span className={levelBadgeClass(view.level)}>{levelLabel(view.level)}</span>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--zy-ink)]">
              {view.body}
            </p>
            <div className="space-y-1 border-t border-[var(--zy-border)] pt-3 text-xs text-[var(--zy-muted)]">
              <p>
                {t("panel.colMessageSentAt")}: {formatWhen(view.createdAt || view.receivedAt)}
              </p>
              <p>
                {t("panel.colMessageSeenAt")}:{" "}
                {view.seenAt ? formatWhen(view.seenAt) : t("panel.messageNotSeenYet")}
              </p>
            </div>
          </div>
        ) : null}
      </GlassDialog>
    </>
  );
}
