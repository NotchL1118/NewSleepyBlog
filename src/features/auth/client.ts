"use client";

import { createClient } from "@/utils/supabase/client";
import { getBrowserAuthCallback, hasSupabaseEnv } from "./config";

export async function signInWithGitHub(pathname: string) {
  if (!hasSupabaseEnv()) {
    return { error: new Error("Supabase 环境变量尚未配置。") };
  }

  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: getBrowserAuthCallback(pathname),
    },
  });
}

export async function signOut() {
  if (!hasSupabaseEnv()) {
    return { error: new Error("Supabase 环境变量尚未配置。") };
  }

  return createClient().auth.signOut();
}
