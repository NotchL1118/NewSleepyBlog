"use client";

import { getSiteUrl } from "@/config/site";
import { createClient } from "@/utils/supabase/client";
import { supabaseConfig } from "@/utils/supabase/config";
import { normalizeAuthRedirectPath } from "./redirect";

function getAuthCallback(pathname: string) {
  const callbackUrl = new URL("/auth/callback", getSiteUrl());
  callbackUrl.searchParams.set("next", normalizeAuthRedirectPath(pathname));
  return callbackUrl.toString();
}

export async function signInWithGitHub(pathname: string) {
  if (!supabaseConfig) {
    return { error: new Error("Supabase 环境变量尚未配置。") };
  }

  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: getAuthCallback(pathname),
    },
  });
}

export async function signOut() {
  if (!supabaseConfig) {
    return { error: new Error("Supabase 环境变量尚未配置。") };
  }

  return createClient().auth.signOut();
}
