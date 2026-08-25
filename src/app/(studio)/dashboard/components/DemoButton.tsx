"use client";

import type { ButtonHTMLAttributes } from "react";
import { showToast } from "@/components/Toast";

type DemoButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
};

export function DemoButton({
  children,
  className = "",
  variant = "secondary",
  ...props
}: DemoButtonProps) {
  const variants = {
    primary: "bg-foreground text-background hover:opacity-85",
    secondary: "border border-border bg-background hover:bg-surface",
    quiet: "text-muted hover:bg-surface hover:text-foreground",
  } as const;

  return (
    <button
      type="button"
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          showToast("这是演示界面，功能尚未接入。", { tone: "info" });
        }
      }}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-medium transition ${variants[variant]} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
    >
      {children}
    </button>
  );
}
