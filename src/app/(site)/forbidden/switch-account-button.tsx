"use client";

import { useSignOut } from "@/lib/auth/useSignOut";

export function SwitchAccountButton() {
  const { signingOut, signOut } = useSignOut();

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={signingOut}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
    >
      {signingOut ? "正在退出…" : "切换账号"}
    </button>
  );
}
