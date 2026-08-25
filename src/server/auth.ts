import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { supabaseConfig } from "@/utils/supabase/config";
import type { Viewer } from "@/lib/auth/types";

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!supabaseConfig) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return null;
  }

  const metadata = claims.user_metadata;
  const username =
    typeof metadata?.user_name === "string" ? metadata.user_name : null;
  const displayName =
    (typeof metadata?.full_name === "string" ? metadata.full_name : null) ??
    username ??
    "GitHub 读者";
  const avatarUrl =
    typeof metadata?.avatar_url === "string" ? metadata.avatar_url : null;
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  return {
    id: claims.sub,
    displayName,
    username,
    avatarUrl,
    isAdmin: adminError ? false : isAdmin === true,
  };
});

export const requireAdmin = cache(async () => {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/");
  }

  if (!viewer.isAdmin) {
    redirect("/forbidden");
  }

  return viewer;
});
