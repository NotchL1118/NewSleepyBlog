"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  CloseIcon,
  LogOutIcon,
  MenuIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Viewer } from "@/features/auth/types";
import { useSignOut } from "@/features/auth/useSignOut";
import { studioNavigation } from "./navigation";

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin 工作区导航" className="space-y-6">
      {studioNavigation.map((group) => (
        <section key={group.label}>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                    active
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <Icon className="size-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

function AdminSummary({ viewer }: { viewer: Viewer }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">
        {viewer.displayName.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{viewer.displayName}</p>
        <p className="truncate text-xs text-muted">Admin</p>
      </div>
    </div>
  );
}

export function StudioShell({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { signingOut, signOut } = useSignOut();

  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="rounded-lg focus-visible:outline-2 focus-visible:outline-accent">
          <span className="block text-lg font-semibold tracking-[-0.03em]">Sleepy</span>
          <span className="block text-xs text-muted">Admin Studio</span>
        </Link>
        <div className="md:hidden">
          <button
            type="button"
            aria-label="关闭导航"
            onClick={() => setDrawerOpen(false)}
            className="grid size-10 place-items-center rounded-xl hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <Navigation onNavigate={() => setDrawerOpen(false)} />
      </div>
      <div className="mt-6 border-t border-border pt-5">
        <AdminSummary viewer={viewer} />
        <div className="mt-4 flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            <LogOutIcon className="size-[17px]" />
            {signingOut ? "正在退出…" : "退出"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-background p-6 md:block">
        {sidebar}
      </aside>

      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-background px-4 md:hidden">
        <div>
          <p className="font-semibold tracking-[-0.02em]">Sleepy</p>
          <p className="text-[11px] text-muted">Admin Studio</p>
        </div>
        <button
          type="button"
          aria-label="打开导航"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="grid size-11 place-items-center rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-accent"
        >
          <MenuIcon />
        </button>
      </header>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="关闭导航"
            className="absolute inset-0 bg-foreground/18"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] border-r border-border bg-background p-6 shadow-2xl">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <main className="min-w-0 md:pl-64">
        <div className="mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-7 sm:py-10 lg:px-10 lg:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
