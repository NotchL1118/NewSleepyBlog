"use client";

import { useTheme } from "next-themes";
import type { MouseEvent } from "react";
import { flushSync } from "react-dom";
import { MoonIcon, SunIcon } from "@/components/icons";

type ThemeToggleProps = {
  showLabel?: boolean;
};

function getTransitionOrigin(event: MouseEvent<HTMLButtonElement>) {
  const origin =
    event.currentTarget.querySelector<HTMLElement>(
      "[data-theme-transition-origin]",
    ) ?? event.currentTarget;
  const bounds = origin.getBoundingClientRect();

  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };
}

function getTransitionGeometry(event: MouseEvent<HTMLButtonElement>) {
  const { x, y } = getTransitionOrigin(event);
  const snapshotScale = window.devicePixelRatio || 1;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  ) * 1.05;

  return {
    x: x * snapshotScale,
    y: y * snapshotScale,
    radius: radius * snapshotScale,
  };
}

function ThemeIcon() {
  return (
    <span
      aria-hidden="true"
      data-theme-transition-origin
      className="grid size-[17px] shrink-0 place-items-center"
    >
      <span className="col-start-1 row-start-1 dark:hidden"><MoonIcon /></span>
      <span className="col-start-1 row-start-1 hidden dark:inline"><SunIcon /></span>
    </span>
  );
}

export function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { setTheme } = useTheme();

  const handleThemeChange = (event: MouseEvent<HTMLButtonElement>) => {
    const nextTheme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!document.startViewTransition || reduceMotion) {
      setTheme(nextTheme);
      return;
    }

    const { x, y, radius } = getTransitionGeometry(event);
    const collapsed = `circle(0 at ${x}px ${y}px)`;
    const expanded = `circle(${radius}px at ${x}px ${y}px)`;

    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(nextTheme));
    });

    transition.ready.then(
      () => {
        const animation = document.documentElement.animate(
          {
            clipPath:
              nextTheme === "dark"
                ? [collapsed, expanded]
                : [expanded, collapsed],
          },
          {
            duration: 500,
            easing: "ease-out",
            fill: "forwards",
            pseudoElement:
              nextTheme === "dark"
                ? "::view-transition-new(root)"
                : "::view-transition-old(root)",
          },
        );

        transition.finished.finally(() => animation.cancel());
      },
      () => undefined,
    );
  };

  return (
    <button
      type="button"
      onClick={handleThemeChange}
      aria-label="切换主题"
      title="切换主题"
      className={
        showLabel
          ? "flex h-12 w-full items-center justify-between rounded-xl px-3 text-[15px] font-medium text-foreground transition-colors hover:bg-foreground/5.5 disabled:cursor-wait"
          : "grid size-10 place-items-center rounded-full text-muted transition-[color,background-color,transform] hover:bg-foreground/5.5 hover:text-foreground active:scale-95 disabled:cursor-wait"
      }
    >
      {showLabel ? (
        <>
          <span>外观</span>
          <span className="flex items-center gap-2 text-sm text-muted">
            <span className="dark:hidden">深色</span>
            <span className="hidden dark:inline">浅色</span>
            <ThemeIcon />
          </span>
        </>
      ) : (
        <ThemeIcon />
      )}
    </button>
  );
}
