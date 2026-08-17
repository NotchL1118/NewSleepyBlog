import "server-only";

import { createClient } from "@/utils/supabase/server";

export const STUDIO_POSTS_PAGE_SIZE = 20;

export const postStatuses = ["draft", "published", "archived"] as const;

export type PostStatus = (typeof postStatuses)[number];
export type PostStatusFilter = PostStatus | "all";

export function isPostStatus(value: string): value is PostStatus {
  return postStatuses.some((status) => status === value);
}

export async function getRegularPostsPage({
  page,
  status,
}: {
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
    .eq("kind", "regular");

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Unable to load Regular Posts.", { cause: error });
  }

  return {
    posts: data,
    total: count ?? 0,
  };
}
