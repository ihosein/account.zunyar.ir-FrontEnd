"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  UserRound,
  LayoutGrid,
  IdCard,
  Wallet,
  Radio,
  ShieldCheck,
  Users,
  Menu,
  X,
  LogOut,
  FileText,
  GraduationCap,
  Briefcase,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { SupportMenu } from "@/components/layout/SupportMenu";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

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

const NAV_BEFORE: NavItem[] = [
  { href: "/panel/profile", labelKey: "panel.personalInfo", icon: UserRound },
  { href: "/panel/usernames", labelKey: "panel.usernames", icon: IdCard },
  { href: "/panel/verification", labelKey: "panel.verification", icon: ShieldCheck },
];

const NAV_AFTER: NavItem[] = [
  { href: "/panel/apps", labelKey: "panel.apps", icon: LayoutGrid },
  { href: "/panel/colleagues", labelKey: "panel.colleagues", icon: Users },
  { href: "/panel/finance", labelKey: "panel.finance", icon: Wallet },
  { href: "/panel/sessions", labelKey: "panel.sessions", icon: Radio },
];

const RESUME_GROUP: NavGroup = {
  id: "resume",
  labelKey: "panel.resume",
  icon: FileText,
  children: [
    { href: "/panel/resume/education", labelKey: "panel.resumeEducation", icon: GraduationCap },
    { href: "/panel/resume/skills", labelKey: "panel.resumeSkills", icon: Sparkles },
    { href: "/panel/resume/experience", labelKey: "panel.resumeExperience", icon: Briefcase },
  ],
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-lg font-black text-accent-600 dark:text-accent-400">
        {t("brand.initial")}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--zy-ink)]">{t("panel.brand")}</p>
        <p className="truncate text-[11px] text-[var(--zy-muted)]" dir="ltr">
          {t("panel.brandEn")}
        </p>
      </div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
  nested,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={clsx(
        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        nested && "py-2 pe-3 ps-4 text-[13px]",
        active
          ? "bg-accent-500 text-white shadow-md shadow-accent-500/25"
          : "text-[var(--zy-ink)]/85 hover:bg-accent-500/10",
      )}
    >
      <Icon size={nested ? 16 : 18} className={active ? "" : "text-accent-600 dark:text-accent-400"} />
      {t(item.labelKey)}
    </Link>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const resumeActive = RESUME_GROUP.children.some((c) => isActive(pathname, c.href));
  const [resumeOpen, setResumeOpen] = useState(resumeActive);
  const ResumeIcon = RESUME_GROUP.icon;

  // keep open when navigating inside resume
  const open = resumeOpen || resumeActive;

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {NAV_BEFORE.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}

      <div>
        <button
          type="button"
          onClick={() => setResumeOpen((v) => !v)}
          className={clsx(
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
            resumeActive
              ? "bg-accent-500/15 text-accent-800 dark:text-accent-200"
              : "text-[var(--zy-ink)]/85 hover:bg-accent-500/10",
          )}
        >
          <ResumeIcon size={18} className="text-accent-600 dark:text-accent-400" />
          <span className="flex-1 text-start">{t(RESUME_GROUP.labelKey)}</span>
          <ChevronDown
            size={16}
            className={clsx("transition-transform", open && "rotate-180")}
          />
        </button>
        {open && (
          <div className="mt-1 space-y-0.5 border-s border-accent-500/25 ms-4 ps-1">
            {RESUME_GROUP.children.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                nested
              />
            ))}
          </div>
        )}
      </div>

      {NAV_AFTER.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.phone || "";

  return (
    <div className="border-t border-[var(--zy-border)] px-3 py-3">
      <div className="mb-2 px-2">
        <p className="truncate text-xs font-semibold text-[var(--zy-ink)]">{displayName}</p>
        <p className="truncate text-[11px] text-[var(--zy-muted)]" dir="ltr">
          {user?.phone}
        </p>
      </div>

      <div className="flex flex-col items-start gap-0.5">
        <SupportMenu />
        <button
          type="button"
          title={t("common.logout")}
          onClick={() => {
            logout();
            router.push("/login");
          }}
          className="group inline-flex max-w-full items-center overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-all duration-300 hover:bg-red-500/10"
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

/** Fixed, flush-to-edge, full-height sidebar (desktop) + slide-in drawer (mobile). */
export function AccountSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="zy-sidebar-shell fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[var(--zy-border)] px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--zy-border)] px-3 py-2 text-sm text-[var(--zy-ink)]"
        >
          <Menu size={16} />
          {t("panel.menu")}
        </button>
        <span className="text-sm font-bold text-[var(--zy-ink)]">{t("panel.brand")}</span>
        <span className="inline-block w-[4.5rem]" aria-hidden />
      </div>

      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[17rem] lg:block">
        <div className="zy-sidebar-shell flex h-full flex-col">
          <SidebarBrand />
          <SidebarNav pathname={pathname} />
          <SidebarFooter />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="close-backdrop"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 w-[17rem] max-w-[85vw]">
            <div className="zy-sidebar-shell flex h-full flex-col">
              <div className="flex items-center justify-between px-3 pt-3">
                <span className="text-sm font-bold text-[var(--zy-ink)]">{t("panel.brand")}</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--zy-muted)] hover:bg-accent-500/10"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <SidebarFooter />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
