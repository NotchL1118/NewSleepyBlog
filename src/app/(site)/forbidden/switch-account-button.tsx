"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { signOut } from "@/features/auth/client";

export function SwitchAccountButton() {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  async function handleClick() {
    setPending(true);
    const { error } = await signOut();
    if (error) {
      setPending(false);
      showToast("退出失败，请稍后重试。", { tone: "error" });
      return;
    }
    router.push("/?auth_notice=signed_out");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "正在退出…" : "切换账号"}
    </button>
  );
}
