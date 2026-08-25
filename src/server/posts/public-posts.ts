import "server-only";

import { createHash } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/utils/supabase/public";
import type {
  AdjacentPost,
  Post,
  PostKind,
  PostPageData,
  PostPreview,
  PostStatus,
} from "@/lib/posts/types";

export const POST_LIST_CACHE_TAG = "posts:list";

export function postDetailCacheTag(slug: string) {
  const slugDigest = createHash("sha256").update(slug).digest("hex");
  return `posts:detail:${slugDigest}`;
}

type PublicPostRow = {
  id: number;
  kind: PostKind;
  status: PostStatus;
  slug: string | null;
  title: string | null;
  summary: string | null;
  body_markdown: string;
  published_at: string | null;
  updated_at: string;
  archive_note: string | null;
  post_groups: { name: string; slug: string };
  post_tags?: { tags: { name: string } }[];
};

type AdjacentPostRow = Pick<
  PublicPostRow,
  "id" | "kind" | "slug" | "title" | "post_groups"
>;

function toPostPreview(row: PublicPostRow): PostPreview {
  return {
    id: row.id,
    kind: row.kind,
    slug: row.slug!,
    title: row.title!,
    summary: row.summary ?? undefined,
    bodyMarkdown: row.body_markdown,
    group: row.post_groups,
    publishedAt: row.published_at!,
  };
}

function toAdjacentPost(row: AdjacentPostRow | null): AdjacentPost | undefined {
  if (!row) return undefined;

  return {
    kind: row.kind,
    slug: row.slug!,
    title: row.title!,
    group: row.post_groups,
  };
}

export async function listRecentPosts(limit: number): Promise<readonly PostPreview[]> {
  "use cache";

  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new RangeError("Recent Post limit must be a positive integer.");
  }

  cacheLife("days");
  cacheTag(POST_LIST_CACHE_TAG);

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, kind, status, slug, title, summary, body_markdown, published_at, updated_at, archive_note, post_groups!inner(name, slug)",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Unable to load recent Published Posts.", { cause: error });
  }

  return (data as PublicPostRow[]).map(toPostPreview);
}

export async function getPublicPostPage(
  slug: string,
  kind: PostKind,
): Promise<PostPageData | undefined> {
  "use cache";

  cacheLife("days");
  cacheTag(postDetailCacheTag(slug));

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, kind, status, slug, title, summary, body_markdown, published_at, updated_at, archive_note, post_groups!inner(name, slug), post_tags(tags(name))",
    )
    .eq("slug", slug)
    .eq("kind", kind)
    .in("status", ["published", "archived"])
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load the Public ${kind} Post.`, {
      cause: error,
    });
  }

  if (!data) return undefined;

  const row = data as PublicPostRow;
  const post: Post = {
    id: row.id,
    kind,
    status: row.status,
    slug: row.slug!,
    title: row.title!,
    summary: row.summary ?? undefined,
    bodyMarkdown: row.body_markdown,
    group: row.post_groups,
    tags: (row.post_tags ?? [])
      .map((postTag) => postTag.tags.name)
      .sort((left, right) => left.localeCompare(right, "zh-CN")),
    publishedAt: row.published_at!,
    updatedAt: row.updated_at,
    archiveNote: row.archive_note ?? undefined,
  };

  const adjacentSelect =
    "id, kind, slug, title, post_groups!inner(name, slug)";
  const olderCursor = `published_at.lt.${post.publishedAt},and(published_at.eq.${post.publishedAt},id.lt.${post.id})`;
  const newerCursor = `published_at.gt.${post.publishedAt},and(published_at.eq.${post.publishedAt},id.gt.${post.id})`;
  const [previousResult, nextResult] = await Promise.all([
    supabase
      .from("posts")
      .select(adjacentSelect)
      .eq("kind", post.kind)
      .eq("status", "published")
      .or(olderCursor)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("posts")
      .select(adjacentSelect)
      .eq("kind", post.kind)
      .eq("status", "published")
      .or(newerCursor)
      .order("published_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (previousResult.error || nextResult.error) {
    throw new Error("Unable to load adjacent Published Posts.", {
      cause: previousResult.error ?? nextResult.error,
    });
  }

  return {
    post,
    previousPost: toAdjacentPost(previousResult.data as AdjacentPostRow | null),
    nextPost: toAdjacentPost(nextResult.data as AdjacentPostRow | null),
  };
}
