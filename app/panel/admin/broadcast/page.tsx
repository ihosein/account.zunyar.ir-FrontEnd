"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Archive, ArchiveRestore, Eye, Mail, Megaphone, MessageSquare, Plus, Settings2, Smartphone, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassMultiSelect } from "@/components/ui/GlassMultiSelect";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { DateSelect } from "@/components/ui/date-range-select";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { TablePagination } from "@/components/ui/TablePagination";
import { ZyCheckbox } from "@/components/ui/ZyCheckbox";
import {
  createDefaultEmailComposer,
  EmailComposer,
  type EmailComposerValue,
} from "@/components/admin/EmailComposer";
import { ParamDataEditor } from "@/components/admin/ParamDataEditor";
import { api } from "@/lib/api";
import { appChipClass } from "@/lib/apps";
import { EMPTY_PARAM_TABLE, insertPlaceholder, paramTablePayload, splitFullName, type ParamRecipient, type ParamTable } from "@/lib/excel-params";
import { resolveBrandAssets } from "@/lib/email-template";
import { faNum, t } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { dialogPrimaryBtnClass, formatRelativeTime, inputClass } from "@/lib/ui";
import type {
  AdminAccountUser,
  AdminAccountUserPage,
  AppCode,
  AudiencePreview,
  BroadcastAdminMessage,
  EmailCampaign,
  MessageLevel,
  SmsCampaign,
  SmsPanelsList,
  SmsSettings,
  SpringPage,
} from "@/types/account";

type TabId = "messages" | "email" | "sms" | "settings";

const APP_CODES: AppCode[] = ["ACCOUNT", "ZUNYAR", "ZUNKO"];

const LEVEL_OPTIONS: { value: MessageLevel; labelKey: string }[] = [
  { value: "INFO", labelKey: "admin.messageLevelINFO" },
  { value: "NOTICE", labelKey: "admin.messageLevelNOTICE" },
  { value: "WARNING", labelKey: "admin.messageLevelWARNING" },
  { value: "ALERT", labelKey: "admin.messageLevelALERT" },
  { value: "CRITICAL", labelKey: "admin.messageLevelCRITICAL" },
];

type AudienceState = {
  allApps: boolean;
  appCodes: AppCode[];
  allUsers: boolean;
  userIds: number[];
};

const EMPTY_AUDIENCE: AudienceState = {
  allApps: true,
  appCodes: [],
  allUsers: true,
  userIds: [],
};

function appLabel(code?: string | null) {
  if (!code) return "—";
  const key = `admin.app${code}` as const;
  const translated = t(key);
  return translated === key ? code : translated;
}

function levelLabel(level?: string | null) {
  if (!level) return "—";
  const key = `admin.messageLevel${level}` as const;
  const translated = t(key);
  return translated === key ? level : translated;
}

function smsStatusLabel(status?: string | null) {
  if (!status) return "—";
  const key = `admin.smsStatus${status}` as const;
  const translated = t(key);
  return translated === key ? status : translated;
}

function emailStatusLabel(status?: string | null) {
  if (!status) return "—";
  const key = `admin.emailStatus${status}` as const;
  const translated = t(key);
  return translated === key ? status : translated;
}

function toDayStartInstant(isoDate: string): string | undefined {
  const v = isoDate.trim();
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toDayEndInstant(isoDate: string): string | undefined {
  const v = isoDate.trim();
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T23:59:59.999`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function audiencePayload(a: AudienceState) {
  const allApps = a.allApps || a.appCodes.length === 0;
  const allUsers = a.allUsers || a.userIds.length === 0;
  return {
    allApps,
    appCodes: allApps ? undefined : a.appCodes,
    allUsers,
    userIds: allUsers ? undefined : a.userIds,
  };
}

function resolveRecipients(audience: AudienceState, allUsers: AdminAccountUser[]): ParamRecipient[] {
  const selected =
    audience.allUsers || audience.userIds.length === 0
      ? allUsers
      : allUsers.filter((u) => audience.userIds.includes(u.userId));
  return selected.map((u) => {
    const split = splitFullName(u.fullName);
    return {
      phone: u.phone || "",
      firstName: split.firstName,
      lastName: split.lastName,
      fullName: u.fullName || undefined,
    };
  });
}

function AudienceFields({
  value,
  onChange,
  users,
  usersLoading,
}: {
  value: AudienceState;
  onChange: (next: AudienceState) => void;
  users: AdminAccountUser[];
  usersLoading: boolean;
}) {
  const appOptions = APP_CODES.map((code) => ({
    value: code,
    label: appLabel(code),
  }));

  const userOptions = users.map((u) => {
    const name = u.fullName?.trim() || u.phone || String(u.userId);
    return {
      value: String(u.userId),
      label: name,
      description: u.phone || undefined,
    };
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <GlassMultiSelect
        label={t("admin.targetApps")}
        value={value.allApps ? [] : value.appCodes}
        onChange={(codes) =>
          onChange({
            ...value,
            allApps: codes.length === 0,
            appCodes: codes as AppCode[],
          })
        }
        options={appOptions}
        placeholder={t("admin.allAppsTarget")}
        emptyHint={t("admin.audienceEmptyMeansAllApps")}
        searchable={false}
      />
      <GlassMultiSelect
        label={t("admin.targetUsers")}
        value={value.allUsers ? [] : value.userIds.map(String)}
        onChange={(ids) =>
          onChange({
            ...value,
            allUsers: ids.length === 0,
            userIds: ids.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
          })
        }
        options={userOptions}
        placeholder={usersLoading ? t("common.loading") : t("admin.allUsers")}
        emptyHint={t("admin.audienceEmptyMeansAllUsers")}
        searchable
        showSelectAll
        disabled={usersLoading}
      />
    </div>
  );
}

export default function AdminBroadcastPage() {
  const [tab, setTab] = useState<TabId>("messages");

  const [users, setUsers] = useState<AdminAccountUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [msgPage, setMsgPage] = useState(0);
  const [msgPageSize, setMsgPageSize] = useState(20);
  const [messages, setMessages] = useState<SpringPage<BroadcastAdminMessage> | null>(null);
  const [msgLoading, setMsgLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<MessageLevel>("INFO");
  const [visibleFrom, setVisibleFrom] = useState("");
  const [visibleUntil, setVisibleUntil] = useState("");
  const [msgAudience, setMsgAudience] = useState<AudienceState>(EMPTY_AUDIENCE);
  const [msgPreview, setMsgPreview] = useState<number | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);

  const [smsPage, setSmsPage] = useState(0);
  const [smsPageSize, setSmsPageSize] = useState(20);
  const [campaigns, setCampaigns] = useState<SpringPage<SmsCampaign> | null>(null);
  const [smsLoading, setSmsLoading] = useState(false);

  const [smsBody, setSmsBody] = useState("");
  const [smsAudience, setSmsAudience] = useState<AudienceState>(EMPTY_AUDIENCE);
  const [smsPreview, setSmsPreview] = useState<number | null>(null);
  const [smsBusy, setSmsBusy] = useState(false);

  const [emailPage, setEmailPage] = useState(0);
  const [emailPageSize, setEmailPageSize] = useState(20);
  const [emailCampaigns, setEmailCampaigns] = useState<SpringPage<EmailCampaign> | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCompose, setEmailCompose] = useState<EmailComposerValue>(() => createDefaultEmailComposer());
  const [emailAudience, setEmailAudience] = useState<AudienceState>(EMPTY_AUDIENCE);
  const [emailPreview, setEmailPreview] = useState<number | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailParams, setEmailParams] = useState<ParamTable>(EMPTY_PARAM_TABLE);
  const [deleteEmailId, setDeleteEmailId] = useState<number | null>(null);
  const [deleteEmailBusy, setDeleteEmailBusy] = useState(false);
  const [emailInsertTarget, setEmailInsertTarget] = useState<"subject" | "headline" | "body" | "footer">("body");
  const emailInsertParamRef = useRef<((name: string) => void) | null>(null);

  const [msgParams, setMsgParams] = useState<ParamTable>(EMPTY_PARAM_TABLE);
  const [smsParams, setSmsParams] = useState<ParamTable>(EMPTY_PARAM_TABLE);
  const [viewMessage, setViewMessage] = useState<{ title?: string; body: string } | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<number | null>(null);
  const [deleteMessageBusy, setDeleteMessageBusy] = useState(false);
  const [msgFolder, setMsgFolder] = useState<"active" | "archived">("active");
  const [msgActionBusy, setMsgActionBusy] = useState(false);

  const msgRecipients = useMemo(
    () => resolveRecipients(msgAudience, users),
    [msgAudience, users],
  );
  const smsRecipients = useMemo(
    () => resolveRecipients(smsAudience, users),
    [smsAudience, users],
  );
  const emailRecipients = useMemo(
    () => resolveRecipients(emailAudience, users),
    [emailAudience, users],
  );

  const [panels, setPanels] = useState<SmsSettings[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [panelDialogOpen, setPanelDialogOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<SmsSettings | null>(null);
  const [deletePanelId, setDeletePanelId] = useState<number | null>(null);
  const [panelName, setPanelName] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [lineNumber, setLineNumber] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [parameterName, setParameterName] = useState("CODE");
  const [baseUrl, setBaseUrl] = useState("https://api.sms.ir");
  const [exposeDebugCode, setExposeDebugCode] = useState(false);
  const [activateOnCreate, setActivateOnCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setUsersLoading(true);
      try {
        const result = await api<AdminAccountUserPage>("/admin/users?page=0&size=500");
        if (!cancelled) setUsers(result.content ?? []);
      } catch (err) {
        if (!cancelled) {
          setUsers([]);
          toast.error(err instanceof Error ? err.message : t("common.error"));
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMessages = useCallback(async () => {
    setMsgLoading(true);
    try {
      const result = await api<SpringPage<BroadcastAdminMessage>>(
        `/admin/messages?page=${msgPage}&size=${msgPageSize}`,
      );
      setMessages(result);
    } catch (err) {
      setMessages(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setMsgLoading(false);
    }
  }, [msgPage, msgPageSize]);

  const loadCampaigns = useCallback(async () => {
    setSmsLoading(true);
    try {
      const result = await api<SpringPage<SmsCampaign>>(
        `/admin/sms/campaigns?page=${smsPage}&size=${smsPageSize}`,
      );
      setCampaigns(result);
    } catch (err) {
      setCampaigns(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSmsLoading(false);
    }
  }, [smsPage, smsPageSize]);

  const loadEmailCampaigns = useCallback(async () => {
    setEmailLoading(true);
    try {
      const result = await api<SpringPage<EmailCampaign>>(
        `/admin/email/campaigns?page=${emailPage}&size=${emailPageSize}`,
      );
      setEmailCampaigns(result);
    } catch (err) {
      setEmailCampaigns(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setEmailLoading(false);
    }
  }, [emailPage, emailPageSize]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const result = await api<SmsPanelsList>("/admin/sms/panels");
      setPanels(Array.isArray(result.panels) ? result.panels : []);
    } catch (err) {
      setPanels([]);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  function openCreatePanel() {
    setEditingPanel(null);
    setPanelName("");
    setEnabled(true);
    setApiKey("");
    setLineNumber("");
    setTemplateId("");
    setParameterName("CODE");
    setBaseUrl("https://api.sms.ir");
    setExposeDebugCode(false);
    setActivateOnCreate(panels.length === 0);
    setPanelDialogOpen(true);
  }

  function openEditPanel(panel: SmsSettings) {
    setEditingPanel(panel);
    setPanelName(panel.name || "");
    setEnabled(!!panel.enabled);
    setApiKey("");
    setLineNumber(panel.lineNumber || "");
    setTemplateId(panel.templateId != null ? String(panel.templateId) : "");
    setParameterName(panel.parameterName || "CODE");
    setBaseUrl(panel.baseUrl || "https://api.sms.ir");
    setExposeDebugCode(!!panel.exposeDebugCode);
    setActivateOnCreate(false);
    setPanelDialogOpen(true);
  }

  async function savePanel(e: React.FormEvent) {
    e.preventDefault();
    if (!panelName.trim()) {
      toast.error(t("admin.smsPanelNamePlaceholder"));
      return;
    }
    setSettingsBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name: panelName.trim(),
        enabled,
        lineNumber: lineNumber.trim() || null,
        templateId: templateId.trim() ? Number(templateId) : 0,
        parameterName: parameterName.trim() || "CODE",
        baseUrl: baseUrl.trim() || "https://api.sms.ir",
        exposeDebugCode,
      };
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      if (editingPanel?.id != null) {
        await api<SmsSettings>(`/admin/sms/panels/${editingPanel.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success(t("admin.smsSettingsSaved"));
      } else {
        payload.activate = activateOnCreate;
        await api<SmsSettings>("/admin/sms/panels", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(t("admin.smsPanelAdded"));
      }
      setPanelDialogOpen(false);
      await loadSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSettingsBusy(false);
    }
  }

  async function activatePanel(id: number) {
    setSettingsBusy(true);
    try {
      await api<SmsSettings>(`/admin/sms/panels/${id}/activate`, { method: "POST" });
      toast.success(t("admin.smsPanelActivated"));
      await loadSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSettingsBusy(false);
    }
  }

  async function deletePanel() {
    if (deletePanelId == null) return;
    setSettingsBusy(true);
    try {
      await api(`/admin/sms/panels/${deletePanelId}`, { method: "DELETE" });
      toast.success(t("admin.smsPanelDeleted"));
      setDeletePanelId(null);
      await loadSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSettingsBusy(false);
    }
  }

  useEffect(() => {
    if (tab === "messages") void loadMessages();
  }, [tab, loadMessages]);

  useEffect(() => {
    if (tab === "sms") void loadCampaigns();
  }, [tab, loadCampaigns]);

  useEffect(() => {
    if (tab === "email") void loadEmailCampaigns();
  }, [tab, loadEmailCampaigns]);

  useEffect(() => {
    if (tab === "settings") void loadSettings();
  }, [tab, loadSettings]);

  async function deleteMessage() {
    if (deleteMessageId == null) return;
    setDeleteMessageBusy(true);
    try {
      await api(`/admin/messages/${deleteMessageId}/delete`, { method: "POST" });
      toast.success(t("admin.messageDeleted"));
      setDeleteMessageId(null);
      await loadMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeleteMessageBusy(false);
    }
  }

  async function archiveMessage(id: number, archived: boolean) {
    setMsgActionBusy(true);
    try {
      await api(`/admin/messages/${id}/${archived ? "deactivate" : "activate"}`, {
        method: "POST",
      });
      toast.success(archived ? t("admin.messageArchived") : t("admin.messageUnarchived"));
      await loadMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setMsgActionBusy(false);
    }
  }

  async function deleteEmailCampaign() {
    if (deleteEmailId == null) return;
    setDeleteEmailBusy(true);
    try {
      await api(`/admin/email/campaigns/${deleteEmailId}/delete`, { method: "POST" });
      toast.success(t("admin.emailDeleted"));
      setDeleteEmailId(null);
      await loadEmailCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setDeleteEmailBusy(false);
    }
  }

  async function previewAudience(audience: AudienceState, setCount: (n: number | null) => void) {
    try {
      const result = await api<AudiencePreview>("/admin/audience/preview", {
        method: "POST",
        body: JSON.stringify(audiencePayload(audience)),
      });
      setCount(result.count);
      toast.success(t("admin.audienceCount", { count: faNum(result.count) }));
    } catch (err) {
      setCount(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function submitMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error(t("common.error"));
      return;
    }
    setMsgBusy(true);
    try {
      await api<BroadcastAdminMessage>("/admin/messages", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          level,
          ...audiencePayload(msgAudience),
          visibleFrom: toDayStartInstant(visibleFrom),
          visibleUntil: toDayEndInstant(visibleUntil),
          paramRows: paramTablePayload(msgParams),
        }),
      });
      toast.success(t("admin.messageCreated"));
      setTitle("");
      setBody("");
      setLevel("INFO");
      setVisibleFrom("");
      setVisibleUntil("");
      setMsgAudience(EMPTY_AUDIENCE);
      setMsgParams(EMPTY_PARAM_TABLE);
      setMsgPreview(null);
      setMsgPage(0);
      await loadMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setMsgBusy(false);
    }
  }

  async function submitSms(e: React.FormEvent) {
    e.preventDefault();
    if (!smsBody.trim()) {
      toast.error(t("common.error"));
      return;
    }
    setSmsBusy(true);
    try {
      await api<SmsCampaign>("/admin/sms/campaigns", {
        method: "POST",
        body: JSON.stringify({
          body: smsBody.trim(),
          ...audiencePayload(smsAudience),
          paramRows: paramTablePayload(smsParams),
        }),
      });
      toast.success(t("admin.smsSent"));
      setSmsBody("");
      setSmsAudience(EMPTY_AUDIENCE);
      setSmsParams(EMPTY_PARAM_TABLE);
      setSmsPreview(null);
      setSmsPage(0);
      await loadCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSmsBusy(false);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const subject = emailCompose.subject.trim();
    const body = emailCompose.body.trim();
    if (!subject || !body) {
      toast.error(t("common.error"));
      return;
    }
    setEmailBusy(true);
    try {
      const brand = resolveBrandAssets({
        brandKey: emailCompose.brandKey,
        brandName: emailCompose.brandName,
        brandSubtitle: emailCompose.brandSubtitle,
        brandLogo: emailCompose.brandLogo,
      });
      await api<EmailCampaign>("/admin/email/campaigns", {
        method: "POST",
        body: JSON.stringify({
          subject,
          body,
          useTemplate: emailCompose.mode === "template",
          headline: emailCompose.headline.trim() || null,
          footer: emailCompose.footer.trim() || null,
          brandName:
            emailCompose.brandKey === "custom"
              ? emailCompose.brandName.trim() || null
              : brand.brandName || null,
          // برای برند «سایر» زیرعنوان خالی باید خالی بماند (نه null که در سرور پیش‌فرض می‌شود)
          brandSubtitle:
            emailCompose.brandKey === "custom"
              ? emailCompose.brandSubtitle.trim()
              : brand.brandSubtitle || null,
          brandLogo:
            emailCompose.brandKey === "custom" && emailCompose.brandLogo
              ? emailCompose.brandLogo
              : null,
          ...audiencePayload(emailAudience),
          paramRows: paramTablePayload(emailParams),
        }),
      });
      toast.success(t("admin.emailSent"));
      setEmailCompose(createDefaultEmailComposer());
      setEmailAudience(EMPTY_AUDIENCE);
      setEmailParams(EMPTY_PARAM_TABLE);
      setEmailPreview(null);
      setEmailPage(0);
      await loadEmailCampaigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setEmailBusy(false);
    }
  }

  const msgRows = (messages?.content ?? []).filter((row) =>
    msgFolder === "active" ? row.active : !row.active,
  );
  const smsRows = campaigns?.content ?? [];
  const emailRows = emailCampaigns?.content ?? [];

  const tabs = useMemo(
    () =>
      [
        { id: "messages" as const, label: t("admin.tabMessages"), icon: MessageSquare },
        { id: "email" as const, label: t("admin.tabEmail"), icon: Mail },
        { id: "sms" as const, label: t("admin.tabSms"), icon: Smartphone },
        { id: "settings" as const, label: t("admin.tabSmsSettings"), icon: Settings2 },
      ] as const,
    [],
  );

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
          <Megaphone size={20} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.broadcast")}</h1>
          <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.broadcastHint")}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={clsx(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
              tab === item.id
                ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
                : "border-[var(--zy-border)] text-[var(--zy-muted)] hover:bg-accent-500/10 hover:text-[var(--zy-ink)]",
            )}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "messages" ? (
        <>
          <form onSubmit={submitMessage} className="glass-card-static mt-4 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-4">
              <h2 className="text-sm font-bold text-[var(--zy-ink)]">{t("admin.createMessage")}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="text-[var(--zy-muted)]">{t("admin.messageTitle")}</span>
                  <input
                    className={inputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-[var(--zy-muted)]">{t("admin.messageBody")}</span>
                  <textarea
                    className={clsx(inputClass, "min-h-[7rem] resize-y")}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={8000}
                    required
                  />
                  <span className="mt-1 block text-[11px] text-[var(--zy-muted)]">
                    {t("admin.messageParamsHint")}
                  </span>
                </label>
                <div className="sm:col-span-2">
                  <ParamDataEditor
                    value={msgParams}
                    onChange={setMsgParams}
                    recipients={msgRecipients}
                    onInsertParam={(name) => setBody((b) => insertPlaceholder(b, name))}
                  />
                </div>
                <label className="block text-sm">
                  <span className="text-[var(--zy-muted)]">{t("admin.messageLevel")}</span>
                  <GlassSelect
                    className="mt-1"
                    value={level}
                    onChange={(v) => setLevel(v as MessageLevel)}
                    options={LEVEL_OPTIONS.map((o) => ({
                      value: o.value,
                      label: t(o.labelKey),
                    }))}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <DateSelect
                    label={`${t("admin.visibleFrom")} (${t("common.optional")})`}
                    value={visibleFrom}
                    onChange={setVisibleFrom}
                    placeholder={t("admin.visibleFrom")}
                  />
                  <DateSelect
                    label={`${t("admin.visibleUntil")} (${t("common.optional")})`}
                    value={visibleUntil}
                    onChange={setVisibleUntil}
                    placeholder={t("admin.visibleUntil")}
                    minDate={visibleFrom || undefined}
                  />
                </div>
              </div>

              <AudienceFields
                value={msgAudience}
                onChange={(next) => {
                  setMsgAudience(next);
                  setMsgPreview(null);
                }}
                users={users}
                usersLoading={usersLoading}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={msgBusy}
                  onClick={() => void previewAudience(msgAudience, setMsgPreview)}
                  className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--zy-border)] px-3.5 py-2 text-sm font-semibold text-[var(--zy-ink)] transition hover:bg-accent-500/10 disabled:opacity-50"
                >
                  {t("admin.previewAudience")}
                </button>
                {msgPreview != null ? (
                  <span className="text-xs text-[var(--zy-muted)]">
                    {t("admin.audienceCount", { count: faNum(msgPreview) })}
                  </span>
                ) : null}
                <button type="submit" disabled={msgBusy} className={clsx(dialogPrimaryBtnClass, "ms-auto")}>
                  {msgBusy ? t("common.saving") : t("admin.createMessage")}
                </button>
              </div>
            </div>
          </form>

          {msgLoading && !messages ? (
            <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMsgFolder("active")}
                  className={clsx(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                    msgFolder === "active"
                      ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
                      : "border-[var(--zy-border)] text-[var(--zy-muted)] hover:bg-accent-500/10",
                  )}
                >
                  <MessageSquare size={14} />
                  {t("admin.messagesFolderActive")}
                </button>
                <button
                  type="button"
                  onClick={() => setMsgFolder("archived")}
                  className={clsx(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                    msgFolder === "archived"
                      ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
                      : "border-[var(--zy-border)] text-[var(--zy-muted)] hover:bg-accent-500/10",
                  )}
                >
                  <Archive size={14} />
                  {t("admin.messagesFolderArchived")}
                </button>
              </div>

              {msgRows.length === 0 ? (
                <div className="glass-card-static mt-4 p-1">
                  <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
                    <MessageSquare size={28} className="text-accent-500" />
                    <p className="text-sm text-[var(--zy-muted)]">
                      {msgFolder === "archived"
                        ? t("admin.emptyArchivedMessages")
                        : t("admin.emptyMessages")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="glass-card-static mt-4 p-1">
                  <div className="glass-inner !m-2 overflow-hidden !p-0">
                    <div className="p-2 md:p-0">
                      <ResponsiveRecords
                        fitWidth
                        columns={[
                          t("admin.colTitle"),
                          t("admin.colLevel"),
                          t("admin.colApp"),
                          t("admin.colRecipients"),
                          t("admin.colStatus"),
                          t("admin.colCreated"),
                          t("common.actions"),
                        ]}
                        rows={msgRows.map((row) => {
                          const apps = row.targetAllApps
                            ? t("admin.allApps")
                            : (row.appCodes || []).map((c) => (
                                <span key={c} className={clsx("zy-chip me-1", appChipClass(c))}>
                                  {appLabel(c)}
                                </span>
                              ));
                          const levelNode = (
                            <span className="zy-chip">{levelLabel(String(row.level))}</span>
                          );
                          const statusNode = (
                            <span className="zy-chip">
                              {row.active ? t("admin.messageActive") : t("admin.messageArchivedStatus")}
                            </span>
                          );
                          const when = formatRelativeTime(row.createdAt) || "—";
                          const iconBtn =
                            "inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition disabled:opacity-50";
                          const actions = (
                            <div className="flex flex-nowrap items-center gap-1.5">
                              <button
                                type="button"
                                title={t("admin.viewMessageText")}
                                aria-label={t("admin.viewMessageText")}
                                onClick={() => setViewMessage({ title: row.title, body: row.body })}
                                className={clsx(
                                  iconBtn,
                                  "border-accent-500/30 text-accent-700 hover:bg-accent-500/10 dark:text-accent-300",
                                )}
                              >
                                <Eye size={15} />
                              </button>
                              {row.active ? (
                                <button
                                  type="button"
                                  disabled={msgActionBusy}
                                  title={t("admin.archiveMessage")}
                                  aria-label={t("admin.archiveMessage")}
                                  onClick={() => void archiveMessage(row.id, true)}
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
                                  disabled={msgActionBusy}
                                  title={t("admin.unarchiveMessage")}
                                  aria-label={t("admin.unarchiveMessage")}
                                  onClick={() => void archiveMessage(row.id, false)}
                                  className={clsx(
                                    iconBtn,
                                    "border-[var(--zy-border)] text-[var(--zy-ink)] hover:bg-accent-500/10",
                                  )}
                                >
                                  <ArchiveRestore size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={msgActionBusy || deleteMessageBusy}
                                title={t("admin.deleteMessage")}
                                aria-label={t("admin.deleteMessage")}
                                onClick={() => setDeleteMessageId(row.id)}
                                className={clsx(
                                  iconBtn,
                                  "border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-300",
                                )}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                          return {
                            key: row.id,
                            cells: [
                              <div key="t" className="min-w-0">
                                <p className="truncate font-medium">{row.title}</p>
                              </div>,
                              levelNode,
                              <div key="a">{apps}</div>,
                              <span key="r">{faNum(row.userCount)}</span>,
                              statusNode,
                              <span key="c" className="text-[var(--zy-muted)]">
                                {when}
                              </span>,
                              actions,
                            ],
                            details: [
                              { label: t("admin.colTitle"), value: row.title },
                              { label: t("admin.colLevel"), value: levelNode },
                              { label: t("admin.colApp"), value: apps },
                              { label: t("admin.colRecipients"), value: faNum(row.userCount) },
                              { label: t("admin.colStatus"), value: statusNode },
                              { label: t("admin.colCreated"), value: when },
                            ],
                            actions,
                          };
                        })}
                      />
                    </div>
                    <TablePagination
                      page={msgPage + 1}
                      pageCount={Math.max(messages?.totalPages ?? 0, 1)}
                      total={messages?.totalElements ?? 0}
                      pageSize={msgPageSize}
                      disabled={msgLoading}
                      onPageChange={(p) => setMsgPage(Math.max(0, p - 1))}
                      onPageSizeChange={(size) => {
                        setMsgPageSize(size);
                        setMsgPage(0);
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : null}

      {tab === "email" ? (
        <>
          <form onSubmit={submitEmail} className="glass-card-static mt-4 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-4">
              <h2 className="text-sm font-bold text-[var(--zy-ink)]">{t("admin.emailSend")}</h2>

              <EmailComposer
                value={emailCompose}
                onChange={setEmailCompose}
                insertTarget={emailInsertTarget}
                onInsertTargetChange={setEmailInsertTarget}
                insertParamRef={emailInsertParamRef}
              />

              <ParamDataEditor
                value={emailParams}
                onChange={setEmailParams}
                recipients={emailRecipients}
                onInsertParam={(name) => {
                  if (emailInsertParamRef.current) {
                    emailInsertParamRef.current(name);
                    return;
                  }
                  if (emailInsertTarget === "subject") {
                    setEmailCompose((c) => ({
                      ...c,
                      subject: insertPlaceholder(c.subject, name).slice(0, 200),
                    }));
                  } else {
                    setEmailCompose((c) => ({
                      ...c,
                      body: insertPlaceholder(c.body, name).slice(0, 20000),
                    }));
                  }
                }}
              />

              <AudienceFields
                value={emailAudience}
                onChange={(next) => {
                  setEmailAudience(next);
                  setEmailPreview(null);
                }}
                users={users}
                usersLoading={usersLoading}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={emailBusy}
                  onClick={() => void previewAudience(emailAudience, setEmailPreview)}
                  className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--zy-border)] px-3.5 py-2 text-sm font-semibold text-[var(--zy-ink)] transition hover:bg-accent-500/10 disabled:opacity-50"
                >
                  {t("admin.previewAudience")}
                </button>
                {emailPreview != null ? (
                  <span className="text-xs text-[var(--zy-muted)]">
                    {t("admin.audienceCount", { count: faNum(emailPreview) })}
                  </span>
                ) : null}
                <button type="submit" disabled={emailBusy} className={clsx(dialogPrimaryBtnClass, "ms-auto")}>
                  {emailBusy ? t("common.saving") : t("admin.emailSend")}
                </button>
              </div>
            </div>
          </form>

          {emailLoading && !emailCampaigns ? (
            <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
          ) : emailRows.length === 0 ? (
            <div className="glass-card-static mt-6 p-1">
              <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
                <Mail size={28} className="text-accent-500" />
                <p className="text-sm text-[var(--zy-muted)]">{t("admin.emptyEmail")}</p>
              </div>
            </div>
          ) : (
            <div className="glass-card-static mt-6 p-1">
              <div className="glass-inner !m-2 overflow-hidden !p-0">
                <div className="p-2 md:p-0">
                  <ResponsiveRecords
                    fitWidth
                    columns={[
                      t("admin.colSubject"),
                      t("admin.colStatus"),
                      t("admin.colRecipients"),
                      t("admin.colCreated"),
                      "",
                    ]}
                    rows={emailRows.map((row) => {
                      const when = formatRelativeTime(row.createdAt) || "—";
                      const statusNode = (
                        <span className="zy-chip">{emailStatusLabel(String(row.status))}</span>
                      );
                      const recipients = (
                        <span>
                          {faNum(row.sentCount)}/{faNum(row.totalRecipients)}
                          {row.failedCount > 0 ? (
                            <span className="ms-1 text-xs text-red-600 dark:text-red-300">
                              (−{faNum(row.failedCount)})
                            </span>
                          ) : null}
                          {(row.skippedCount ?? 0) > 0 ? (
                            <span className="ms-1 text-xs text-[var(--zy-muted)]">
                              ({t("admin.colSkipped")}: {faNum(row.skippedCount ?? 0)})
                            </span>
                          ) : null}
                        </span>
                      );
                      const deleteBtn = (
                        <button
                          type="button"
                          onClick={() => setDeleteEmailId(row.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"
                        >
                          <Trash2 size={12} />
                          {t("admin.deleteEmail")}
                        </button>
                      );
                      return {
                        key: row.id,
                        cells: [
                          <div key="s" className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--zy-ink)]">
                              {row.subject || "—"}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setViewMessage({ title: row.subject, body: row.body })
                              }
                              className="mt-0.5 cursor-pointer text-start text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300"
                            >
                              {t("admin.viewMessageText")}
                            </button>
                          </div>,
                          statusNode,
                          recipients,
                          <span key="c" className="text-[var(--zy-muted)]">
                            {when}
                          </span>,
                          deleteBtn,
                        ],
                        details: [
                          {
                            label: t("admin.colSubject"),
                            value: row.subject || "—",
                          },
                          {
                            label: t("admin.colMessage"),
                            value: (
                              <button
                                type="button"
                                onClick={() =>
                                  setViewMessage({ title: row.subject, body: row.body })
                                }
                                className="cursor-pointer text-start text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
                              >
                                {t("admin.viewMessageText")}
                              </button>
                            ),
                          },
                          { label: t("admin.colStatus"), value: statusNode },
                          { label: t("admin.colRecipients"), value: recipients },
                          { label: t("admin.colCreated"), value: when },
                        ],
                        actions: deleteBtn,
                      };
                    })}
                  />
                </div>
                <TablePagination
                  page={emailPage + 1}
                  pageCount={Math.max(emailCampaigns?.totalPages ?? 0, 1)}
                  total={emailCampaigns?.totalElements ?? 0}
                  pageSize={emailPageSize}
                  disabled={emailLoading}
                  onPageChange={(p) => setEmailPage(Math.max(0, p - 1))}
                  onPageSizeChange={(size) => {
                    setEmailPageSize(size);
                    setEmailPage(0);
                  }}
                />
              </div>
            </div>
          )}
        </>
      ) : null}

      {tab === "sms" ? (
        <>
          <form onSubmit={submitSms} className="glass-card-static mt-4 p-1">
            <div className="glass-inner !m-2 space-y-4 !p-4">
              <h2 className="text-sm font-bold text-[var(--zy-ink)]">{t("admin.smsSend")}</h2>
              <label className="block text-sm">
                <span className="text-[var(--zy-muted)]">{t("admin.smsBody")}</span>
                <textarea
                  className={clsx(inputClass, "min-h-[7rem] resize-y")}
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value.slice(0, 900))}
                  maxLength={900}
                  required
                />
                <span className="mt-1 block text-xs text-[var(--zy-muted)]">
                  {t("admin.smsCharCount", { count: faNum(smsBody.length) })}
                </span>
                <span className="mt-1 block text-[11px] text-[var(--zy-muted)]">
                  {t("admin.messageParamsHint")}
                </span>
              </label>
              <ParamDataEditor
                value={smsParams}
                onChange={setSmsParams}
                recipients={smsRecipients}
                onInsertParam={(name) => setSmsBody((b) => insertPlaceholder(b, name))}
              />

              <AudienceFields
                value={smsAudience}
                onChange={(next) => {
                  setSmsAudience(next);
                  setSmsPreview(null);
                }}
                users={users}
                usersLoading={usersLoading}
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={smsBusy}
                  onClick={() => void previewAudience(smsAudience, setSmsPreview)}
                  className="inline-flex cursor-pointer items-center rounded-xl border border-[var(--zy-border)] px-3.5 py-2 text-sm font-semibold text-[var(--zy-ink)] transition hover:bg-accent-500/10 disabled:opacity-50"
                >
                  {t("admin.previewAudience")}
                </button>
                {smsPreview != null ? (
                  <span className="text-xs text-[var(--zy-muted)]">
                    {t("admin.audienceCount", { count: faNum(smsPreview) })}
                  </span>
                ) : null}
                <button type="submit" disabled={smsBusy} className={clsx(dialogPrimaryBtnClass, "ms-auto")}>
                  {smsBusy ? t("common.saving") : t("admin.smsSend")}
                </button>
              </div>
            </div>
          </form>

          {smsLoading && !campaigns ? (
            <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
          ) : smsRows.length === 0 ? (
            <div className="glass-card-static mt-6 p-1">
              <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
                <Smartphone size={28} className="text-accent-500" />
                <p className="text-sm text-[var(--zy-muted)]">{t("admin.emptySms")}</p>
              </div>
            </div>
          ) : (
            <div className="glass-card-static mt-6 p-1">
              <div className="glass-inner !m-2 overflow-hidden !p-0">
                <div className="p-2 md:p-0">
                  <ResponsiveRecords
                    fitWidth
                    columns={[
                      t("admin.colMessage"),
                      t("admin.colStatus"),
                      t("admin.colRecipients"),
                      t("admin.colCreated"),
                    ]}
                    rows={smsRows.map((row) => {
                      const when = formatRelativeTime(row.createdAt) || "—";
                      const statusNode = (
                        <span className="zy-chip">{smsStatusLabel(String(row.status))}</span>
                      );
                      const recipients = (
                        <span>
                          {faNum(row.sentCount)}/{faNum(row.totalRecipients)}
                          {row.failedCount > 0 ? (
                            <span className="ms-1 text-xs text-red-600 dark:text-red-300">
                              (−{faNum(row.failedCount)})
                            </span>
                          ) : null}
                        </span>
                      );
                      return {
                        key: row.id,
                        cells: [
                          <div key="b" className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setViewMessage({ body: row.body })}
                              className="cursor-pointer text-start text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
                            >
                              {t("admin.viewMessageText")}
                            </button>
                          </div>,
                          statusNode,
                          recipients,
                          <span key="c" className="text-[var(--zy-muted)]">
                            {when}
                          </span>,
                        ],
                        details: [
                          {
                            label: t("admin.colMessage"),
                            value: (
                              <button
                                type="button"
                                onClick={() => setViewMessage({ body: row.body })}
                                className="cursor-pointer text-start text-sm font-semibold text-accent-700 hover:underline dark:text-accent-300"
                              >
                                {t("admin.viewMessageText")}
                              </button>
                            ),
                          },
                          { label: t("admin.colStatus"), value: statusNode },
                          { label: t("admin.colRecipients"), value: recipients },
                          { label: t("admin.colCreated"), value: when },
                        ],
                      };
                    })}
                  />
                </div>
                <TablePagination
                  page={smsPage + 1}
                  pageCount={Math.max(campaigns?.totalPages ?? 0, 1)}
                  total={campaigns?.totalElements ?? 0}
                  pageSize={smsPageSize}
                  disabled={smsLoading}
                  onPageChange={(p) => setSmsPage(Math.max(0, p - 1))}
                  onPageSizeChange={(size) => {
                    setSmsPageSize(size);
                    setSmsPage(0);
                  }}
                />
              </div>
            </div>
          )}
        </>
      ) : null}

      {tab === "settings" ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--zy-muted)]">{t("admin.smsPanelsHint")}</p>
            <button
              type="button"
              onClick={openCreatePanel}
              className={clsx(dialogPrimaryBtnClass, "inline-flex items-center gap-1.5")}
            >
              <Plus size={16} />
              {t("admin.smsAddPanel")}
            </button>
          </div>

          {settingsLoading && panels.length === 0 ? (
            <p className="text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
          ) : panels.length === 0 ? (
            <p className="text-sm text-[var(--zy-muted)]">{t("admin.smsPanelsEmpty")}</p>
          ) : (
            <div className="space-y-3">
              {panels.map((panel) => (
                <div key={panel.id} className="glass-card-static p-1">
                  <div className="glass-inner !m-2 space-y-3 !p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-[var(--zy-ink)]">{panel.name || "—"}</h3>
                          <span
                            className={clsx(
                              "zy-chip",
                              panel.active
                                ? "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-700 dark:!text-emerald-300"
                                : "!text-[var(--zy-muted)]",
                            )}
                          >
                            {panel.active ? t("admin.smsPanelActive") : t("admin.smsPanelInactive")}
                          </span>
                          {panel.enabled ? (
                            <span className="text-xs text-[var(--zy-muted)]">
                              {t("admin.smsEnabled")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-[var(--zy-muted)]" dir="ltr">
                          {panel.baseUrl || "—"}
                          {panel.lineNumber ? ` · ${panel.lineNumber}` : ""}
                          {panel.apiKeySet && panel.apiKeyMasked ? ` · ${panel.apiKeyMasked}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!panel.active && panel.id != null ? (
                          <button
                            type="button"
                            disabled={settingsBusy}
                            onClick={() => void activatePanel(panel.id!)}
                            className="rounded-xl border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-300"
                          >
                            {t("admin.smsActivatePanel")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={settingsBusy}
                          onClick={() => openEditPanel(panel)}
                          className="rounded-xl border border-[var(--zy-border)] px-3 py-1.5 text-xs font-semibold text-[var(--zy-ink)] hover:bg-accent-500/10 disabled:opacity-50"
                        >
                          {t("admin.smsEditPanel")}
                        </button>
                        {panels.length > 1 && panel.id != null ? (
                          <button
                            type="button"
                            disabled={settingsBusy}
                            onClick={() => setDeletePanelId(panel.id!)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
                          >
                            <Trash2 size={12} />
                            {t("admin.smsDeletePanel")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {panel.active ? (
                      <div className="rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/40 px-3 py-2.5 text-sm">
                        <p className="text-[var(--zy-muted)]">{t("admin.smsCredit")}</p>
                        <p className="mt-0.5 font-semibold text-[var(--zy-ink)]" dir="ltr">
                          {panel.credit != null ? faNum(panel.credit) : "—"}
                        </p>
                        {panel.creditError ? (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                            {t("admin.smsCreditError")}: {panel.creditError}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <GlassDialog
            open={panelDialogOpen}
            onClose={() => setPanelDialogOpen(false)}
            title={editingPanel ? t("admin.smsEditPanel") : t("admin.smsAddPanel")}
          >
            <form className="space-y-3" onSubmit={(e) => void savePanel(e)}>
              <label className="block text-sm">
                <span className="text-[var(--zy-muted)]">{t("admin.smsPanelName")}</span>
                <input
                  className={inputClass}
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  placeholder={t("admin.smsPanelNamePlaceholder")}
                  maxLength={120}
                  required
                />
              </label>
              <ZyCheckbox
                label={t("admin.smsEnabled")}
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="text-[var(--zy-muted)]">{t("admin.smsApiKey")}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      editingPanel?.apiKeySet
                        ? editingPanel.apiKeyMasked || t("admin.smsApiKeySetHint")
                        : undefined
                    }
                  />
                  {editingPanel?.apiKeySet ? (
                    <span className="mt-1 block text-xs text-[var(--zy-muted)]">
                      {t("admin.smsApiKeySetHint")}
                    </span>
                  ) : null}
                </label>
                <label className="block text-sm">
                  <span className="text-[var(--zy-muted)]">{t("admin.smsLineNumber")}</span>
                  <input
                    className={inputClass}
                    value={lineNumber}
                    onChange={(e) => setLineNumber(e.target.value)}
                    dir="ltr"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[var(--zy-muted)]">{t("admin.smsTemplateId")}</span>
                  <input
                    className={inputClass}
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    inputMode="numeric"
                    dir="ltr"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[var(--zy-muted)]">{t("admin.smsParameterName")}</span>
                  <input
                    className={inputClass}
                    value={parameterName}
                    onChange={(e) => setParameterName(e.target.value)}
                    dir="ltr"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[var(--zy-muted)]">{t("admin.smsBaseUrl")}</span>
                  <input
                    className={inputClass}
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    dir="ltr"
                  />
                </label>
              </div>
              <ZyCheckbox
                label={t("admin.smsExposeDebug")}
                checked={exposeDebugCode}
                onChange={(e) => setExposeDebugCode(e.target.checked)}
              />
              {!editingPanel ? (
                <ZyCheckbox
                  label={t("admin.smsActivatePanel")}
                  checked={activateOnCreate}
                  onChange={(e) => setActivateOnCreate(e.target.checked)}
                />
              ) : null}
              <div className="flex justify-end pt-1">
                <button type="submit" disabled={settingsBusy} className={dialogPrimaryBtnClass}>
                  {settingsBusy ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          </GlassDialog>

          <ConfirmDialog
            open={deletePanelId != null}
            onClose={() => setDeletePanelId(null)}
            title={t("admin.smsDeletePanel")}
            message={t("admin.smsDeletePanelConfirm")}
            danger
            busy={settingsBusy}
            onConfirm={() => void deletePanel()}
          />
        </div>
      ) : null}

      <GlassDialog
        open={viewMessage != null}
        onClose={() => setViewMessage(null)}
        title={viewMessage?.title || t("admin.viewMessageTitle")}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--zy-ink)]">
          {viewMessage?.body || ""}
        </p>
      </GlassDialog>

      <ConfirmDialog
        open={deleteMessageId != null}
        onClose={() => setDeleteMessageId(null)}
        title={t("admin.deleteMessage")}
        message={t("admin.deleteMessageConfirm")}
        danger
        busy={deleteMessageBusy}
        onConfirm={() => void deleteMessage()}
      />

      <ConfirmDialog
        open={deleteEmailId != null}
        onClose={() => setDeleteEmailId(null)}
        title={t("admin.deleteEmail")}
        message={t("admin.deleteEmailConfirm")}
        danger
        busy={deleteEmailBusy}
        onConfirm={() => void deleteEmailCampaign()}
      />
    </div>
  );
}
