"use client";

import { useEffect } from "react";
import { useToast } from "@/components/Toast";

const authMessages: Record<string, string> = {
  oauth_callback: "GitHub 登录没有完成，请重新尝试。",
  oauth_denied: "GitHub 授权已取消。",
};

export function AuthFeedback() {
  const { showToast } = useToast();

  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("auth_error");
    const notice = url.searchParams.get("auth_notice");

    if (error) {
      showToast(authMessages[error] ?? "登录过程中出现问题，请重新尝试。", {
        tone: "error",
      });
      url.searchParams.delete("auth_error");
    }

    if (notice === "signed_out") {
      showToast("已经退出登录。", { tone: "info" });
      url.searchParams.delete("auth_notice");
    }

    if (error || notice) {
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, [showToast]);

  return null;
}
