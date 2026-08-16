import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { hasSupabaseEnv } from "./config";
import type { Viewer } from "./types";

function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims?.sub) {
    return null;
  }

  const metadata = claims.user_metadata as Record<string, unknown> | undefined;
  const username = readMetadataString(
    metadata,
    "user_name",
    "preferred_username",
    "login",
  );
  const displayName =
    readMetadataString(metadata, "full_name", "name") ?? username ?? "GitHub 读者";
  const avatarUrl = readMetadataString(metadata, "avatar_url", "picture");
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
