"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Headphones, Send } from "lucide-react";
import clsx from "clsx";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { api } from "@/lib/api";
import { faNum, t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, formatRelativeTime, isBlank } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type {
  SupportTicket,
  TicketMessage,
  TicketMessageSenderRole,
  TicketStatus,
} from "@/types/account";

const STATUS_FILTERS = [
  { value: "", labelKey: "admin.allStatuses" },
  { value: "OPEN", labelKey: "admin.statusOpen" },
  { value: "IN_PROGRESS", labelKey: "admin.statusInProgress" },
  { value: "ANSWERED", labelKey: "admin.statusAnswered" },
  { value: "CLOSED", labelKey: "admin.statusClosed" },
] as const;

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"];

function statusLabel(status: TicketStatus) {
  switch (status) {
    case "OPEN":
      return t("admin.statusOpen");
    case "IN_PROGRESS":
      return t("admin.statusInProgress");
    case "ANSWERED":
      return t("admin.statusAnswered");
    case "CLOSED":
      return t("admin.statusClosed");
    default:
      return status;
  }
}

function statusChipClass(status: TicketStatus) {
  switch (status) {
    case "OPEN":
      return "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-600 dark:!text-emerald-400";
    case "IN_PROGRESS":
      return "!border-amber-500/30 !bg-amber-500/10 !text-amber-700 dark:!text-amber-300";
    case "ANSWERED":
      return "!border-accent-500/30 !bg-accent-500/10 !text-accent-700 dark:!text-accent-300";
    case "CLOSED":
      return "!border-[var(--zy-border)] !bg-[var(--zy-surface)] !text-[var(--zy-muted)]";
    default:
      return "";
  }
}

function messageBubbleClass(role: TicketMessageSenderRole) {
  switch (role) {
    case "ADMIN":
      return "ms-auto border-accent-500/30 bg-accent-500/15 text-[var(--zy-ink)]";
    case "SYSTEM":
      return "mx-auto border-[var(--zy-border)] bg-[var(--zy-surface)]/70 text-[var(--zy-muted)] text-center";
    case "USER":
    default:
      return "me-auto border-[var(--zy-border)] bg-[var(--zy-surface)]/80 text-[var(--zy-ink)]";
  }
}

function senderLabel(role: TicketMessageSenderRole) {
  switch (role) {
    case "ADMIN":
      return t("admin.title");
    case "SYSTEM":
      return "SYSTEM";
    case "USER":
    default:
      return t("admin.user");
  }
}

export default function AdminTicketsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SupportTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const statusSelectOptions = useMemo(
    () => STATUS_OPTIONS.map((s) => ({ value: s, label: statusLabel(s) })),
    [],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const data = await api<SupportTicket[]>(`/admin/tickets${query}`);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setTickets([]);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function openDetail(ticket: SupportTicket) {
    setDetail(ticket);
    setReply("");
    setDetailLoading(true);
    try {
      const full = await api<SupportTicket>(`/admin/tickets/${ticket.id}`);
      setDetail(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDetailLoading(false);
    }
  }

  async function changeStatus(next: string) {
    if (!detail || !next || next === detail.status) return;
    setBusy(true);
    try {
      const updated = await api<SupportTicket>(`/admin/tickets/${detail.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setDetail(updated);
      setTickets((prev) => prev.map((tkt) => (tkt.id === updated.id ? { ...tkt, ...updated } : tkt)));
      toast.success(t("admin.statusUpdated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!detail || isBlank(reply)) return;
    setBusy(true);
    try {
      const updated = await api<SupportTicket>(`/admin/tickets/${detail.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply.trim() }),
      });
      setDetail(updated);
      setReply("");
      setTickets((prev) => prev.map((tkt) => (tkt.id === updated.id ? { ...tkt, ...updated } : tkt)));
      toast.success(t("admin.replySent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const messages: TicketMessage[] = detail?.messages?.length
    ? detail.messages
    : detail
      ? [
          {
            id: 0,
            senderRole: "USER",
            body: detail.body,
            createdAt: detail.createdAt,
          },
        ]
      : [];

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
          <Headphones size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.tickets")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.ticketsHint")}</p>
        </div>
      </div>

      <div className="glass-card-static mt-6 p-1">
        <div className="glass-inner !m-2 flex flex-wrap items-center gap-3 !p-4">
          <span className="text-sm font-medium text-[var(--zy-muted)]">{t("admin.filterStatus")}</span>
          <div className="w-full sm:w-56">
            <GlassSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTERS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : tickets.length === 0 ? (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Headphones size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("admin.emptyTickets")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {tickets.map((ticket) => {
            const when = formatRelativeTime(ticket.createdAt) || faNum(ticket.id);
            const userLine = [ticket.userName, ticket.userPhone].filter(Boolean).join(" · ");
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => void openDetail(ticket)}
                className="glass-card-static w-full cursor-pointer p-1 text-start transition hover:opacity-95"
              >
                <div className="glass-inner !m-1 flex flex-wrap items-center justify-between gap-3 !p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[var(--zy-ink)]">{ticket.subject}</p>
                    <p className="mt-0.5 text-xs text-[var(--zy-muted)]">
                      {userLine ? `${userLine} · ${when}` : when}
                    </p>
                  </div>
                  <span className={clsx("zy-chip shrink-0", statusChipClass(ticket.status))}>
                    {statusLabel(ticket.status)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <GlassDialog
        open={!!detail}
        onClose={() => {
          setDetail(null);
          setReply("");
        }}
        title={detail?.subject || t("admin.tickets")}
        wide
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                {(detail.userName || detail.userPhone) && (
                  <p className="text-sm text-[var(--zy-muted)]">
                    {t("admin.user")}:{" "}
                    <span className="font-medium text-[var(--zy-ink)]">
                      {[detail.userName, detail.userPhone].filter(Boolean).join(" · ")}
                    </span>
                  </p>
                )}
                {detail.panelName ? <span className="zy-chip">{detail.panelName}</span> : null}
              </div>
              <div className="w-full sm:w-48">
                <GlassSelect
                  value={detail.status}
                  onChange={(v) => void changeStatus(v)}
                  options={statusSelectOptions}
                  disabled={busy}
                />
              </div>
            </div>

            {detailLoading ? (
              <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/30 p-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id || `${msg.createdAt}-${msg.body.slice(0, 12)}`}
                    className={clsx(
                      "max-w-[90%] rounded-2xl border px-3 py-2 text-sm",
                      messageBubbleClass(msg.senderRole),
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      <span>{senderLabel(msg.senderRole)}</span>
                      <span className="font-normal normal-case">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap leading-6">{msg.body}</p>
                  </div>
                ))}
              </div>
            )}

            <form className="space-y-2" onSubmit={(e) => void sendReply(e)}>
              <label className="block text-sm">
                <span className="text-[var(--zy-muted)]">{t("admin.reply")}</span>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t("admin.replyPlaceholder")}
                  rows={3}
                  className={fieldInputClass(false, "mt-1 resize-y")}
                  maxLength={8000}
                  disabled={busy || detail.status === "CLOSED"}
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy || isBlank(reply) || detail.status === "CLOSED"}
                  className={clsx(dialogPrimaryBtnClass, "gap-2 disabled:opacity-50")}
                >
                  <Send size={14} />
                  {busy ? t("common.saving") : t("admin.send")}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </GlassDialog>
    </div>
  );
}
