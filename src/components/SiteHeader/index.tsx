"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import sleepyAvatar from "@/assets/brand/sleepy-avatar.png";
import {
  DashboardIcon,
  GitHubIcon,
  LogOutIcon,
  MenuIcon,
  UserIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/Toast";
import { signInWithGitHub } from "@/features/auth/client";
import type { Viewer } from "@/features/auth/types";
import { useSignOut } from "@/features/auth/useSignOut";

function ViewerAvatar({ viewer, large = false }: { viewer: Viewer; large?: boolean }) {
  const size = large ? 40 : 32;

  if (!viewer.avatarUrl) {
    return (
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-full bg-surface font-semibold ${
          large ? "size-10 text-sm" : "size-8 text-xs"
        }`}
      >
        {viewer.displayName.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <Image
      src={viewer.avatarUrl}
      alt=""
      width={size}
      height={size}
      className={large ? "size-10 rounded-full object-cover" : "size-8 rounded-full object-cover"}
    />
  );
}

function ReaderSummary({ viewer }: { viewer: Viewer | null }) {
  if (!viewer) {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-border text-muted">
          <UserIcon className="size-[18px]" />
        </span>
        <div>
          <p className="text-sm font-semibold">读者</p>
          <p className="text-xs text-muted">尚未登录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <ViewerAvatar viewer={viewer} large />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{viewer.displayName}</p>
        <p className="truncate text-xs text-muted">
          {viewer.username ? `@${viewer.username}` : "GitHub 读者"}
        </p>
      </div>
    </div>
  );
}

type AccountActionsProps = {
  viewer: Viewer | null;
  pending: boolean;
  onLogin: () => void;
  onSignOut: () => void;
};

function AccountActions({ viewer, pending, onLogin, onSignOut }: AccountActionsProps) {
  return (
    <>
      <ReaderSummary viewer={viewer} />
      <div className="my-1 border-t border-border" />
      {viewer?.isAdmin ? (
        <Link
          href="/dashboard"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
        >
          <DashboardIcon className="size-[18px]" />
          进入 Admin 工作区
        </Link>
      ) : null}
      <button
        type="button"
        onClick={viewer ? onSignOut : onLogin}
        disabled={pending}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
      >
        {viewer ? <LogOutIcon className="size-[18px]" /> : <GitHubIcon />}
        {pending ? "请稍候…" : viewer ? "退出登录" : "GitHub 登录"}
      </button>
    </>
  );
}

function AccountMenu(props: AccountActionsProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label="账户"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="grid size-10 place-items-center rounded-full transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {props.viewer ? (
          <ViewerAvatar viewer={props.viewer} />
        ) : (
          <span className="grid size-8 place-items-center rounded-full border border-dashed border-border text-muted">
            <UserIcon className="size-4" />
          </span>
        )}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="账户"
          className="absolute top-12 right-0 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-background p-2 shadow-lg"
        >
          <AccountActions
            {...props}
            onLogin={() => {
              setOpen(false);
              props.onLogin();
            }}
            onSignOut={() => {
              setOpen(false);
              props.onSignOut();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginPending, setLoginPending] = useState(false);
  const { signingOut, signOut } = useSignOut();
  const pending = loginPending || signingOut;

  async function handleGitHubLogin() {
    setLoginPending(true);
    const { error } = await signInWithGitHub(pathname);

    if (error) {
      setLoginPending(false);
      showToast(error.message || "无法开始 GitHub 登录，请稍后重试。", {
        tone: "error",
      });
    }
  }

  const accountActions = {
    viewer,
    pending,
    onLogin: handleGitHubLogin,
    onSignOut: signOut,
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex min-h-16 w-[calc(100%-2rem)] max-w-[1040px] items-center justify-between gap-5">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Image
            src={sleepyAvatar}
            alt=""
            priority
            placeholder="blur"
            className="size-9 rounded-full object-cover"
          />
          <span className="font-semibold tracking-[-0.02em]">Sleepy</span>
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          <ThemeToggle />
          <AccountMenu {...accountActions} />
        </div>

        <button
          type="button"
          aria-label="打开导航"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="grid size-11 place-items-center rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-accent sm:hidden"
        >
          <MenuIcon />
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background px-4 py-3 sm:hidden">
          <nav aria-label="移动端导航" className="mx-auto grid max-w-[1040px] gap-1">
            <Link href="/" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-surface">
              首页
            </Link>
            <ThemeToggle showLabel />
            <div className="mt-2 border-t border-border pt-2">
              <AccountActions
                {...accountActions}
                onLogin={() => {
                  setMobileOpen(false);
                  handleGitHubLogin();
                }}
                onSignOut={() => {
                  setMobileOpen(false);
                  signOut();
                }}
              />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
