"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { signOut as signOutFromSupabase } from "./client";

export function useSignOut() {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const signOut = useCallback(async () => {
    setSigningOut(true);
    const { error } = await signOutFromSupabase();

    if (error) {
      setSigningOut(false);
      showToast("退出失败，请稍后重试。", { tone: "error" });
      return;
    }

    router.push("/?auth_notice=signed_out");
    router.refresh();
  }, [router, showToast]);

  return { signingOut, signOut };
}
