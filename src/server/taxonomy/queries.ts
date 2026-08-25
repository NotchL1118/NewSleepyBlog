import "server-only";

import { createClient } from "@/utils/supabase/server";
import type { PostKind, PostStatus } from "@/lib/posts/types";

export type TaxonomyRow = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  updatedAt: string;
  totalCount: number;
  publicCount: number;
};

type GroupRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  updated_at: string;
  posts: { status: PostStatus }[];
};

type TagRow = {
  id: number;
  name: string;
  updated_at: string;
  post_tags: { posts: { status: PostStatus } }[];
};

function isPublicStatus(status: PostStatus) {
  return status === "published" || status === "archived";
}

export async function listPostGroups(kind: PostKind): Promise<TaxonomyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_groups")
    .select("id, name, slug, description, updated_at, posts(status)")
    .eq("kind", kind)
    .order("name");

  if (error) {
    throw new Error(`Unable to load ${kind} Post Groups.`, { cause: error });
  }

  return (data as GroupRow[]).map((group) => ({
    id: group.id,
    name: group.name,
    slug: group.slug,
    description: group.description,
    updatedAt: group.updated_at,
    totalCount: group.posts.length,
    publicCount: group.posts.filter((post) => isPublicStatus(post.status)).length,
  }));
}

export async function listTags(): Promise<TaxonomyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, updated_at, post_tags(posts(status))")
    .order("name");

  if (error) {
    throw new Error("Unable to load Tags.", { cause: error });
  }

  return (data as TagRow[]).map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: null,
    description: null,
    updatedAt: tag.updated_at,
    totalCount: tag.post_tags.length,
    publicCount: tag.post_tags.filter((postTag) =>
      isPublicStatus(postTag.posts.status),
    ).length,
  }));
}
