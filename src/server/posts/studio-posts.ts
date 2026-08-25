import "server-only";

import { createClient } from "@/utils/supabase/server";
import type { PostStatusFilter } from "@/lib/posts/studio-post-filters";
import type { PostKind } from "@/lib/posts/types";

export const STUDIO_POSTS_PAGE_SIZE = 20;

export async function getPostsPage({
  kind,
  page,
  status,
}: {
  kind: PostKind;
  page: number;
  status: PostStatusFilter;
}) {
  const from = (page - 1) * STUDIO_POSTS_PAGE_SIZE;
  const to = from + STUDIO_POSTS_PAGE_SIZE - 1;
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select("id, title, status, updated_at, post_groups(name)", {
      count: "exact",
    })
    .eq("kind", kind);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Unable to load ${kind} Posts.`, { cause: error });
  }

  return {
    posts: data,
    total: count ?? 0,
  };
}
