"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BookOpen,
  Briefcase,
  ChevronDown,
  FileText,
  GraduationCap,
  Headphones,
  LayoutGrid,
  LogOut,
  Moon,
  Phone,
  Radio,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Ticket,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { isProfileComplete, PROFILE_PATH } from "@/lib/profile-gate";

type SheetId = "userArea" | "settings" | null;

type Tile = {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  extra?: string;
  /** Keep sheet open after click (e.g. open nested support). */
  keepOpen?: boolean;
};

const SUPPORT_PHONE = "02191000000";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function BottomSheet({
  open,
  title,
  onClose,
  headerEnd,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  headerEnd?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button
        type="button"
        aria-label={t("common.close")}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-3xl border border-[var(--zy-border)] border-b-0 bg-[var(--zy-surface-solid)] shadow-2xl shadow-black/25 backdrop-blur-xl dark:bg-[rgba(18,22,30,0.96)]"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="relative flex items-center justify-center border-b border-[var(--zy-border)] px-12 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="absolute start-3 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-accent-500/10 text-accent-700 transition hover:bg-accent-500/20 dark:text-accent-300"
          >
            <ChevronDown size={16} />
          </button>
          <h2 className="text-sm font-bold text-[var(--zy-ink)]">{title}</h2>
          {headerEnd ? (
            <div className="absolute end-3 top-1/2 -translate-y-1/2">{headerEnd}</div>
          ) : null}
        </div>
        <div className="px-3 py-3">{children}</div>
      </div>
    </div>
  );
}

function CompactTile({
  tile,
  onNavigate,
  iconSize = 28,
  locked,
}: {
  tile: Tile;
  onNavigate: () => void;
  iconSize?: number;
  locked?: boolean;
}) {
  const Icon = tile.icon;
  const className = clsx(
    "flex min-h-[5.5rem] flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/60 px-1.5 py-2.5 text-center transition-all duration-200",
    locked
      ? "cursor-not-allowed opacity-40"
      : "cursor-pointer hover:border-accent-500/40 hover:bg-accent-500/10 hover:scale-[1.03] active:scale-[0.96]",
    tile.danger && !locked && "text-red-500 hover:border-red-500/30 hover:bg-red-500/10",
  );
  const body = (
    <>
      <Icon
        size={iconSize}
        strokeWidth={1.75}
        className={clsx(
          "shrink-0 transition-transform duration-300",
          tile.danger ? "" : "text-accent-600 dark:text-accent-400",
          !locked && "group-hover:scale-110",
        )}
      />
      <span className="text-[11px] font-semibold leading-tight text-[var(--zy-ink)]">
        {tile.label}
      </span>
      {tile.extra ? (
        <span className="text-[9px] leading-tight text-[var(--zy-muted)]" dir="ltr">
          {tile.extra}
        </span>
      ) : null}
    </>
  );

  if (locked) {
    return (
      <span className={className} aria-disabled>
        {body}
      </span>
    );
  }

  if (tile.href) {
    return (
      <Link href={tile.href} onClick={onNavigate} className={clsx(className, "group")}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        tile.onClick?.();
        if (!tile.keepOpen) onNavigate();
      }}
      className={clsx(className, "group")}
    >
      {body}
    </button>
  );
}

function NavSlot({
  label,
  active,
  onClick,
  href,
  icon: Icon,
  large,
  locked,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  large?: boolean;
  locked?: boolean;
}) {
  const className = clsx(
    "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 transition-all duration-200",
    locked ? "cursor-not-allowed opacity-40" : "cursor-pointer active:scale-[0.94]",
    active && !locked ? "text-accent-600 dark:text-accent-400" : "text-[var(--zy-muted)]",
  );

  const content = (
    <>
      <span
        className={clsx(
          "flex items-center justify-center rounded-2xl transition-all duration-300",
          large
            ? "-mt-7 h-14 w-14 bg-accent-500 text-white shadow-lg shadow-accent-500/35"
            : "h-9 w-9",
          large && !locked && "hover:scale-105 active:scale-95",
          !large && active && "bg-accent-500/15",
          !large && !locked && "group-hover:bg-accent-500/10",
        )}
      >
        <Icon
          size={large ? 26 : 20}
          className={clsx(
            large ? "text-white" : undefined,
            !locked && "transition-transform duration-300 group-hover:scale-110",
          )}
        />
      </span>
      <span
        className={clsx(
          "max-w-full truncate text-[10px] font-semibold leading-tight",
          large && "mt-0.5 text-[11px] text-accent-700 dark:text-accent-300",
        )}
      >
        {label}
      </span>
    </>
  );

  if (locked) {
    return (
      <span className={className} aria-disabled>
        {content}
      </span>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className={clsx(className, "group")}
        aria-current={active ? "page" : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(className, "group")}
      aria-pressed={active}
    >
      {content}
    </button>
  );
}

function ThemeSheetTile() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group flex min-h-[5.5rem] flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-[var(--zy-border)] bg-[var(--zy-surface)]/60 px-1.5 py-2.5 text-center transition-all duration-200 hover:scale-[1.03] hover:border-accent-500/40 hover:bg-accent-500/10 active:scale-[0.96]"
    >
      <span className="relative flex h-7 w-7 items-center justify-center overflow-hidden">
        <Sun
          size={26}
          strokeWidth={1.75}
          className={clsx(
            "absolute text-accent-600 transition-all duration-500 ease-out dark:text-accent-400",
            isDark
              ? "translate-y-6 rotate-90 scale-50 opacity-0"
              : "translate-y-0 rotate-0 scale-100 opacity-100 group-hover:animate-spin-slow",
          )}
        />
        <Moon
          size={26}
          strokeWidth={1.75}
          className={clsx(
            "absolute text-accent-600 transition-all duration-500 ease-out dark:text-accent-400",
            isDark
              ? "translate-y-0 rotate-0 scale-100 opacity-100 group-hover:animate-wiggle"
              : "-translate-y-6 -rotate-90 scale-50 opacity-0",
          )}
        />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-[var(--zy-ink)]">
        {isDark ? t("theme.dark") : t("theme.light")}
      </span>
    </button>
  );
}

/** Mobile/tablet bottom navigation with center dashboard CTA and section sheets. */
export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const locked = !isProfileComplete(user);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);

  const userAreaActive =
    isActive(pathname, "/panel/profile") ||
    isActive(pathname, "/panel/verification") ||
    isActive(pathname, "/panel/resume");
  const dashboardActive = isActive(pathname, "/panel/apps");
  const financeActive = isActive(pathname, "/panel/finance");
  const colleaguesActive = isActive(pathname, "/panel/colleagues");
  const settingsActive = isActive(pathname, "/panel/sessions");

  const userAreaTiles: Tile[] = [
    { key: "profile", label: t("panel.personalInfo"), icon: UserRound, href: PROFILE_PATH },
    {
      key: "verification",
      label: t("panel.verification"),
      icon: ShieldCheck,
      href: "/panel/verification",
    },
    {
      key: "resume",
      label: t("panel.resume"),
      icon: FileText,
      keepOpen: true,
      onClick: () => setResumeOpen(true),
    },
  ];

  const resumeTiles: Tile[] = [
    {
      key: "resume-view",
      label: t("panel.resumeView"),
      icon: FileText,
      href: "/panel/resume/view",
    },
    {
      key: "resume-education",
      label: t("panel.resumeEducation"),
      icon: GraduationCap,
      href: "/panel/resume/education",
    },
    {
      key: "resume-skills",
      label: t("panel.resumeSkills"),
      icon: Sparkles,
      href: "/panel/resume/skills",
    },
    {
      key: "resume-experience",
      label: t("panel.resumeExperience"),
      icon: Briefcase,
      href: "/panel/resume/experience",
    },
  ];

  const settingsTiles: Tile[] = [
    { key: "sessions", label: t("panel.sessionsShort"), icon: Radio, href: "/panel/sessions" },
    {
      key: "support",
      label: t("support.title"),
      icon: Headphones,
      keepOpen: true,
      onClick: () => setSupportOpen(true),
    },
  ];

  const supportTiles: Tile[] = [
    {
      key: "support-ticket",
      label: t("support.ticket"),
      icon: Ticket,
      href: "/panel/support",
    },
    {
      key: "support-phone",
      label: t("support.phone"),
      icon: Phone,
      extra: SUPPORT_PHONE,
      onClick: () => {
        window.location.href = `tel:${SUPPORT_PHONE}`;
      },
    },
    {
      key: "support-docs",
      label: t("support.docs"),
      icon: BookOpen,
      href: "/panel/tutorials",
    },
  ];

  function closeSheet() {
    setSheet(null);
    setSupportOpen(false);
    setResumeOpen(false);
  }

  return (
    <>
      <nav
        dir="rtl"
        aria-label={t("panel.menu")}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--zy-border)] bg-[var(--zy-sidebar)] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex h-[4.25rem] max-w-lg items-end justify-between px-1 pb-1">
          {/* راست → چپ: ناحیه کاربری | همکاری | داشبورد | مالی | تنظیمات */}
          <NavSlot
            label={t("panel.userArea")}
            icon={UserRound}
            active={userAreaActive || sheet === "userArea"}
            onClick={() => {
              if (locked) {
                router.push(PROFILE_PATH);
                return;
              }
              setSupportOpen(false);
              setResumeOpen(false);
              setSheet((s) => (s === "userArea" ? null : "userArea"));
            }}
          />
          <NavSlot
            label={t("panel.colleagues")}
            icon={Users}
            href={locked ? undefined : "/panel/colleagues"}
            locked={locked}
            active={colleaguesActive}
          />
          <NavSlot
            label={t("panel.apps")}
            icon={LayoutGrid}
            href={locked ? undefined : "/panel/apps"}
            locked={locked}
            active={dashboardActive}
            large
          />
          <NavSlot
            label={t("panel.finance")}
            icon={Wallet}
            href={locked ? undefined : "/panel/finance"}
            locked={locked}
            active={financeActive}
          />
          <NavSlot
            label={t("panel.settings")}
            icon={Settings}
            locked={locked}
            active={settingsActive || sheet === "settings"}
            onClick={() => {
              if (locked) return;
              setSupportOpen(false);
              setResumeOpen(false);
              setSheet((s) => (s === "settings" ? null : "settings"));
            }}
          />
        </div>
      </nav>

      <BottomSheet
        open={sheet === "userArea"}
        title={resumeOpen ? t("panel.resume") : t("panel.userArea")}
        onClose={closeSheet}
      >
        {resumeOpen ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setResumeOpen(false)}
              className="flex min-h-[5.5rem] w-10 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-[var(--zy-border)] text-[var(--zy-muted)] transition hover:bg-accent-500/10"
              aria-label={t("common.back")}
            >
              <ChevronDown size={18} className="rotate-90" />
            </button>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              {resumeTiles.map((tile) => (
                <CompactTile
                  key={tile.key}
                  tile={tile}
                  onNavigate={closeSheet}
                  iconSize={26}
                  locked={locked}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {userAreaTiles.map((tile) => (
              <CompactTile
                key={tile.key}
                tile={tile}
                onNavigate={closeSheet}
                iconSize={32}
                locked={locked && tile.href !== PROFILE_PATH}
              />
            ))}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={sheet === "settings"}
        title={supportOpen ? t("support.title") : t("panel.settings")}
        onClose={closeSheet}
        headerEnd={
          supportOpen ? null : (
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
                closeSheet();
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
            >
              <LogOut size={14} />
              {t("common.logout")}
            </button>
          )
        }
      >
        {supportOpen ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSupportOpen(false)}
              className="flex min-h-[5.5rem] w-10 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl border border-[var(--zy-border)] text-[var(--zy-muted)] transition hover:bg-accent-500/10"
              aria-label={t("common.back")}
            >
              <ChevronDown size={18} className="rotate-90" />
            </button>
            {supportTiles.map((tile) => (
              <CompactTile key={tile.key} tile={tile} onNavigate={closeSheet} iconSize={26} />
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            {settingsTiles.map((tile) => (
              <CompactTile key={tile.key} tile={tile} onNavigate={closeSheet} iconSize={26} />
            ))}
            <ThemeSheetTile />
          </div>
        )}
      </BottomSheet>
    </>
  );
}
