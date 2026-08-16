"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import sleepyAvatar from "@/assets/brand/sleepy-avatar.png";
import {
  ChevronIcon,
  DashboardIcon,
  GitHubIcon,
  LogOutIcon,
  MenuIcon,
  UserIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/Toast";
import {
  signInWithGitHub,
  signOut as signOutFromSupabase,
} from "@/features/auth/client";
import type { Viewer } from "@/features/auth/types";
import styles from "./index.module.css";

const postGroups = [
  ["折腾", "14"],
  ["归档", "69"],
  ["技术", "82"],
  ["设计", "5"],
  ["经历", "11"],
] as const;

const heartworkGroups = [
  ["生活札记", "9"],
  ["所思所想", "7"],
  ["夜读", "5"],
  ["远行", "3"],
] as const;

const recentRegularPosts = [
  ["把复杂的事情慢慢说清楚", "8 月 7 日 · 6 分钟阅读", "/posts/make-complex-things-clear"],
  ["我的第一套个人网站工作流", "2023 年 4 月 12 日 · 已归档", "/posts/first-personal-site-workflow"],
] as const;

const recentHeartworks = [
  ["夜里适合读些什么", "7 月 16 日 · 5 分钟阅读", "/heartworks/what-to-read-at-night"],
] as const;

type ActiveSection = "home" | "regular" | "heartwork" | undefined;

function BrandAvatar() {
  return (
    <Image
      src={sleepyAvatar}
      alt=""
      priority
      placeholder="blur"
      className="size-10 rounded-full bg-[#171515] object-cover"
    />
  );
}

type DropdownProps = {
  label: string;
  groupLabel: string;
  groups: ReadonlyArray<readonly [string, string]>;
  recentItems: ReadonlyArray<readonly [string, string, string]>;
  total: string;
  active?: boolean;
};

function Dropdown({ label, groupLabel, groups, recentItems, total, active }: DropdownProps) {
  return (
    <div className={styles.navItem}>
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        className={`flex min-h-10 items-center justify-center gap-1 rounded-full px-4 text-[15px] font-medium transition-colors hover:bg-foreground/5.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          active ? "bg-foreground/7 text-foreground shadow-sm" : "text-muted"
        }`}
      >
        {label}
        <ChevronIcon className={`${styles.chevron} size-3 opacity-50`} />
      </button>
      <div className={styles.panel}>
        <div className="grid grid-cols-[0.9fr_1.35fr] gap-7">
          <section>
            <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-muted">{groupLabel}</p>
            <div className="grid gap-1">
              {groups.map(([name, count]) => (
                <Link
                  key={name}
                  href="/#recent"
                  className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-foreground/5.5"
                >
                  <span>{name}</span>
                  <span className="text-xs text-muted">{count}</span>
                </Link>
              ))}
            </div>
          </section>
          <section>
            <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-muted">最近更新</p>
            <div className="grid gap-1">
              {recentItems.map(([title, meta, href]) => (
                <Link
                  key={title}
                  href={href}
                  className="flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/5.5"
                >
                  <strong className="text-sm font-medium">{title}</strong>
                  <span className="text-xs text-muted">{meta}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <Link
          href="/#recent"
          className="mt-4 flex justify-between border-t border-border px-2 pt-4 text-[13px] text-muted transition-colors hover:text-foreground"
        >
          <span>查看全部{label}</span>
          <span>{total}</span>
        </Link>
      </div>
    </div>
  );
}

function GuestAvatar({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span className={size === "lg" ? styles.ghostAvatarLarge : styles.ghostAvatar} aria-hidden="true">
      <UserIcon className={size === "lg" ? "size-[18px]" : "size-3.5"} />
    </span>
  );
}

function ViewerAvatar({ viewer, size = "sm" }: { viewer: Viewer; size?: "sm" | "lg" }) {
  const dimension = size === "lg" ? 40 : 28;

  if (!viewer.avatarUrl) {
    return (
      <span
        className={`${
          size === "lg" ? styles.viewerAvatarLarge : styles.viewerAvatar
        } font-semibold`}
        aria-hidden="true"
      >
        {viewer.displayName.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={viewer.avatarUrl}
      alt=""
      width={dimension}
      height={dimension}
      className={size === "lg" ? styles.viewerAvatarLarge : styles.viewerAvatar}
    />
  );
}

type LoginPanelContentProps = {
  viewer: Viewer | null;
  pending: boolean;
  onGitHubClick: () => void;
  onSignOut: () => void;
};

function LoginPanelContent({
  viewer,
  pending,
  onGitHubClick,
  onSignOut,
}: LoginPanelContentProps) {
  if (viewer) {
    return (
      <>
        <div className="flex items-center gap-3 px-2 pb-3 pt-2">
          <ViewerAvatar viewer={viewer} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{viewer.displayName}</p>
            <p className="truncate text-xs text-muted">
              {viewer.username ? `@${viewer.username}` : "GitHub 读者"}
            </p>
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        {viewer.isAdmin ? (
          <Link href="/dashboard" className={styles.loginMenuItem}>
            <DashboardIcon className="size-[18px]" />
            进入 Admin 工作区
          </Link>
        ) : null}
        <button
          type="button"
          className={styles.loginMenuItem}
          onClick={onSignOut}
          disabled={pending}
        >
          <LogOutIcon className="size-[18px]" />
          {pending ? "正在退出…" : "退出登录"}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-2 pb-3 pt-2">
        <GuestAvatar size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">访客</p>
          <p className="text-xs text-muted">尚未登录</p>
        </div>
      </div>
      <div className="my-1 h-px bg-border" />
      <button
        type="button"
        className={styles.loginMenuItem}
        onClick={onGitHubClick}
        disabled={pending}
      >
        <GitHubIcon />
        {pending ? "正在前往 GitHub…" : "GitHub 登录"}
      </button>
    </>
  );
}

function LoginMenu({
  viewer,
  pending,
  onGitHubClick,
  onSignOut,
}: LoginPanelContentProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={`${styles.loginWrap} ${open ? styles.loginWrapOpen : ""}`}
    >
      <button
        type="button"
        className={`${styles.loginTrigger} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
        aria-label="账户"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        title="账户"
        onClick={() => setOpen((value) => !value)}
      >
        {viewer ? <ViewerAvatar viewer={viewer} /> : <GuestAvatar />}
      </button>
      <div
        id={panelId}
        role="menu"
        aria-label="账户"
        className={styles.loginPanel}
      >
        <LoginPanelContent
          viewer={viewer}
          pending={pending}
          onGitHubClick={() => {
            setOpen(false);
            onGitHubClick();
          }}
          onSignOut={() => {
            setOpen(false);
            onSignOut();
          }}
        />
      </div>
    </div>
  );
}

function MobileHeader({
  activeSection,
  viewer,
  pending,
  onGitHubClick,
  onSignOut,
}: { activeSection: ActiveSection } & LoginPanelContentProps) {
  const items = [
    { label: "自述", meta: "↗", href: "/", section: "home" },
    { label: "文稿", meta: "181", href: "/posts/make-complex-things-clear", section: "regular" },
    { label: "心作", meta: "24", href: "/heartworks/what-to-read-at-night", section: "heartwork" },
    { label: "时光", meta: "↗", href: "/#recent", section: undefined },
    { label: "更多", meta: "+", href: "/#recent", section: undefined },
  ] as const;

  return (
    <div className={`${styles.glass} flex items-center justify-between rounded-full p-[5px] min-[821px]:hidden`}>
      <Link href="/" aria-label="Sleepy 首页" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        <BrandAvatar />
      </Link>
      <details className="relative">
        <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-full transition-colors hover:bg-foreground/5.5 focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          <span className="sr-only">打开导航</span>
          <MenuIcon />
        </summary>
        <div className={`${styles.glass} ${styles.mobilePanel}`}>
          <ThemeToggle showLabel />
          {items.map(({ label, meta, href, section }) => (
            <Link
              key={label}
              href={href}
              aria-current={activeSection === section ? "page" : undefined}
              className={`flex min-h-12 items-center justify-between rounded-xl px-3 text-[15px] font-medium transition-colors hover:bg-foreground/5.5 ${
                activeSection === section ? "bg-foreground/7" : ""
              }`}
            >
              <span>{label}</span>
              <span className="text-muted">{meta}</span>
            </Link>
          ))}
          <div className="mt-2 border-t border-border pt-2">
            <LoginPanelContent
              viewer={viewer}
              pending={pending}
              onGitHubClick={onGitHubClick}
              onSignOut={onSignOut}
            />
          </div>
        </div>
      </details>
    </div>
  );
}

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const activeSection: ActiveSection = pathname === "/"
    ? "home"
    : pathname.startsWith("/posts/")
      ? "regular"
      : pathname.startsWith("/heartworks/")
        ? "heartwork"
        : undefined;

  async function handleGitHubLogin() {
    setPending(true);
    const { error } = await signInWithGitHub(pathname);

    if (error) {
      setPending(false);
      showToast(error.message || "无法开始 GitHub 登录，请稍后重试。", {
        tone: "error",
      });
    }
  }

  async function handleSignOut() {
    setPending(true);
    const { error } = await signOutFromSupabase();

    if (error) {
      setPending(false);
      showToast("退出失败，请稍后重试。", { tone: "error" });
      return;
    }

    router.push("/?auth_notice=signed_out");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 px-3 pb-2 pt-4 sm:px-6 min-[821px]:px-10 min-[821px]:pb-3 min-[821px]:pt-7">
      <div className="mx-auto w-full max-w-[1160px]">
        <MobileHeader
          activeSection={activeSection}
          viewer={viewer}
          pending={pending}
          onGitHubClick={handleGitHubLogin}
          onSignOut={handleSignOut}
        />
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-4 min-[821px]:grid">
          <Link
            href="/"
            aria-label="Sleepy 首页"
            className={`${styles.glass} grid size-[52px] place-items-center justify-self-start rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
          >
            <BrandAvatar />
          </Link>

          <nav aria-label="主要导航" className={`${styles.glass} flex min-h-[52px] items-center gap-0.5 rounded-full p-[5px]`}>
            <Link
              href="/"
              aria-current={activeSection === "home" ? "page" : undefined}
              className={`flex min-h-10 items-center rounded-full px-4 text-[15px] font-medium transition-colors hover:bg-foreground/10 ${
                activeSection === "home" ? "bg-foreground/7 shadow-sm" : "text-muted"
              }`}
            >
              自述
            </Link>
            <Dropdown
              label="文稿"
              groupLabel="分类"
              groups={postGroups}
              recentItems={recentRegularPosts}
              total="181 篇文章"
              active={activeSection === "regular"}
            />
            <Dropdown
              label="心作"
              groupLabel="专栏"
              groups={heartworkGroups}
              recentItems={recentHeartworks}
              total="24 篇心作"
              active={activeSection === "heartwork"}
            />
            <Link href="/#recent" className="flex min-h-10 items-center rounded-full px-4 text-[15px] font-medium text-muted transition-colors hover:bg-foreground/5.5 hover:text-foreground">
              时光
            </Link>
            <button type="button" className="flex min-h-10 items-center gap-1 rounded-full px-4 text-[15px] font-medium text-muted transition-colors hover:bg-foreground/5.5 hover:text-foreground">
              更多
              <ChevronIcon className={`${styles.chevron} size-3 opacity-50`} />
            </button>
          </nav>

          <div className={`${styles.glass} flex items-center gap-0.5 justify-self-end rounded-full p-1.25`}>
            <ThemeToggle />
            <LoginMenu
              viewer={viewer}
              pending={pending}
              onGitHubClick={handleGitHubLogin}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
