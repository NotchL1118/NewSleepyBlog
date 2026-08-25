import "server-only";

import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database.generated";
import { constrainPostGroupsToKind } from "./post-groups";
import type { PostKind } from "@/lib/posts/types";

export type StudioPost = Pick<
  Tables<"posts">,
  | "archive_note"
  | "archived_at"
  | "id"
  | "kind"
  | "group_id"
  | "title"
  | "slug"
  | "summary"
  | "body_markdown"
  | "status"
  | "published_at"
  | "updated_at"
> & { tagIds: number[] };

export type PostGroupOption = Pick<Tables<"post_groups">, "id" | "name">;
export type TagOption = Pick<Tables<"tags">, "id" | "name">;

type StudioPostRow = Omit<StudioPost, "tagIds"> & {
  post_tags: { tag_id: number }[];
};

export async function getStudioPost(id: number, kind: PostKind) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, kind, group_id, title, slug, summary, body_markdown, status, updated_at, published_at, archived_at, archive_note, post_tags(tag_id)",
    )
    .eq("id", id)
    .eq("kind", kind)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the Studio Post.", { cause: error });
  }

  if (!data) return null;

  const { post_tags: postTags, ...post } = data as StudioPostRow;
  return {
    ...post,
    tagIds: postTags.map((postTag) => postTag.tag_id),
  } satisfies StudioPost;
}

export async function getPostGroups(kind: PostKind) {
  const supabase = await createClient();
  const query = supabase.from("post_groups").select("id, name");
  const { data, error } = await constrainPostGroupsToKind(query, kind).order(
    "name",
  );

  if (error) {
    throw new Error(`Unable to load ${kind} Post groups.`, { cause: error });
  }

  return data satisfies PostGroupOption[];
}

export async function getTags() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .order("name");

  if (error) {
    throw new Error("Unable to load Tags.", { cause: error });
  }

  return data satisfies TagOption[];
}
