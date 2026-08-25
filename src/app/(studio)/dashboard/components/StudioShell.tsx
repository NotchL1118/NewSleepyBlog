"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  ChevronIcon,
  CloseIcon,
  HomeIcon,
  MenuIcon,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { studioNavigation } from "./navigation";

const sidebarStorageKey = "sleepy:studio:sidebar-collapsed";
const sidebarEase = [0.22, 1, 0.36, 1] as const;
const sidebarLayoutTransition = { duration: 0.24, ease: sidebarEase };

type SidebarTooltip = {
  label: string;
  left: number;
  top: number;
};

function Navigation({
  collapsed,
  motionEnabled,
  onNavigate,
  onTooltipChange,
}: {
  collapsed: boolean;
  motionEnabled: boolean;
  onNavigate?: () => void;
  onTooltipChange?: (tooltip: SidebarTooltip | null) => void;
}) {
  const pathname = usePathname();

  function showTooltip(element: HTMLElement, label: string) {
    if (!collapsed || !onTooltipChange) return;
    const bounds = element.getBoundingClientRect();
    const sidebarRight = element.closest("aside")?.getBoundingClientRect().right;
    onTooltipChange({
      label,
      left: (sidebarRight ?? bounds.right) + 12,
      top: bounds.top + bounds.height / 2,
    });
  }

  return (
    <nav aria-label="Admin 工作区导航" className="space-y-6">
      {studioNavigation.map((group) => (
        <section key={group.label}>
          <p className="mb-2 h-4 overflow-hidden px-3 text-[11px] leading-4 font-semibold tracking-[0.12em] whitespace-nowrap text-muted uppercase">
            <AnimatePresence initial={false}>
              {collapsed ? null : (
                <motion.span
                  key={group.label}
                  className="block"
                  initial={motionEnabled ? { opacity: 0, x: -4 } : false}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: {
                      duration: motionEnabled ? 0.16 : 0,
                      delay: motionEnabled ? 0.04 : 0,
                      ease: sidebarEase,
                    },
                  }}
                  exit={{
                    opacity: 0,
                    x: motionEnabled ? -4 : 0,
                    transition: {
                      duration: motionEnabled ? 0.1 : 0,
                      ease: sidebarEase,
                    },
                  }}
                >
                  {group.label}
                </motion.span>
              )}
            </AnimatePresence>
          </p>
          <div className="space-y-1">
            {group.items.map((item, itemIndex) => {
              const active = item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    onTooltipChange?.(null);
                    onNavigate?.();
                  }}
                  onMouseEnter={(event) => {
                    showTooltip(event.currentTarget, item.label);
                  }}
                  onMouseLeave={(event) => {
                    if (event.currentTarget !== document.activeElement) {
                      onTooltipChange?.(null);
                    }
                  }}
                  onFocus={(event) => {
                    showTooltip(event.currentTarget, item.label);
                  }}
                  onBlur={() => onTooltipChange?.(null)}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={`relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl text-sm font-medium transition-[color,background-color,padding] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none ${
                    collapsed ? "justify-center px-0" : "px-3"
                  } ${
                    active
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  <motion.span
                    layout={motionEnabled ? "position" : false}
                    transition={sidebarLayoutTransition}
                    className="grid shrink-0 place-items-center"
                  >
                    <Icon className="size-[18px]" />
                  </motion.span>
                  <AnimatePresence initial={false} mode="popLayout">
                    {collapsed ? null : (
                      <motion.span
                        key={item.href}
                        className="whitespace-nowrap"
                        initial={motionEnabled ? { opacity: 0, x: -4 } : false}
                        animate={{
                          opacity: 1,
                          x: 0,
                          transition: {
                            duration: motionEnabled ? 0.16 : 0,
                            delay: motionEnabled ? 0.035 + itemIndex * 0.008 : 0,
                            ease: sidebarEase,
                          },
                        }}
                        exit={{
                          opacity: 0,
                          x: motionEnabled ? -4 : 0,
                          transition: {
                            duration: motionEnabled ? 0.1 : 0,
                            ease: sidebarEase,
                          },
                        }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

function SidebarContent({
  collapsed,
  motionEnabled,
  onNavigate,
  onRequestClose,
  onToggleCollapse,
}: {
  collapsed: boolean;
  motionEnabled: boolean;
  onNavigate?: () => void;
  onRequestClose?: () => void;
  onToggleCollapse?: () => void;
}) {
  const [tooltip, setTooltip] = useState<SidebarTooltip | null>(null);

  function toggleCollapse() {
    setTooltip(null);
    onToggleCollapse?.();
  }

  return (
    <>
      <LayoutGroup>
        <div className="flex h-full flex-col">
        <div
          className={`relative mb-7 flex h-12 shrink-0 items-start ${
            collapsed ? "justify-center" : "justify-between gap-4"
          }`}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {collapsed ? null : (
              <motion.div
                key="studio-brand"
                initial={motionEnabled ? { opacity: 0, x: -4 } : false}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: {
                    duration: motionEnabled ? 0.16 : 0,
                    delay: motionEnabled ? 0.04 : 0,
                    ease: sidebarEase,
                  },
                }}
                exit={{
                  opacity: 0,
                  x: motionEnabled ? -4 : 0,
                  transition: {
                    duration: motionEnabled ? 0.1 : 0,
                    ease: sidebarEase,
                  },
                }}
              >
                <Link
                  href="/dashboard"
                  className="block overflow-hidden whitespace-nowrap rounded-lg focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <span className="block text-lg font-semibold tracking-[-0.03em]">Sleepy</span>
                  <span className="block text-xs text-muted">Admin Studio</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          {onToggleCollapse ? (
            <motion.div
              layout={motionEnabled ? "position" : false}
              transition={sidebarLayoutTransition}
              className="shrink-0"
            >
              <button
                type="button"
                onClick={toggleCollapse}
                aria-label={collapsed ? "展开导航" : "收起导航"}
                title={collapsed ? "展开导航" : "收起导航"}
                className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ChevronIcon
                  className={`size-4 transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                    collapsed ? "-rotate-90" : "rotate-90"
                  }`}
                />
              </button>
            </motion.div>
          ) : null}
          {onRequestClose ? (
            <div className="md:hidden">
              <button
                type="button"
                aria-label="关闭导航"
                onClick={onRequestClose}
                className="grid size-10 place-items-center rounded-xl hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
              >
                <CloseIcon />
              </button>
            </div>
          ) : null}
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? "" : "pr-1"}`}>
          <Navigation
            collapsed={collapsed}
            motionEnabled={motionEnabled}
            onNavigate={onNavigate}
            onTooltipChange={collapsed ? setTooltip : undefined}
          />
        </div>
        <div
          className={`mt-6 border-t border-border pt-4 ${
            collapsed ? "flex flex-col items-center gap-1" : "grid grid-cols-2 gap-1"
          }`}
        >
          <motion.div
            layout={motionEnabled ? "position" : false}
            transition={sidebarLayoutTransition}
            className="flex justify-center"
          >
            <ThemeToggle />
          </motion.div>
          <motion.div
            layout={motionEnabled ? "position" : false}
            transition={sidebarLayoutTransition}
            className="flex justify-center"
          >
            <Link
              href="/"
              title="返回主页"
              className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-foreground/5.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent"
            >
              <HomeIcon className="size-[17px]" />
              <span className="sr-only">返回主页</span>
            </Link>
          </motion.div>
        </div>
        </div>
      </LayoutGroup>
      {typeof document === "undefined"
        ? null
        : createPortal(
            <AnimatePresence initial={false}>
              {collapsed && tooltip ? (
                <motion.div
                  key="studio-sidebar-tooltip"
                  role="tooltip"
                  initial={
                    motionEnabled
                      ? { opacity: 0, x: -4, y: "-50%" }
                      : { opacity: 0, y: "-50%" }
                  }
                  animate={{ opacity: 1, x: 0, y: "-50%" }}
                  exit={{
                    opacity: 0,
                    x: motionEnabled ? -4 : 0,
                    y: "-50%",
                  }}
                  transition={{
                    duration: motionEnabled ? 0.14 : 0,
                    ease: sidebarEase,
                  }}
                  className="pointer-events-none fixed z-50 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-foreground shadow-lg"
                  style={{ left: tooltip.left, top: tooltip.top }}
                >
                  {tooltip.label}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )}
    </>
  );
}

export function StudioShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion() ?? false;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const postEditorWide = /^\/dashboard\/(posts|heartworks)\/(new|\d+)$/.test(pathname);
  const motionEnabled = sidebarReady && !reduceMotion;

  useEffect(() => {
    const stored = window.localStorage.getItem(sidebarStorageKey);
    let readyFrame = 0;
    const restoreFrame = window.requestAnimationFrame(() => {
      if (stored !== null) setSidebarCollapsed(stored === "1");
      readyFrame = window.requestAnimationFrame(() => {
        setSidebarReady(true);
      });
    });
    return () => {
      window.cancelAnimationFrame(restoreFrame);
      window.cancelAnimationFrame(readyFrame);
    };
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    window.localStorage.setItem(sidebarStorageKey, next ? "1" : "0");
  }

  return (
    <div
      className={`bg-background ${
        postEditorWide ? "flex h-dvh flex-col overflow-hidden" : "min-h-dvh"
      }`}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-background md:block ${
          sidebarReady
            ? "transition-[width,padding] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            : "transition-none"
        } ${
          sidebarCollapsed ? "w-16 px-2.5 py-6" : "w-56 px-5 py-6"
        }`}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          motionEnabled={motionEnabled}
          onToggleCollapse={toggleSidebar}
        />
      </aside>

      <header className="sticky top-0 z-20 flex min-h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:hidden">
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
            <SidebarContent
              collapsed={false}
              motionEnabled={false}
              onNavigate={() => setDrawerOpen(false)}
              onRequestClose={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <main
        className={`min-w-0 ${
          sidebarReady
            ? "transition-[padding-left] duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            : "transition-none"
        } ${
          sidebarCollapsed ? "md:pl-16" : "md:pl-56"
        } ${
          postEditorWide ? "min-h-0 flex-1" : ""
        }`}
      >
        <div
          className={
            postEditorWide
              ? "flex h-full min-w-0 flex-col px-4 sm:px-7 lg:px-6"
              : "mx-auto w-full max-w-[1320px] px-4 py-8 sm:px-7 sm:py-10 lg:px-10 lg:py-12"
          }
        >
          {children}
        </div>
      </main>
    </div>
  );
}
