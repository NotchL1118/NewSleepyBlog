import "server-only";

import { createHash } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/utils/supabase/public";
import type { Post, PostPageData, PostStatus } from "./types";

export const REGULAR_POST_LIST_CACHE_TAG = "posts:regular:list";

export function regularPostDetailCacheTag(slug: string) {
  const slugDigest = createHash("sha256").update(slug).digest("hex");
  return `posts:regular:detail:${slugDigest}`;
}

export async function getPublicRegularPostPage(
  slug: string,
): Promise<PostPageData | undefined> {
  "use cache";

  cacheLife("days");
  cacheTag(regularPostDetailCacheTag(slug));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, kind, status, slug, title, summary, body_markdown, published_at, updated_at, archive_note, post_groups!inner(name, slug)",
    )
    .eq("slug", slug)
    .eq("kind", "regular")
    .in("status", ["published", "archived"])
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the Published Regular Post.", {
      cause: error,
    });
  }

  if (!data) return undefined;

  const post: Post = {
    id: data.id,
    kind: "regular",
    status: data.status as PostStatus,
    slug: data.slug!,
    title: data.title!,
    summary: data.summary ?? undefined,
    overview: data.summary ?? undefined,
    bodyMarkdown: data.body_markdown,
    group: data.post_groups,
    tags: [],
    publishedAt: data.published_at!,
    updatedAt: data.updated_at,
    archiveNote: data.archive_note ?? undefined,
  };

  return { post };
}
