"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImagePlus, MessageSquarePlus, Ticket, X } from "lucide-react";
import clsx from "clsx";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { api } from "@/lib/api";
import { faNum, t } from "@/lib/i18n";
import { isUploadLimitError, prepareUpload } from "@/lib/image-upload";
import {
  dialogPrimaryBtnClass,
  fieldInputClass,
  fieldLabelClass,
  formatRelativeTime,
  isBlank,
} from "@/lib/ui";
import { toast } from "@/lib/toast";
import type { SupportTicket, TicketRecipient, TicketStatus } from "@/types/account";

const MAX_TICKET_IMAGES = 5;

const RECIPIENT_OPTIONS: { value: TicketRecipient; labelKey: string }[] = [
  { value: "MANAGER", labelKey: "support.recipientManager" },
  { value: "FINANCE", labelKey: "support.recipientFinance" },
  { value: "TECHNICAL", labelKey: "support.recipientTechnical" },
];

type AppMembership = {
  membershipId: number;
  panelId?: number | null;
  tenantName?: string;
  roleLabelFa?: string;
};

type AppConnection = {
  code: string;
  nameFa: string;
  memberships?: AppMembership[];
};

type PanelOption = {
  value: string;
  label: string;
};

type CreateForm = {
  subject: string;
  panelId: string;
  recipient: string;
  body: string;
  relatedName: string;
  relatedId: string;
  images: string[];
};

const EMPTY_FORM: CreateForm = {
  subject: "",
  panelId: "",
  recipient: "",
  body: "",
  relatedName: "",
  relatedId: "",
  images: [],
};

function recipientLabel(recipient: TicketRecipient | null | undefined) {
  if (!recipient) return "";
  const found = RECIPIENT_OPTIONS.find((c) => c.value === recipient);
  return found ? t(found.labelKey) : recipient;
}

function statusLabel(status: TicketStatus) {
  switch (status) {
    case "OPEN":
      return t("support.statusOpen");
    case "IN_PROGRESS":
      return t("support.statusInProgress");
    case "ANSWERED":
      return t("support.statusAnswered");
    case "CLOSED":
      return t("support.statusClosed");
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

function ticketMetaLine(ticket: SupportTicket) {
  const parts: string[] = [];
  if (ticket.panelName) parts.push(ticket.panelName);
  const rec = recipientLabel(ticket.recipient);
  if (rec) parts.push(rec);
  if (ticket.relatedName) parts.push(ticket.relatedName);
  return parts.join(" · ");
}

function SupportTicketsContent() {
  const searchParams = useSearchParams();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [detail, setDetail] = useState<SupportTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [panelOptions, setPanelOptions] = useState<PanelOption[]>([]);
  const [panelsLoading, setPanelsLoading] = useState(true);

  const recipientSelectOptions = useMemo(
    () => RECIPIENT_OPTIONS.map((c) => ({ value: c.value, label: t(c.labelKey) })),
    [],
  );

  async function openDetail(ticket: SupportTicket) {
    setDetailLoading(true);
    setReplyBody("");
    try {
      const full = await api<SupportTicket>(`/tickets/${ticket.id}`);
      setDetail(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
      setDetail(ticket);
    } finally {
      setDetailLoading(false);
    }
  }

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!detail || isBlank(replyBody) || detail.status === "CLOSED") return;
    setReplyBusy(true);
    try {
      const updated = await api<SupportTicket>(`/tickets/${detail.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      setDetail(updated);
      setReplyBody("");
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t)));
      toast.success(t("support.replySent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setReplyBusy(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api<SupportTicket[]>("/tickets");
        if (active && Array.isArray(data)) setTickets(data);
      } catch {
        if (active) setTickets([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const apps = await api<AppConnection[]>("/apps/connected");
        if (!active || !Array.isArray(apps)) {
          if (active) setPanelOptions([]);
          return;
        }
        const options: PanelOption[] = [];
        const seen = new Set<string>();
        for (const app of apps) {
          for (const m of app.memberships || []) {
            if (m.panelId == null) continue;
            const value = String(m.panelId);
            if (seen.has(value)) continue;
            seen.add(value);
            const tenant = m.tenantName?.trim() || value;
            options.push({
              value,
              label: `${app.nameFa} · ${tenant}`,
            });
          }
        }
        if (active) setPanelOptions(options);
      } catch {
        if (active) setPanelOptions([]);
      } finally {
        if (active) setPanelsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const subject = searchParams.get("subject")?.trim() || "";
    const colleague = searchParams.get("colleague")?.trim() || "";
    const relatedId = searchParams.get("relatedId")?.trim() || "";
    const panelId = searchParams.get("panelId")?.trim() || "";
    const hasPrefill = !!(subject || colleague || relatedId || panelId);
    if (!hasPrefill) return;
    setForm({
      // Colleague flow: subject stays empty (required red state); do not prefill.
      subject: colleague ? "" : subject,
      panelId,
      recipient: colleague ? "MANAGER" : "",
      body: "",
      relatedName: colleague,
      relatedId,
      images: [],
    });
    setDialogOpen(true);
  }, [searchParams]);

  const fromColleague = !!form.relatedName;
  const panelRequired = !fromColleague;
  const recipientRequired = !fromColleague;
  const noPanels = !panelsLoading && panelOptions.length === 0;

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  async function onPickImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_TICKET_IMAGES - form.images.length;
    if (remaining <= 0) {
      toast.error(t("support.imagesHint"));
      return;
    }
    setUploadingImage(true);
    try {
      const next: string[] = [...form.images];
      for (const file of Array.from(files).slice(0, remaining)) {
        if (!file.type.startsWith("image/")) {
          toast.error(t("common.uploadFailed"));
          continue;
        }
        const prepared = await prepareUpload(file);
        next.push(prepared.dataUrl);
      }
      setForm((f) => ({ ...f, images: next.slice(0, MAX_TICKET_IMAGES) }));
    } catch (err) {
      toast.error(
        isUploadLimitError(err) ? t("common.uploadTooLarge") : t("common.uploadFailed"),
      );
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  }

  async function submitTicket(e: FormEvent) {
    e.preventDefault();
    const recipient = form.recipient || (fromColleague ? "MANAGER" : "");
    if (isBlank(form.subject) || isBlank(form.body)) return;
    if (panelRequired && isBlank(form.panelId)) return;
    if (recipientRequired && isBlank(recipient)) return;
    setBusy(true);
    try {
      const created = await api<SupportTicket>("/tickets", {
        method: "POST",
        body: JSON.stringify({
          subject: form.subject.trim(),
          recipient: recipient || null,
          panelId: form.panelId ? Number(form.panelId) : null,
          body: form.body.trim(),
          relatedName: form.relatedName.trim() || null,
          relatedId: form.relatedId.trim() || null,
          images: form.images.length ? form.images : [],
        }),
      });
      setTickets((prev) => [created, ...prev]);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      toast.success(t("support.created"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  const submitDisabled =
    busy ||
    uploadingImage ||
    isBlank(form.subject) ||
    isBlank(form.body) ||
    (panelRequired && isBlank(form.panelId)) ||
    (recipientRequired && isBlank(form.recipient));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("support.pageTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("support.pageHint")}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-500/20 transition hover:bg-accent-600"
        >
          <MessageSquarePlus size={16} />
          {t("support.newTicket")}
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : tickets.length === 0 ? (
        <div className="glass-card-static mt-8 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            <Ticket size={28} className="text-accent-500" />
            <p className="text-sm text-[var(--zy-muted)]">{t("support.empty")}</p>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {tickets.map((ticket) => {
            const meta = ticketMetaLine(ticket);
            const when = formatRelativeTime(ticket.createdAt) || faNum(ticket.id);
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
                    {meta ? `${meta} · ${when}` : when}
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
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={fromColleague ? t("support.newMessage") : t("support.newTicket")}
      >
        <form className="space-y-3" onSubmit={(e) => void submitTicket(e)}>
          {fromColleague ? (
            <p className="rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/50 px-3 py-2 text-sm text-[var(--zy-muted)]">
              {t("support.sendMessageTo")}{" "}
              <span className="font-medium text-[var(--zy-ink)]">{form.relatedName}</span>
            </p>
          ) : null}
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(form.subject))}>{t("support.subject")}</span>
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder={t("support.subjectPlaceholder")}
              className={fieldInputClass(isBlank(form.subject))}
              maxLength={200}
            />
          </label>
          {panelRequired || panelOptions.length > 0 ? (
            <label className="block text-sm">
              <span
                className={fieldLabelClass(panelRequired && isBlank(form.panelId))}
              >
                {t("support.panel")}
              </span>
              {noPanels && panelRequired ? (
                <p className="mt-1 rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/50 px-3 py-2 text-sm text-[var(--zy-muted)]">
                  {t("support.panelEmpty")}
                </p>
              ) : (
                <GlassSelect
                  value={form.panelId}
                  onChange={(v) => setForm((f) => ({ ...f, panelId: v }))}
                  placeholder={t("support.panelPlaceholder")}
                  options={panelOptions}
                  invalid={panelRequired && isBlank(form.panelId)}
                />
              )}
            </label>
          ) : null}
          {recipientRequired ? (
            <label className="block text-sm">
              <span className={fieldLabelClass(isBlank(form.recipient))}>
                {t("support.recipient")}
              </span>
              <GlassSelect
                value={form.recipient}
                onChange={(v) => setForm((f) => ({ ...f, recipient: v }))}
                placeholder={t("support.recipientPlaceholder")}
                options={recipientSelectOptions}
                invalid={isBlank(form.recipient)}
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className={fieldLabelClass(isBlank(form.body))}>{t("support.body")}</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder={t("support.bodyPlaceholder")}
              rows={5}
              className={fieldInputClass(isBlank(form.body), "resize-y")}
              maxLength={8000}
            />
          </label>
          <div className="text-sm">
            <span className="text-[var(--zy-muted)]">
              {t("support.images")}{" "}
              <span className="text-xs opacity-70">({t("common.optional")})</span>
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={uploadingImage || form.images.length >= MAX_TICKET_IMAGES}
                onChange={(e) => void onPickImages(e.target.files)}
              />
              <button
                type="button"
                disabled={uploadingImage || form.images.length >= MAX_TICKET_IMAGES}
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-sm text-[var(--zy-ink)] hover:bg-accent-500/10 disabled:opacity-50"
              >
                <ImagePlus size={14} />
                {uploadingImage ? t("common.loading") : t("support.imagesAdd")}
              </button>
            </div>
            {form.images.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.images.map((src, index) => (
                  <div
                    key={`${index}-${src.slice(0, 32)}`}
                    className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--zy-border)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute end-0.5 top-0.5 cursor-pointer rounded-md bg-black/60 p-0.5 text-white hover:bg-black/80"
                      title={t("common.delete")}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-1 text-[11px] text-[var(--zy-muted)]">
              {t("support.imagesHint")} {t("common.uploadLimitHint")}
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitDisabled || (panelRequired && noPanels)}
              className={`${dialogPrimaryBtnClass} disabled:opacity-50`}
            >
              {busy ? t("common.saving") : fromColleague ? t("panel.sendMessage") : t("support.submit")}
            </button>
          </div>
        </form>
      </GlassDialog>

      <GlassDialog
        open={!!detail}
        onClose={() => {
          setDetail(null);
          setReplyBody("");
        }}
        title={detail?.subject || t("support.ticket")}
      >
        {detailLoading ? (
          <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
        ) : detail ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx("zy-chip", statusChipClass(detail.status))}>
                {statusLabel(detail.status)}
              </span>
              {detail.panelName ? <span className="zy-chip">{detail.panelName}</span> : null}
              {detail.recipient ? (
                <span className="zy-chip">{recipientLabel(detail.recipient)}</span>
              ) : null}
            </div>
            {detail.relatedName ? (
              <p className="text-sm text-[var(--zy-muted)]">
                {t("support.relatedColleague")}:{" "}
                <span className="text-[var(--zy-ink)]">{detail.relatedName}</span>
              </p>
            ) : null}
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[var(--zy-border)] p-3">
              {(detail.messages && detail.messages.length > 0
                ? detail.messages
                : [
                    {
                      id: 0,
                      senderRole: "USER" as const,
                      body: detail.body,
                      createdAt: detail.createdAt,
                    },
                  ]
              ).map((msg) => (
                <div
                  key={msg.id || "body"}
                  className={clsx(
                    "rounded-xl px-3 py-2 text-sm",
                    msg.senderRole === "ADMIN"
                      ? "bg-accent-500/10 text-[var(--zy-ink)]"
                      : "bg-[var(--zy-surface)] text-[var(--zy-ink)]",
                  )}
                >
                  <p className="mb-1 text-[11px] text-[var(--zy-muted)]">
                    {msg.senderRole === "ADMIN"
                      ? t("support.senderAdmin")
                      : t("support.senderYou")}{" "}
                    · {formatRelativeTime(msg.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap leading-7">{msg.body}</p>
                </div>
              ))}
            </div>
            {detail.images && detail.images.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {detail.images.map((src, index) => (
                  <a
                    key={`${detail.id}-img-${index}`}
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-20 w-20 overflow-hidden rounded-xl border border-[var(--zy-border)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : null}
            {detail.status !== "CLOSED" ? (
              <form onSubmit={sendReply} className="space-y-2 border-t border-[var(--zy-border)] pt-3">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                  placeholder={t("support.replyPlaceholder")}
                  className={fieldInputClass(false, "resize-y")}
                  maxLength={8000}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={replyBusy || isBlank(replyBody)}
                    className={`${dialogPrimaryBtnClass} disabled:opacity-50`}
                  >
                    {replyBusy ? t("common.saving") : t("support.sendReply")}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </GlassDialog>
    </div>
  );
}

export default function SupportTicketsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>}>
      <SupportTicketsContent />
    </Suspense>
  );
}
