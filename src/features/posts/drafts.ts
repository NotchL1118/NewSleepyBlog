import "server-only";

import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database.generated";
import { constrainPostGroupsToKind } from "./post-groups";
import type { PostKind } from "./types";

export type PostDraft = Pick<
  Tables<"posts">,
  | "id"
  | "kind"
  | "group_id"
  | "title"
  | "slug"
  | "summary"
  | "body_markdown"
  | "status"
  | "updated_at"
>;

export type PostGroupOption = Pick<Tables<"post_groups">, "id" | "name">;

export async function getPostDraft(id: number, kind: PostKind) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, kind, group_id, title, slug, summary, body_markdown, status, updated_at",
    )
    .eq("id", id)
    .eq("kind", kind)
    .eq("status", "draft")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the Draft Post.", { cause: error });
  }

  return data satisfies PostDraft | null;
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
