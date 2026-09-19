"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, LogOut, Plus, Users } from "lucide-react";
import clsx from "clsx";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassDialog } from "@/components/ui/GlassDialog";
import { GlassSelect } from "@/components/ui/GlassSelect";
import { ResponsiveRecords } from "@/components/ui/ResponsiveRecords";
import { TablePagination } from "@/components/ui/TablePagination";
import { api } from "@/lib/api";
import { appChipClass, isZunkoApp } from "@/lib/apps";
import { faNum, t } from "@/lib/i18n";
import { dialogPrimaryBtnClass, fieldInputClass, fieldLabelClass } from "@/lib/ui";
import { toast } from "@/lib/toast";
import type {
  AdminAccountUser,
  AdminAccountUserPage,
  AdminPanelCustomer,
  AdminPanelCustomerPage,
  AdminRevokeResult,
} from "@/types/account";

type TabId = "panels" | "users";
type PlanCode = "start" | "growth" | "peak";

type PendingRevoke = {
  key: string;
  path: string;
  message: string;
  title: string;
};

type CreatePanelForm = {
  ownerPhone: string;
  organizationName: string;
  planCode: PlanCode;
  studentCount: string;
  years: string;
};

const EMPTY_CREATE_FORM: CreatePanelForm = {
  ownerPhone: "",
  organizationName: "",
  planCode: "start",
  studentCount: "40",
  years: "1",
};

const APP_OPTIONS = [
  { value: "", labelKey: "admin.allApps" },
  { value: "ZUNYAR", labelKey: "admin.appZUNYAR" },
  { value: "ZUNKO", labelKey: "admin.appZUNKO" },
] as const;

const PANEL_ROLES_BY_APP: Record<string, { value: string; labelKey: string }[]> = {
  ZUNYAR: [
    { value: "student", labelKey: "admin.panelRoleStudent" },
    { value: "parent", labelKey: "admin.panelRoleParent" },
    { value: "teacher", labelKey: "admin.panelRoleTeacher" },
    { value: "staff", labelKey: "admin.panelRoleStaff" },
    { value: "manager", labelKey: "admin.panelRoleManager" },
  ],
  ZUNKO: [
    { value: "student", labelKey: "admin.panelRoleUniversityStudent" },
    { value: "support", labelKey: "admin.panelRoleSupport" },
    { value: "teacher", labelKey: "admin.panelRoleInstructor" },
  ],
};

function appLabel(code?: string | null) {
  if (!code) return "—";
  const key = `admin.app${code}` as const;
  const translated = t(key);
  return translated === key ? code : translated;
}

function appNode(code?: string | null) {
  return <span className={clsx("zy-chip", appChipClass(code))}>{appLabel(code)}</span>;
}

function systemRoleLabel(role?: string | null) {
  if (!role) return "—";
  const key = `admin.role${role}` as const;
  const translated = t(key);
  return translated === key ? role : translated;
}

function managerCell(row: AdminPanelCustomer) {
  const name = row.managerName?.trim();
  const phone = row.managerPhone;
  if (!name && !phone) return "—";
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-[var(--zy-ink)]">{name || "—"}</p>
      {phone ? (
        <p className="truncate text-xs text-[var(--zy-muted)]" dir="ltr">
          {faNum(phone)}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminCustomersPage() {
  const [tab, setTab] = useState<TabId>("panels");
  const [appCode, setAppCode] = useState("");
  const [role, setRole] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [panels, setPanels] = useState<AdminPanelCustomerPage | null>(null);
  const [users, setUsers] = useState<AdminAccountUserPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<PendingRevoke | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePanelForm>(EMPTY_CREATE_FORM);
  const [createBusy, setCreateBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(searchInput.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadPanels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appCode) params.set("appCode", appCode);
      if (q) params.set("q", q);
      params.set("page", String(page));
      params.set("size", String(pageSize));
      const result = await api<AdminPanelCustomerPage>(`/admin/panels?${params.toString()}`);
      setPanels(result);
    } catch (err) {
      setPanels(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [appCode, q, page, pageSize]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (appCode) params.set("appCode", appCode);
      params.set("page", String(page));
      params.set("size", String(pageSize));
      const result = await api<AdminAccountUserPage>(`/admin/users?${params.toString()}`);
      setUsers(result);
    } catch (err) {
      setUsers(null);
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [appCode, role, q, page, pageSize]);

  useEffect(() => {
    if (tab === "panels") {
      void loadPanels();
    } else {
      void loadUsers();
    }
  }, [tab, loadPanels, loadUsers]);

  function askRevoke(key: string, path: string, message: string, title?: string) {
    setPendingRevoke({
      key,
      path,
      message,
      title: title || t("admin.revokeConfirmTitle"),
    });
  }

  async function confirmRevoke() {
    if (!pendingRevoke) return;
    const { key, path } = pendingRevoke;
    setBusyKey(key);
    try {
      const result = await api<AdminRevokeResult>(path, { method: "POST" });
      toast.success(
        result?.message ||
          t("admin.revokeDone", { sessions: result?.revokedSessions ?? 0 })
      );
      setPendingRevoke(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusyKey(null);
    }
  }

  function openCreatePanel() {
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateOpen(true);
  }

  function closeCreatePanel() {
    if (createBusy) return;
    setCreateOpen(false);
  }

  async function submitCreatePanel() {
    const ownerPhone = createForm.ownerPhone.trim();
    const organizationName = createForm.organizationName.trim();
    const studentCount = Number(createForm.studentCount);
    const years = Number(createForm.years);

    if (!ownerPhone) {
      toast.error(t("admin.ownerPhone"));
      return;
    }
    if (!organizationName) {
      toast.error(t("admin.organizationName"));
      return;
    }
    if (!Number.isFinite(studentCount) || studentCount < 1) {
      toast.error(t("admin.studentCount"));
      return;
    }
    if (!Number.isFinite(years) || years < 1 || years > 10) {
      toast.error(t("admin.subscriptionYears"));
      return;
    }

    setCreateBusy(true);
    try {
      const created = await api<AdminPanelCustomer>("/admin/panels", {
        method: "POST",
        body: JSON.stringify({
          ownerPhone,
          organizationName,
          planCode: createForm.planCode,
          studentCount: Math.floor(studentCount),
          years: Math.floor(years),
        }),
      });
      toast.success(created?.panelName || t("admin.createPanel"));
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
      if (tab !== "panels") {
        setTab("panels");
        setPage(0);
      } else {
        await loadPanels();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setCreateBusy(false);
    }
  }

  const data = tab === "panels" ? panels : users;
  const totalPages = Math.max(data?.totalPages ?? 0, 1);
  const totalElements = data?.totalElements ?? 0;
  const rowsEmpty =
    tab === "panels" ? (panels?.content.length ?? 0) === 0 : (users?.content.length ?? 0) === 0;

  const pagination = (
    <TablePagination
      page={page + 1}
      pageCount={totalPages}
      total={totalElements}
      pageSize={pageSize}
      disabled={loading}
      onPageChange={(p) => setPage(Math.max(0, p - 1))}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(0);
      }}
    />
  );

  function panelRolesCell(user: AdminAccountUser) {
    if (!user.panelRoles?.length) {
      return <span className="text-[var(--zy-muted)]">{t("admin.noPanelRoles")}</span>;
    }
    return (
      <div className="flex max-w-xl flex-wrap gap-1.5">
        {user.panelRoles.map((role) => (
          <button
            key={`${role.panelId}-${role.roleCode ?? "r"}`}
            type="button"
            title={t("admin.revokeUserInPanel")}
            disabled={busyKey !== null}
            onClick={() =>
              void askRevoke(
                `u${user.userId}-p${role.panelId}`,
                `/admin/sessions/revoke-user/${user.userId}/panel/${role.panelId}`,
                t("admin.revokeConfirmUserPanel")
              )
            }
            className={clsx(
              "zy-chip !max-w-full cursor-pointer truncate transition hover:!bg-red-500/10 hover:!text-red-600 disabled:cursor-not-allowed disabled:opacity-50",
              isZunkoApp(role.appCode)
                ? "!border-orange-500/35 !bg-orange-500/15 !text-orange-700 dark:!text-orange-300"
                : "!border-accent-500/20 !bg-accent-500/10 !text-accent-700 dark:!text-accent-300"
            )}
          >
            {appLabel(String(role.appCode))} · {role.panelName}
            {role.roleLabelFa || role.roleCode
              ? ` · ${role.roleLabelFa || role.roleCode}`
              : ""}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
            <Building2 size={20} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[var(--zy-ink)]">{t("admin.customers")}</h1>
            <p className="mt-1 text-sm text-[var(--zy-muted)]">{t("admin.customersHint")}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreatePanel}
            className={clsx(dialogPrimaryBtnClass, "inline-flex items-center gap-1.5 !px-3.5 !py-2")}
          >
            <Plus size={16} />
            {t("admin.createPanel")}
          </button>
          <button
            type="button"
            disabled={busyKey !== null}
            onClick={() =>
              askRevoke(
                "all",
                "/admin/sessions/revoke-all",
                t("admin.revokeConfirmAll"),
                t("admin.revokeConfirmTitleAll")
              )
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
            title={t("admin.revokeAllSessionsHint")}
          >
            <LogOut size={16} />
            {t("admin.revokeAllSessions")}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { id: "panels" as const, label: t("admin.tabPanels"), icon: Building2 },
            { id: "users" as const, label: t("admin.tabUsers"), icon: Users },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setPage(0);
              setSearchInput("");
              setQ("");
            }}
            className={clsx(
              "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition",
              tab === item.id
                ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
                : "border-[var(--zy-border)] text-[var(--zy-muted)] hover:bg-accent-500/10 hover:text-[var(--zy-ink)]"
            )}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="glass-card-static mt-4 p-1">
        <div className="glass-inner !m-2 flex flex-wrap items-end gap-3 !p-4">
          <label className="block min-w-[14rem] flex-[2] text-sm">
            <span className="text-[var(--zy-muted)]">{t("admin.search")}</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                tab === "panels"
                  ? t("admin.searchPanelsPlaceholder")
                  : t("admin.searchUsersPlaceholder")
              }
              className="mt-1 w-full rounded-xl border border-[var(--zy-border)] bg-[var(--zy-surface)] px-3 py-2.5 text-sm text-[var(--zy-ink)] outline-none transition focus:border-accent-500/50"
            />
          </label>
          {tab === "panels" ? (
            <label className="block min-w-[9rem] flex-1 text-sm sm:max-w-[12rem]">
              <span className="text-[var(--zy-muted)]">{t("admin.filterApp")}</span>
              <GlassSelect
                className="mt-1"
                value={appCode}
                onChange={(v) => {
                  setAppCode(v);
                  setPage(0);
                }}
                options={APP_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
              />
            </label>
          ) : (
            <>
              <label className="block min-w-[9rem] flex-1 text-sm sm:max-w-[12rem]">
                <span className="text-[var(--zy-muted)]">{t("admin.filterApp")}</span>
                <GlassSelect
                  className="mt-1"
                  value={appCode}
                  onChange={(v) => {
                    setAppCode(v);
                    setRole("");
                    setPage(0);
                  }}
                  options={APP_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                />
              </label>
              <label className="block min-w-[9rem] flex-1 text-sm sm:max-w-[12rem]">
                <span className="text-[var(--zy-muted)]">{t("admin.filterRole")}</span>
                <GlassSelect
                  className="mt-1"
                  value={role}
                  onChange={(v) => {
                    setRole(v);
                    setPage(0);
                  }}
                  options={
                    appCode
                      ? [
                          { value: "", label: t("admin.allRoles") },
                          ...(PANEL_ROLES_BY_APP[appCode] || []).map((o) => ({
                            value: o.value,
                            label: t(o.labelKey),
                          })),
                        ]
                      : [
                          { value: "", label: t("admin.allRoles") },
                          { value: "no_panel", label: t("admin.noPanelRoles") },
                        ]
                  }
                />
              </label>
            </>
          )}
          {data ? (
            <p className="ms-auto text-xs text-[var(--zy-muted)]">
              {tab === "panels"
                ? t("admin.totalPanels", { count: data.totalElements })
                : t("admin.totalUsers", { count: data.totalElements })}
            </p>
          ) : null}
        </div>
      </div>

      {loading && !data ? (
        <p className="mt-8 text-sm text-[var(--zy-muted)]">{t("common.loading")}</p>
      ) : rowsEmpty ? (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 flex flex-col items-center gap-3 !p-10 text-center">
            {tab === "panels" ? (
              <Building2 size={28} className="text-accent-500" />
            ) : (
              <Users size={28} className="text-accent-500" />
            )}
            <p className="text-sm text-[var(--zy-muted)]">
              {tab === "panels" ? t("admin.emptyPanels") : t("admin.emptyUsers")}
            </p>
          </div>
        </div>
      ) : tab === "panels" ? (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 overflow-hidden !p-0">
            <div className="p-2 md:p-0">
              <ResponsiveRecords
                fitWidth
                columns={[
                  t("admin.colPanel"),
                  t("admin.colPanelCode"),
                  t("admin.colApp"),
                  t("admin.colManager"),
                  t("admin.colStudents"),
                  t("admin.colStaff"),
                  t("common.actions"),
                ]}
                columnClassNames={[
                  "w-auto",
                  "w-[8rem]",
                  "w-[5rem]",
                  "w-[9rem]",
                  "w-[5.5rem]",
                  "w-[5.5rem]",
                  "w-[8rem]",
                ]}
                rows={(panels?.content ?? []).map((row) => {
                  const panelTitle = (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--zy-ink)]">{row.panelName}</p>
                      {row.organizationLabel && row.organizationLabel !== row.panelName ? (
                        <p className="truncate text-xs text-[var(--zy-muted)]">
                          {row.organizationLabel}
                        </p>
                      ) : null}
                    </div>
                  );
                  const students = t("admin.membersCount", { count: row.studentCount ?? 0 });
                  const staff = t("admin.membersCount", { count: row.staffCount ?? 0 });
                  const revokeBtn = (
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() =>
                        askRevoke(
                          `panel-${row.panelId}`,
                          `/admin/sessions/revoke-panel/${row.panelId}`,
                          t("admin.revokeConfirmPanel")
                        )
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-red-500/25 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
                    >
                      <LogOut size={12} />
                      {t("admin.revokePanelSessions")}
                    </button>
                  );
                  const managerLogout =
                    row.managerUserId != null ? (
                      <button
                        type="button"
                        disabled={busyKey !== null}
                        onClick={() =>
                          askRevoke(
                            `mgr-${row.managerUserId}-p${row.panelId}`,
                            `/admin/sessions/revoke-user/${row.managerUserId}/panel/${row.panelId}`,
                            t("admin.revokeConfirmUserPanel")
                          )
                        }
                        className="mt-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50 dark:text-red-300"
                      >
                        {t("admin.revokeUserInPanel")}
                      </button>
                    ) : null;
                  return {
                    key: row.panelId,
                    cells: [
                      panelTitle,
                      <span key="code" className="font-mono text-xs" dir="ltr">
                        {row.panelCode}
                      </span>,
                      appNode(String(row.appCode)),
                      <div key="mgr">
                        {managerCell(row)}
                        {managerLogout}
                      </div>,
                      <span key="st" title={t("admin.studentsHint")}>
                        {students}
                      </span>,
                      <span key="sf" title={t("admin.staffHint")}>
                        {staff}
                      </span>,
                      revokeBtn,
                    ],
                    details: [
                      { label: t("admin.colPanel"), value: panelTitle },
                      {
                        label: t("admin.colPanelCode"),
                        value: row.panelCode,
                        dir: "ltr" as const,
                      },
                      { label: t("admin.colApp"), value: appNode(String(row.appCode)) },
                      { label: t("admin.colManager"), value: managerCell(row) },
                      { label: t("admin.colStudents"), value: students },
                      { label: t("admin.colStaff"), value: staff },
                    ],
                    actions: (
                      <div className="flex flex-wrap justify-end gap-2">
                        {managerLogout}
                        {revokeBtn}
                      </div>
                    ),
                  };
                })}
              />
            </div>
            {pagination}
          </div>
        </div>
      ) : (
        <div className="glass-card-static mt-6 p-1">
          <div className="glass-inner !m-2 overflow-hidden !p-0">
            <div className="p-2 md:p-0">
              <ResponsiveRecords
                fitWidth
                columns={[
                  t("admin.colUser"),
                  t("admin.colNationalCode"),
                  t("admin.colSystemRole"),
                  t("admin.colPanelRoles"),
                  t("common.actions"),
                ]}
                columnClassNames={[
                  "w-[10rem]",
                  "w-[7rem]",
                  "w-[5rem]",
                  "w-auto",
                  "w-[7.5rem]",
                ]}
                rows={(users?.content ?? []).map((user) => {
                  const userCell = (
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--zy-ink)]">
                        {user.fullName || "—"}
                      </p>
                      <p className="truncate text-xs text-[var(--zy-muted)]" dir="ltr">
                        {faNum(user.phone)}
                      </p>
                    </div>
                  );
                  const roleChip = (
                    <span
                      className={clsx(
                        "zy-chip !whitespace-nowrap",
                        user.role === "ADMIN"
                          ? "!border-violet-500/30 !bg-violet-500/10 !text-violet-700 dark:!text-violet-300"
                          : "!border-[var(--zy-border)] !bg-[var(--zy-surface)]"
                      )}
                    >
                      {systemRoleLabel(user.role)}
                    </span>
                  );
                  const revokeUserBtn = (
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() =>
                        askRevoke(
                          `user-${user.userId}`,
                          `/admin/sessions/revoke-user/${user.userId}`,
                          t("admin.revokeConfirmUser")
                        )
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-red-500/25 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
                    >
                      <LogOut size={12} />
                      {t("admin.revokeUserSessions")}
                    </button>
                  );
                  return {
                    key: user.userId,
                    cells: [
                      userCell,
                      <span key="nc" dir="ltr">
                        {user.nationalCode ? faNum(user.nationalCode) : "—"}
                      </span>,
                      roleChip,
                      panelRolesCell(user),
                      revokeUserBtn,
                    ],
                    details: [
                      { label: t("admin.colUser"), value: userCell },
                      {
                        label: t("admin.colNationalCode"),
                        value: user.nationalCode ? faNum(user.nationalCode) : "—",
                        dir: "ltr" as const,
                      },
                      { label: t("admin.colSystemRole"), value: roleChip },
                      { label: t("admin.colPanelRoles"), value: panelRolesCell(user) },
                    ],
                    actions: revokeUserBtn,
                  };
                })}
              />
            </div>
            {pagination}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingRevoke != null}
        onClose={() => {
          if (busyKey) return;
          setPendingRevoke(null);
        }}
        onConfirm={() => void confirmRevoke()}
        title={pendingRevoke?.title || t("admin.revokeConfirmTitle")}
        message={pendingRevoke?.message || ""}
        confirmLabel={t("admin.revokeConfirmAction")}
        danger
        busy={busyKey != null}
      />

      <GlassDialog
        open={createOpen}
        onClose={closeCreatePanel}
        title={t("admin.createPanelTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--zy-muted)]">{t("admin.createPanelHint")}</p>
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.ownerPhone")}</label>
            <input
              className={fieldInputClass(false)}
              dir="ltr"
              inputMode="tel"
              value={createForm.ownerPhone}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, ownerPhone: e.target.value }))
              }
              placeholder="09xxxxxxxxx"
            />
          </div>
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.organizationName")}</label>
            <input
              className={fieldInputClass(false)}
              value={createForm.organizationName}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, organizationName: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.planCode")}</label>
            <GlassSelect
              value={createForm.planCode}
              onChange={(v) =>
                setCreateForm((f) => ({ ...f, planCode: v as PlanCode }))
              }
              options={[
                { value: "start", label: t("admin.planStart") },
                { value: "growth", label: t("admin.planGrowth") },
                { value: "peak", label: t("admin.planPeak") },
              ]}
            />
          </div>
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.studentCount")}</label>
            <input
              className={fieldInputClass(false)}
              dir="ltr"
              inputMode="numeric"
              value={createForm.studentCount}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, studentCount: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={fieldLabelClass(false)}>{t("admin.subscriptionYears")}</label>
            <input
              className={fieldInputClass(false)}
              dir="ltr"
              inputMode="numeric"
              value={createForm.years}
              onChange={(e) => setCreateForm((f) => ({ ...f, years: e.target.value }))}
            />
          </div>
          <button
            type="button"
            disabled={createBusy}
            onClick={() => void submitCreatePanel()}
            className={clsx(dialogPrimaryBtnClass, "w-full disabled:opacity-50")}
          >
            {createBusy ? t("common.saving") : t("admin.createPanel")}
          </button>
        </div>
      </GlassDialog>
    </div>
  );
}
