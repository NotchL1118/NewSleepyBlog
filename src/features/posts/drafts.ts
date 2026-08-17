import "server-only";

import { createClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/database.generated";

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

export type RegularPostGroup = Pick<Tables<"post_groups">, "id" | "name">;

export async function getRegularPostDraft(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, kind, group_id, title, slug, summary, body_markdown, status, updated_at",
    )
    .eq("id", id)
    .eq("kind", "regular")
    .eq("status", "draft")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the Draft Post.", { cause: error });
  }

  return data satisfies PostDraft | null;
}

export async function getRegularPostGroups() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("post_groups")
    .select("id, name")
    .eq("kind", "regular")
    .order("name");

  if (error) {
    throw new Error("Unable to load Regular Post groups.", { cause: error });
  }

  return data satisfies RegularPostGroup[];
}
