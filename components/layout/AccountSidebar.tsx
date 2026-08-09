"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  UserRound,
  LayoutGrid,
  Wallet,
  Radio,
  ShieldCheck,
  Users,
  LogOut,
  FileText,
  GraduationCap,
  Briefcase,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Handshake,
  ScrollText,
  Headphones,
  Shield,
} from "lucide-react";
import { SupportMenu } from "@/components/layout/SupportMenu";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { isProfileComplete, PROFILE_PATH } from "@/lib/profile-gate";

const SIDEBAR_COLLAPSED_KEY = "zy-sidebar-collapsed";

type NavItem = {
  href: string;
  labelKey: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

type NavGroup = {
  id: string;
  labelKey: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  children: NavItem[];
};

const NAV_PRIMARY: NavItem[] = [
  { href: "/panel/apps", labelKey: "panel.apps", icon: LayoutGrid },
  { href: "/panel/profile", labelKey: "panel.personalInfo", icon: UserRound },
  { href: "/panel/verification", labelKey: "panel.verification", icon: ShieldCheck },
];

const RESUME_GROUP: NavGroup = {
  id: "resume",
  labelKey: "panel.resume",
  icon: FileText,
  children: [
    { href: "/panel/resume/view", labelKey: "panel.resumeView", icon: FileText },
    { href: "/panel/resume/education", labelKey: "panel.resumeEducation", icon: GraduationCap },
    { href: "/panel/resume/skills", labelKey: "panel.resumeSkills", icon: Sparkles },
    { href: "/panel/resume/experience", labelKey: "panel.resumeExperience", icon: Briefcase },
  ],
};

const NAV_SECONDARY: NavItem[] = [
  { href: "/panel/colleagues", labelKey: "panel.colleagues", icon: Users },
  { href: "/panel/affiliate", labelKey: "panel.affiliate", icon: Handshake },
  { href: "/panel/finance", labelKey: "panel.finance", icon: Wallet },
  { href: "/panel/sessions", labelKey: "panel.sessions", icon: Radio },
];

const ADMIN_GROUP: NavGroup = {
  id: "admin",
  labelKey: "admin.title",
  icon: Shield,
  children: [
    { href: "/panel/admin/logs", labelKey: "admin.logs", icon: ScrollText },
    { href: "/panel/admin/tickets", labelKey: "admin.tickets", icon: Headphones },
  ],
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.fullName ||
    t("panel.brand");

  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 border-b border-[var(--zy-border)] py-4",
        collapsed ? "justify-center px-2" : "px-4",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 p-0.5">
        <BrandLogo height={20} priority className="!h-5 !w-auto" />
      </span>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--zy-ink)]">{displayName}</p>
          <p className="truncate text-[11px] text-[var(--zy-muted)]">{t("panel.brand")}</p>
        </div>
      )}
    </div>
  );
}

function NavLink({
  item,
  pathname,
  nested,
  collapsed,
  locked,
}: {
  item: NavItem;
  pathname: string;
  nested?: boolean;
  collapsed?: boolean;
  /** When true, nav item is non-interactive (profile incomplete). */
  locked?: boolean;
}) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  const className = clsx(
    "flex items-center gap-2.5 rounded-xl py-2.5 text-sm font-medium transition",
    collapsed ? "justify-center px-2" : "px-3",
    nested && !collapsed && "py-2 pe-3 ps-4 text-[13px]",
    locked
      ? "cursor-not-allowed opacity-40 text-[var(--zy-ink)]/70"
      : active
        ? "bg-accent-500 text-white shadow-md shadow-accent-500/25"
        : "text-[var(--zy-ink)]/85 hover:bg-accent-500/10",
  );
  const content = (
    <>
      <Icon
        size={nested ? 16 : 18}
        className={locked || !active ? "text-accent-600 dark:text-accent-400" : ""}
      />
      {!collapsed && t(item.labelKey)}
    </>
  );

  if (locked) {
    return (
      <span title={collapsed ? t(item.labelKey) : undefined} className={className} aria-disabled>
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} title={collapsed ? t(item.labelKey) : undefined} className={className}>
      {content}
    </Link>
  );
}

function CollapsibleNavGroup({
  group,
  pathname,
  collapsed,
  locked,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
  locked: boolean;
}) {
  const groupActive = group.children.some((c) => isActive(pathname, c.href));
  const [manualOpen, setManualOpen] = useState(groupActive);
  const open = !collapsed && !locked && (manualOpen || groupActive);
  const GroupIcon = group.icon;

  return (
    <div>
      <button
        type="button"
        title={collapsed ? t(group.labelKey) : undefined}
        disabled={locked}
        onClick={() => {
          if (collapsed || locked) return;
          setManualOpen((v) => !v);
        }}
        className={clsx(
          "flex w-full items-center gap-2.5 rounded-xl py-2.5 text-sm font-medium transition",
          collapsed ? "justify-center px-2" : "px-3",
          locked
            ? "cursor-not-allowed opacity-40 text-[var(--zy-ink)]/70"
            : groupActive
              ? "cursor-pointer bg-accent-500/15 text-accent-800 dark:text-accent-200"
              : "cursor-pointer text-[var(--zy-ink)]/85 hover:bg-accent-500/10",
        )}
      >
        <GroupIcon size={18} className="text-accent-600 dark:text-accent-400" />
        {!collapsed && (
          <>
            <span className="flex-1 text-start">{t(group.labelKey)}</span>
            <ChevronDown size={16} className={clsx("transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5 border-s border-accent-500/25 ms-4 ps-1">
          {group.children.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} nested locked={locked} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarNav({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  const { user } = useAuth();
  const locked = !isProfileComplete(user);
  const isAdmin = user?.role === "ADMIN";

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {NAV_PRIMARY.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          locked={locked && item.href !== PROFILE_PATH}
        />
      ))}

      <CollapsibleNavGroup
        group={RESUME_GROUP}
        pathname={pathname}
        collapsed={collapsed}
        locked={locked}
      />

      {NAV_SECONDARY.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          locked={locked}
        />
      ))}

      {isAdmin ? (
        <CollapsibleNavGroup
          group={ADMIN_GROUP}
          pathname={pathname}
          collapsed={collapsed}
          locked={locked}
        />
      ) : null}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <div className="border-t border-[var(--zy-border)] px-3 py-3">
      <div className={clsx("flex flex-col gap-0.5", collapsed && "items-center")}>
        <SupportMenu />
        <button
          type="button"
          title={t("common.logout")}
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className={clsx(
            "group inline-flex w-fit max-w-full cursor-pointer items-center self-start overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-all duration-300 hover:bg-red-500/10",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut size={18} className="shrink-0" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ms-2.5 group-hover:max-w-[7rem] group-hover:opacity-100">
            {t("common.logout")}
          </span>
        </button>
      </div>
    </div>
  );
}

type AccountSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

/** Desktop-only sidebar (lg+). Mobile uses MobileBottomNav. */
export function AccountSidebar({ collapsed, onToggle }: AccountSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 start-0 z-30 hidden transition-[width] duration-300 lg:block",
        collapsed ? "w-[4.75rem]" : "w-[17rem]",
      )}
    >
      <div className="zy-sidebar-shell relative flex h-full flex-col">
        <SidebarHeader collapsed={collapsed} />
        <SidebarNav pathname={pathname} collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} />

        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? t("panel.sidebarExpand") : t("panel.sidebarCollapse")}
          title={collapsed ? t("panel.sidebarExpand") : t("panel.sidebarCollapse")}
          className="absolute bottom-24 -end-3 z-40 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[var(--zy-border)] bg-[var(--zy-surface-solid)] text-[var(--zy-ink)] shadow-md transition hover:bg-accent-500/10 hover:text-accent-600 dark:bg-[rgba(22,26,34,0.96)]"
        >
          {collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
    </aside>
  );
}

/** Persist and restore sidebar collapsed preference. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return { collapsed, toggle };
}
